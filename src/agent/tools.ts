/**
 * tools.ts
 * Orchestrator-level utility functions for file I/O, test execution, and coverage parsing.
 * These are used by the evaluator and optimizer — NOT passed to the agent directly.
 * The agent uses the Claude Agent SDK's native built-in tools (Read, Write, Edit, Bash).
 */

import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  passed: number;
  failed: number;
  total: number;
}

export interface CoverageResult {
  lines: number;
  branches: number;
  functions: number;
  statements: number;
}

export interface FileInfo {
  name: string;
  path: string;
  relativePath: string;
  sizeBytes: number;
}

// ---------------------------------------------------------------------------
// Tool: readFile
// ---------------------------------------------------------------------------

/**
 * Reads a file from disk and returns its contents as a string.
 * @param filePath - Absolute or relative path to the file.
 */
export function readFile(filePath: string): string {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`readFile: File not found — ${resolved}`);
  }
  return fs.readFileSync(resolved, 'utf-8');
}

// ---------------------------------------------------------------------------
// Tool: writeFile
// ---------------------------------------------------------------------------

/**
 * Writes content to a file, creating parent directories if needed.
 * @param filePath - Absolute or relative path to the target file.
 * @param content  - String content to write.
 */
export function writeFile(filePath: string, content: string): void {
  const resolved = path.resolve(filePath);
  const dir = path.dirname(resolved);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(resolved, content, 'utf-8');
  console.log(`[writeFile] Saved: ${resolved}`);
}

// ---------------------------------------------------------------------------
// Tool: runTests
// ---------------------------------------------------------------------------

/**
 * Runs Vitest for a specific test file (or the whole project) and returns results.
 * Parses vitest JSON reporter output to extract pass/fail counts.
 *
 * @param cwd       - Working directory for the test run (project root).
 * @param testFile  - Optional path to a specific test file; runs all if omitted.
 */
export function runTests(cwd: string, testFile?: string): RunResult {
  const args = ['vitest', 'run', '--reporter=verbose'];
  if (testFile) {
    args.push(testFile);
  }

  const result = spawnSync('npx', args, {
    cwd: path.resolve(cwd),
    encoding: 'utf-8',
    shell: true,
    timeout: 120_000,
    env: { ...process.env },
  });

  const stdout = result.stdout ?? '';
  const stderr = result.stderr ?? '';
  const exitCode = result.status ?? 1;

  // Parse vitest verbose output for pass/fail counts
  const { passed, failed, total } = parseVitestOutput(stdout + stderr);

  return { stdout, stderr, exitCode, passed, failed, total };
}

/**
 * Parses vitest verbose output to extract test counts.
 */
function parseVitestOutput(output: string): {
  passed: number;
  failed: number;
  total: number;
} {
  // Vitest summary lines look like:
  // "Tests  3 failed | 12 passed (15)"
  // "Tests  15 passed (15)"
  const summaryMatch = output.match(
    /Tests\s+(?:(\d+)\s+failed\s*\|?\s*)?(\d+)\s+passed\s*\((\d+)\)/
  );

  if (summaryMatch) {
    const failed = parseInt(summaryMatch[1] ?? '0', 10);
    const passed = parseInt(summaryMatch[2] ?? '0', 10);
    const total = parseInt(summaryMatch[3] ?? '0', 10);
    return { passed, failed, total };
  }

  // Fallback: count individual test result lines
  const passMatches = output.match(/✓|✔|PASS|passed/gi) ?? [];
  const failMatches = output.match(/✗|✘|FAIL|failed/gi) ?? [];
  const passed = passMatches.length;
  const failed = failMatches.length;
  return { passed, failed, total: passed + failed };
}

// ---------------------------------------------------------------------------
// Tool: getCoverage
// ---------------------------------------------------------------------------

/**
 * Runs Vitest with V8 coverage and parses the JSON summary.
 * Returns line/branch/function/statement coverage percentages.
 *
 * @param cwd      - Project root directory.
 * @param testFile - Optional specific test file.
 */
export function getCoverage(cwd: string, testFile?: string): CoverageResult {
  const cwdResolved = path.resolve(cwd);
  const coverageSummaryPath = path.join(cwdResolved, 'coverage', 'coverage-summary.json');

  // Remove old coverage data
  try {
    fs.rmSync(path.join(cwdResolved, 'coverage'), { recursive: true, force: true });
  } catch {
    // ignore
  }

  const args = ['vitest', 'run', '--coverage', '--reporter=verbose'];
  if (testFile) args.push(testFile);

  spawnSync('npx', args, {
    cwd: cwdResolved,
    encoding: 'utf-8',
    shell: true,
    timeout: 180_000,
    env: { ...process.env },
  });

  // Parse coverage-summary.json generated by @vitest/coverage-v8
  if (fs.existsSync(coverageSummaryPath)) {
    try {
      const raw = JSON.parse(fs.readFileSync(coverageSummaryPath, 'utf-8')) as Record<
        string,
        { lines: { pct: number }; branches: { pct: number }; functions: { pct: number }; statements: { pct: number } }
      >;
      const total = raw['total'];
      if (total) {
        return {
          lines: Math.round(total.lines.pct),
          branches: Math.round(total.branches.pct),
          functions: Math.round(total.functions.pct),
          statements: Math.round(total.statements.pct),
        };
      }
    } catch {
      // fall through to default
    }
  }

  // Fallback if coverage file not found
  return { lines: 0, branches: 0, functions: 0, statements: 0 };
}

// ---------------------------------------------------------------------------
// Tool: listFiles
// ---------------------------------------------------------------------------

/**
 * Lists all files under a directory recursively, optionally filtered by extension.
 * @param dir - Directory to search.
 * @param ext - Optional file extension filter (e.g., '.ts').
 */
export function listFiles(dir: string, ext?: string): FileInfo[] {
  const resolved = path.resolve(dir);
  if (!fs.existsSync(resolved)) return [];

  const results: FileInfo[] = [];

  function walk(current: string): void {
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== 'dist') {
          walk(fullPath);
        }
      } else if (entry.isFile()) {
        if (!ext || entry.name.endsWith(ext)) {
          const stat = fs.statSync(fullPath);
          results.push({
            name: entry.name,
            path: fullPath,
            relativePath: path.relative(resolved, fullPath),
            sizeBytes: stat.size,
          });
        }
      }
    }
  }

  walk(resolved);
  return results;
}

// ---------------------------------------------------------------------------
// Utility: ensureDir
// ---------------------------------------------------------------------------

export function ensureDir(dirPath: string): void {
  fs.mkdirSync(path.resolve(dirPath), { recursive: true });
}

// ---------------------------------------------------------------------------
// Utility: fileExists
// ---------------------------------------------------------------------------

export function fileExists(filePath: string): boolean {
  return fs.existsSync(path.resolve(filePath));
}

// ---------------------------------------------------------------------------
// Utility: deriveTestFilePath
// ---------------------------------------------------------------------------

/**
 * Given a source file path, returns the corresponding test file path.
 * e.g. src/evals/datasets/calculator.ts → src/evals/datasets/calculator.test.ts
 */
export function deriveTestFilePath(sourceFile: string): string {
  const parsed = path.parse(path.resolve(sourceFile));
  return path.join(parsed.dir, `${parsed.name}.test.ts`);
}

// ---------------------------------------------------------------------------
// Utility: logger
// ---------------------------------------------------------------------------

export function log(level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG', message: string): void {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level}]`;
  if (level === 'ERROR') {
    console.error(`${prefix} ${message}`);
  } else {
    console.log(`${prefix} ${message}`);
  }
}

// ---------------------------------------------------------------------------
// Utility: sleep
// ---------------------------------------------------------------------------

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Utility: formatDuration
// ---------------------------------------------------------------------------

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`;
}
