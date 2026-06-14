/**
 * optimize.ts
 * Optimization harness — compares prompt variants and auto-enhances prompts
 * based on observed failure patterns.
 *
 * Usage: npm run optimize
 */

import 'dotenv/config';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as process from 'node:process';
import { runEvaluation, type EvalOutput, type EvalRecord } from '../evals/evaluator.js';
import { extractFailurePatterns, computeAggregateMetrics, type AggregateMetrics } from '../evals/metrics.js';
import { PROMPT_VARIANTS, type PromptVariant } from '../agent/prompts.js';
import { log, formatDuration, ensureDir, listFiles } from '../agent/tools.js';
import { runTestWriter } from '../agent/testWriter.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface VariantResult {
  variant: PromptVariant;
  aggregate: AggregateMetrics;
  outputPath: string;
}

export interface ComparisonOutput {
  timestamp: string;
  variants: Record<string, AggregateMetrics>;
  winner: PromptVariant;
  analysis: string;
}

export interface OptimizationOutput {
  timestamp: string;
  baseline: AggregateMetrics;
  optimized: AggregateMetrics;
  delta: {
    coverage: number;
    passRate: number;
    edgeCaseScore: number;
    compileSuccessRate: number;
  };
  failurePatternsFound: number;
  enhancedPromptPreview: string;
  improvementSummary: string;
}

// ---------------------------------------------------------------------------
// Phase 1: Compare Prompts A, B, C
// ---------------------------------------------------------------------------

export async function comparePrompts(
  datasetDir: string,
  resultsDir: string,
  options?: { sample?: number; model?: string }
): Promise<ComparisonOutput> {
  log('INFO', '=== Phase 1: Prompt Comparison ===');
  ensureDir(resultsDir);

  const variants: PromptVariant[] = ['A', 'B', 'C'];
  const results: VariantResult[] = [];

  for (const variant of variants) {
    log('INFO', `--- Evaluating Prompt ${variant} ---`);
    const outputPath = path.join(resultsDir, `prompt${variant}.json`);

    const evalOutput = await runEvaluation(datasetDir, variant, outputPath, {
      sample: options?.sample,
      model: options?.model,
    });

    results.push({
      variant,
      aggregate: evalOutput.aggregate,
      outputPath,
    });
  }

  // Find winner by combined score
  const scored = results.map((r) => ({
    variant: r.variant,
    aggregate: r.aggregate,
    score: (r.aggregate.avgCoverage + r.aggregate.avgPassRate + r.aggregate.avgEdgeCaseScore) / 3,
  }));
  scored.sort((a, b) => b.score - a.score);
  const winner = scored[0]!.variant;

  const variantsRecord: Record<string, AggregateMetrics> = {};
  for (const r of results) {
    variantsRecord[r.variant] = r.aggregate;
  }

  const analysis = generateComparisonAnalysis(variantsRecord, winner);

  const output: ComparisonOutput = {
    timestamp: new Date().toISOString(),
    variants: variantsRecord,
    winner,
    analysis,
  };

  const comparisonPath = path.join(resultsDir, 'comparison.json');
  fs.writeFileSync(comparisonPath, JSON.stringify(output, null, 2), 'utf-8');
  log('INFO', `Comparison saved: ${comparisonPath}`);
  log('INFO', `Winner: Prompt ${winner}`);

  return output;
}

// ---------------------------------------------------------------------------
// Phase 2: Failure-Driven Optimization
// ---------------------------------------------------------------------------

export async function optimizeFromFailures(
  datasetDir: string,
  resultsDir: string,
  baselineOutput: EvalOutput,
  options?: { sample?: number; model?: string }
): Promise<OptimizationOutput> {
  log('INFO', '=== Phase 2: Failure-Driven Optimization ===');
  ensureDir(resultsDir);

  // Collect failed outputs
  const failedOutputs: string[] = [];
  for (const record of baselineOutput.records) {
    if (record.passRate < 100) {
      failedOutputs.push(
        `File: ${record.file}\n` +
        `Pass rate: ${record.passRate}%\n` +
        `Error: ${record.error ?? 'Tests failed'}`
      );
    }
    if (record.edgeCaseScore < 50) {
      failedOutputs.push(`File: ${record.file}\nEdge case score too low: ${record.edgeCaseScore}`);
    }
  }

  const patterns = extractFailurePatterns(failedOutputs);
  log('INFO', `Found ${patterns.length} failure patterns:`);
  for (const p of patterns) {
    log('INFO', `  [${p.count}x] ${p.pattern}`);
  }

  // Build enhanced prompt by appending failure-specific clauses
  const enhancedPrompt = buildEnhancedPrompt(PROMPT_VARIANTS['C'], patterns);
  const previewLength = 300;
  const enhancedPreview = enhancedPrompt.slice(-previewLength) + (enhancedPrompt.length > previewLength ? '...' : '');

  // Run evaluation with enhanced prompt
  const optimizedPath = path.join(resultsDir, 'optimized.json');
  const optimizedOutput = await runEvaluationWithOverride(datasetDir, optimizedPath, enhancedPrompt, {
    sample: options?.sample,
    model: options?.model,
  });

  // Compute deltas
  const baseline = baselineOutput.aggregate;
  const optimized = optimizedOutput.aggregate;

  const delta = {
    coverage: optimized.avgCoverage - baseline.avgCoverage,
    passRate: optimized.avgPassRate - baseline.avgPassRate,
    edgeCaseScore: optimized.avgEdgeCaseScore - baseline.avgEdgeCaseScore,
    compileSuccessRate: optimized.compileSuccessRate - baseline.compileSuccessRate,
  };

  const improvementSummary = generateImprovementSummary(baseline, optimized, delta, patterns);

  const output: OptimizationOutput = {
    timestamp: new Date().toISOString(),
    baseline,
    optimized,
    delta,
    failurePatternsFound: patterns.length,
    enhancedPromptPreview: enhancedPreview,
    improvementSummary,
  };

  const outputPath = path.join(resultsDir, 'optimization_result.json');
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');
  log('INFO', `Optimization result saved: ${outputPath}`);

  return output;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildEnhancedPrompt(
  basePrompt: string,
  patterns: Array<{ pattern: string; suggestion: string }>
): string {
  if (patterns.length === 0) return basePrompt;

  const clauses = patterns
    .map((p) => `- **${p.pattern}**: ${p.suggestion}`)
    .join('\n');

  return `${basePrompt}

## OPTIMIZER-INJECTED REQUIREMENTS
The following failure patterns were observed during evaluation. Address all of them:

${clauses}`;
}

function generateComparisonAnalysis(
  variants: Record<string, AggregateMetrics>,
  winner: string
): string {
  const lines: string[] = [
    `Winner: Prompt ${winner}`,
    '',
    'Results:',
  ];
  for (const [variant, metrics] of Object.entries(variants)) {
    lines.push(
      `  Prompt ${variant}: avgCoverage=${metrics.avgCoverage}% avgPassRate=${metrics.avgPassRate}% avgEdgeScore=${metrics.avgEdgeCaseScore} compileSuccess=${metrics.compileSuccessRate}%`
    );
  }
  return lines.join('\n');
}

function generateImprovementSummary(
  baseline: AggregateMetrics,
  optimized: AggregateMetrics,
  delta: OptimizationOutput['delta'],
  patterns: Array<{ pattern: string }>
): string {
  const improved = Object.values(delta).some((d) => d > 0);
  const sign = (n: number): string => (n >= 0 ? `+${n}` : `${n}`);

  return [
    `Failure-driven optimization ${improved ? 'improved' : 'did not improve'} agent performance.`,
    `Coverage: ${baseline.avgCoverage}% → ${optimized.avgCoverage}% (${sign(delta.coverage)}%)`,
    `Pass rate: ${baseline.avgPassRate}% → ${optimized.avgPassRate}% (${sign(delta.passRate)}%)`,
    `Edge case score: ${baseline.avgEdgeCaseScore} → ${optimized.avgEdgeCaseScore} (${sign(delta.edgeCaseScore)})`,
    `Patterns addressed: ${patterns.length}`,
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Extended runEvaluation with systemPromptOverride support
// ---------------------------------------------------------------------------

async function runEvaluationWithOverride(
  datasetDir: string,
  outputPath: string,
  systemPromptOverride: string,
  options?: { sample?: number; model?: string }
): Promise<EvalOutput> {
  const projectRoot = process.cwd();
  const resolvedDataset = path.resolve(datasetDir);
  const resolvedOutput = path.resolve(outputPath);

  let datasetFiles = listFiles(resolvedDataset, '.ts').filter(
    (f) => !f.name.endsWith('.test.ts')
  );

  if (options?.sample) {
    datasetFiles = datasetFiles.slice(0, options.sample);
  }

  const records: EvalRecord[] = [];
  const startTime = Date.now();

  for (let i = 0; i < datasetFiles.length; i++) {
    const file = datasetFiles[i]!;
    log('INFO', `[${i + 1}/${datasetFiles.length}] Processing: ${file.name}`);

    const record: EvalRecord = {
      file: file.name,
      coverage: 0,
      passRate: 0,
      compileSuccess: false,
      edgeCaseScore: 0,
      iterations: 0,
      durationMs: 0,
      testsPassed: 0,
      testsFailed: 0,
      testsTotal: 0,
    };

    try {
      const result = await runTestWriter({
        sourceFile: file.path,
        systemPromptOverride,
        model: options?.model,
        projectRoot,
      });

      record.coverage = result.coverage.lines;
      record.passRate = result.passRate;
      record.compileSuccess = result.compileSuccess;
      record.edgeCaseScore = result.edgeCaseScore;
      record.iterations = result.iterations;
      record.durationMs = result.durationMs;
      record.testsPassed = result.finalRunResult.passed;
      record.testsFailed = result.finalRunResult.failed;
      record.testsTotal = result.finalRunResult.total;
    } catch (err) {
      record.error = err instanceof Error ? err.message : String(err);
    }

    records.push(record);
  }

  const aggregate = computeAggregateMetrics(records);
  const output: EvalOutput = {
    promptVariant: 'ENHANCED',
    timestamp: new Date().toISOString(),
    projectRoot,
    records,
    aggregate,
    totalDurationMs: Date.now() - startTime,
  };

  ensureDir(path.dirname(resolvedOutput));
  fs.writeFileSync(resolvedOutput, JSON.stringify(output, null, 2), 'utf-8');
  return output;
}

// ---------------------------------------------------------------------------
// CLI entry point: npm run optimize
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  const DATASET_DIR = './src/evals/datasets';

  let sample: number | undefined;
  const sampleIdx = args.indexOf('--sample');
  if (sampleIdx !== -1 && args[sampleIdx + 1]) {
    sample = parseInt(args[sampleIdx + 1]!, 10);
  }

  let model: string | undefined;
  const modelIdx = args.indexOf('--model');
  if (modelIdx !== -1 && args[modelIdx + 1]) {
    model = args[modelIdx + 1]!;
  }

  // Use a separate output directory for demo/sample runs so pre-built results are preserved
  const isDemo = sample !== undefined && sample <= 5;
  const RESULTS_DIR = isDemo ? './results/live' : './results';

  if (isDemo) {
    log('INFO', `Demo mode: ${sample} files. Live results → results/live/`);
  }

  const startTime = Date.now();
  log('INFO', '╔══════════════════════════════════════╗');
  log('INFO', '║   Test Writer Agent — Optimizer      ║');
  log('INFO', '╚══════════════════════════════════════╝');

  try {
    // Phase 1: Compare all prompt variants
    const comparison = await comparePrompts(DATASET_DIR, RESULTS_DIR, { sample, model });

    // Phase 2: Failure-driven optimization using winner prompt's results
    const winnerPath = path.join(RESULTS_DIR, `prompt${comparison.winner}.json`);
    const winnerOutput: EvalOutput = JSON.parse(fs.readFileSync(winnerPath, 'utf-8')) as EvalOutput;

    await optimizeFromFailures(DATASET_DIR, RESULTS_DIR, winnerOutput, { sample, model });

    log('INFO', `Optimization complete in ${formatDuration(Date.now() - startTime)}`);
    log('INFO', `Results saved to ${path.resolve(RESULTS_DIR)}`);
  } catch (err) {
    console.error('Optimizer failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

main();
