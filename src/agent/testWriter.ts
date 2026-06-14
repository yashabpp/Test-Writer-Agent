/**
 * testWriter.ts
 * Core agent orchestrator — drives the Claude Agent SDK query() loop
 * to autonomously generate, run, and repair TypeScript tests.
 */

import 'dotenv/config';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { query } from '@anthropic-ai/claude-agent-sdk';
import {
  runTests,
  getCoverage,
  deriveTestFilePath,
  fileExists,
  log,
  formatDuration,
  type RunResult,
  type CoverageResult,
} from './tools.js';
import { PROMPT_VARIANTS, DEFAULT_PROMPT_VARIANT, type PromptVariant } from './prompts.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TestWriterOptions {
  /** Absolute or relative path to the TypeScript source file to test. */
  sourceFile: string;
  /** Prompt variant to use. Defaults to 'C' (full production prompt). */
  promptVariant?: PromptVariant;
  /** Override the system prompt entirely. Takes precedence over promptVariant. */
  systemPromptOverride?: string;
  /** Maximum agent repair iterations. Defaults to 5. */
  maxIterations?: number;
  /** Claude model to use. Defaults to claude-haiku-4-5-20251001. */
  model?: string;
  /** Whether to stream agent output to stdout. Defaults to false. */
  verbose?: boolean;
  /** Project root for running tests. Defaults to process.cwd(). */
  projectRoot?: string;
}

export interface TestWriterResult {
  /** Absolute path to the generated test file. */
  testFile: string;
  /** True if all tests pass in the final run. */
  passed: boolean;
  /** Number of repair iterations performed. */
  iterations: number;
  /** Final pass rate (0–100). */
  passRate: number;
  /** Final coverage metrics. */
  coverage: CoverageResult;
  /** Whether the test file compiled successfully. */
  compileSuccess: boolean;
  /** Edge case coverage score (0–100). */
  edgeCaseScore: number;
  /** Human-readable log of agent actions and results. */
  log: string[];
  /** Duration in milliseconds. */
  durationMs: number;
  /** Raw test runner output from the final run. */
  finalRunResult: RunResult;
}

// ---------------------------------------------------------------------------
// Main Orchestrator
// ---------------------------------------------------------------------------

/**
 * Runs the Test Writer Agent for a single source file.
 * Uses the Claude Agent SDK to autonomously generate, run, and repair tests.
 */
export async function runTestWriter(opts: TestWriterOptions): Promise<TestWriterResult> {
  const startTime = Date.now();
  const agentLog: string[] = [];

  const sourceFile = path.resolve(opts.sourceFile);
  const projectRoot = path.resolve(opts.projectRoot ?? process.cwd());
  const maxIterations = opts.maxIterations ?? 5;
  const model = opts.model ?? process.env['AGENT_MODEL'] ?? 'claude-haiku-4-5-20251001';
  const verbose = opts.verbose ?? (process.env['AGENT_VERBOSE'] === 'true');

  // Derive test file path
  const testFile = deriveTestFilePath(sourceFile);
  const testFileRelative = path.relative(projectRoot, testFile).replace(/\\/g, '/');
  const sourceFileRelative = path.relative(projectRoot, sourceFile).replace(/\\/g, '/');

  // Validate source file exists
  if (!fileExists(sourceFile)) {
    throw new Error(`Source file not found: ${sourceFile}`);
  }

  // Select system prompt
  const variant = opts.promptVariant ?? DEFAULT_PROMPT_VARIANT;
  const systemPrompt = opts.systemPromptOverride ?? PROMPT_VARIANTS[variant];

  log('INFO', `Starting Test Writer Agent`);
  log('INFO', `  Source: ${sourceFileRelative}`);
  log('INFO', `  Test:   ${testFileRelative}`);
  log('INFO', `  Model:  ${model}`);
  log('INFO', `  Prompt: Variant ${variant}`);

  agentLog.push(`Source: ${sourceFileRelative}`);
  agentLog.push(`Test file: ${testFileRelative}`);
  agentLog.push(`Model: ${model}`);
  agentLog.push(`Prompt variant: ${variant}`);

  // Build the user prompt — instructs the agent on exactly what to do
  const userPrompt = buildUserPrompt({
    sourceFileRelative,
    testFileRelative,
    maxIterations,
  });

  // ---------------------------------------------------------------------------
  // Invoke the Claude Agent SDK
  // ---------------------------------------------------------------------------
  log('INFO', `Invoking agent (maxTurns=${maxIterations * 6})...`);

  let agentOutputText = '';
  let messageCount = 0;

  try {
    const agentStream = query({
      prompt: userPrompt,
      options: {
        systemPrompt,
        allowedTools: ['Read', 'Write', 'Edit', 'Bash'],
        maxTurns: maxIterations * 6,
        cwd: projectRoot,
        model,
      },
    });

    for await (const message of agentStream) {
      messageCount++;

      if (message.type === 'assistant') {
        const text = extractText(message);
        if (text) {
          agentOutputText += text + '\n';
          if (verbose) process.stdout.write(text);
          agentLog.push(`[agent] ${text.slice(0, 200)}${text.length > 200 ? '...' : ''}`);
        }
      } else if (message.type === 'result') {
        const result = message as { type: 'result'; result?: string };
        if (result.result) {
          agentOutputText += result.result;
          agentLog.push(`[result] ${result.result.slice(0, 300)}`);
        }
      } else if (verbose) {
        agentLog.push(`[${message.type}] (turn ${messageCount})`);
      }
    }

    log('INFO', `Agent completed (${messageCount} messages exchanged)`);
    agentLog.push(`Agent completed: ${messageCount} messages`);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    log('ERROR', `Agent error: ${errMsg}`);
    agentLog.push(`Agent error: ${errMsg}`);
  }

  // ---------------------------------------------------------------------------
  // Objective verification — run tests ourselves after agent finishes
  // ---------------------------------------------------------------------------
  let finalRunResult: RunResult = {
    stdout: '',
    stderr: '',
    exitCode: 1,
    passed: 0,
    failed: 0,
    total: 0,
  };

  let compileSuccess = false;
  let coverage: CoverageResult = { lines: 0, branches: 0, functions: 0, statements: 0 };
  let edgeCaseScore = 0;

  if (fileExists(testFile)) {
    log('INFO', 'Test file found — running objective verification...');
    agentLog.push('Running objective verification...');

    // Check compile
    compileSuccess = checkCompile(testFile, projectRoot);
    agentLog.push(`Compile success: ${compileSuccess}`);

    if (compileSuccess) {
      // Run tests
      finalRunResult = runTests(projectRoot, testFileRelative);
      log('INFO', `Tests: ${finalRunResult.passed} passed, ${finalRunResult.failed} failed of ${finalRunResult.total}`);
      agentLog.push(`Tests: ${finalRunResult.passed}/${finalRunResult.total} passed`);

      // Get coverage
      try {
        coverage = getCoverage(projectRoot, testFileRelative);
        log('INFO', `Coverage: lines=${coverage.lines}% branches=${coverage.branches}% functions=${coverage.functions}%`);
        agentLog.push(`Coverage: lines=${coverage.lines}%`);
      } catch (err) {
        log('WARN', `Coverage collection failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // Compute edge case score from the generated test source
    const testSource = fs.readFileSync(testFile, 'utf-8');
    edgeCaseScore = computeEdgeCaseScore(testSource);
    agentLog.push(`Edge case score: ${edgeCaseScore}`);
  } else {
    log('WARN', 'Test file was not created by the agent.');
    agentLog.push('WARNING: Test file not created by agent.');
  }

  // Compute pass rate
  const passRate =
    finalRunResult.total > 0
      ? Math.round((finalRunResult.passed / finalRunResult.total) * 100)
      : 0;

  const passed = finalRunResult.exitCode === 0 && finalRunResult.total > 0;
  const durationMs = Date.now() - startTime;

  log('INFO', `Done in ${formatDuration(durationMs)}. Pass rate: ${passRate}%`);

  return {
    testFile,
    passed,
    iterations: Math.min(messageCount, maxIterations),
    passRate,
    coverage,
    compileSuccess,
    edgeCaseScore,
    log: agentLog,
    durationMs,
    finalRunResult,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Builds the user-facing prompt that tells the agent precisely what to do.
 */
function buildUserPrompt(params: {
  sourceFileRelative: string;
  testFileRelative: string;
  maxIterations: number;
}): string {
  return `## Task: Generate and Validate Tests

**Source file to test:** \`${params.sourceFileRelative}\`
**Test file to create:** \`${params.testFileRelative}\`
**Max repair iterations:** ${params.maxIterations}

### Instructions:
1. Read \`${params.sourceFileRelative}\` to understand its full API surface.
2. Generate comprehensive Vitest tests covering: happy paths, edge cases, boundary values, invalid inputs, and exceptions.
3. Write the test file to \`${params.testFileRelative}\`.
4. Run the tests using: \`npx vitest run ${params.testFileRelative} --reporter=verbose\`
5. If tests fail, diagnose the failures, fix ONLY the failing tests, and re-run.
6. Repeat step 5 up to ${params.maxIterations} times until all tests pass.
7. When complete, output a brief summary of: tests written, pass/fail count, and estimated coverage.

Begin now.`;
}

/**
 * Extracts text content from an assistant message (handles multiple content formats).
 */
function extractText(message: unknown): string {
  const msg = message as {
    type: string;
    text?: string;
    content?: string | Array<{ type: string; text?: string }>;
  };

  if (typeof msg.text === 'string') return msg.text;
  if (typeof msg.content === 'string') return msg.content;
  if (Array.isArray(msg.content)) {
    return msg.content
      .filter((c) => c.type === 'text' && typeof c.text === 'string')
      .map((c) => c.text ?? '')
      .join('');
  }
  return '';
}

/**
 * Checks whether the test file compiles via tsc (no-emit).
 */
function checkCompile(testFile: string, cwd: string): boolean {
  try {
    const result = spawnSync(
      'npx',
      ['tsc', '--noEmit', '--skipLibCheck', '--allowJs', testFile],
      { cwd, shell: true, encoding: 'utf-8', timeout: 30_000 }
    );
    return result.status === 0;
  } catch {
    return true; // Don't fail the run if tsc is not available
  }
}

/**
 * Scores the test file for edge case coverage (0–100).
 * Checks for presence of common edge case patterns.
 */
function computeEdgeCaseScore(testSource: string): number {
  const patterns: [RegExp, number][] = [
    [/\bnull\b/, 10],
    [/\bundefined\b/, 10],
    [/['"]{2}/, 10],             // empty string ""
    [/\b0\b/, 8],                // zero
    [/-\d+/, 8],                 // negative number
    [/toThrow|rejects/, 12],     // exception testing
    [/Infinity|NaN/, 8],         // special numbers
    [/MAX_SAFE_INTEGER|MIN_SAFE_INTEGER/, 6],
    [/\[\]/, 6],                 // empty array
    [/\{\s*\}/, 6],              // empty object
    [/boundary|edge|invalid/i, 6],
  ];

  let score = 0;
  for (const [pattern, weight] of patterns) {
    if (pattern.test(testSource)) {
      score += weight;
    }
  }
  return Math.min(100, score);
}
