/**
 * evaluator.ts
 * Evaluation harness — runs the Test Writer Agent across an entire dataset
 * and produces structured JSON results.
 *
 * Usage: npm run eval
 */

import 'dotenv/config';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as process from 'node:process';
import { runTestWriter } from '../agent/testWriter.js';
import { type PromptVariant } from '../agent/prompts.js';
import {
  computeAggregateMetrics,
  type AggregateMetrics,
} from './metrics.js';
import { listFiles, log, formatDuration, ensureDir } from '../agent/tools.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EvalRecord {
  file: string;
  coverage: number;
  passRate: number;
  compileSuccess: boolean;
  edgeCaseScore: number;
  iterations: number;
  durationMs: number;
  testsPassed: number;
  testsFailed: number;
  testsTotal: number;
  error?: string;
}

export interface EvalOutput {
  promptVariant: string;
  timestamp: string;
  projectRoot: string;
  records: EvalRecord[];
  aggregate: AggregateMetrics;
  totalDurationMs: number;
}

// ---------------------------------------------------------------------------
// Core evaluation function
// ---------------------------------------------------------------------------

export async function runEvaluation(
  datasetDir: string,
  promptVariant: PromptVariant,
  outputPath: string,
  options?: {
    sample?: number;
    model?: string;
    maxIterations?: number;
    verbose?: boolean;
  }
): Promise<EvalOutput> {
  const projectRoot = process.cwd();
  const resolvedDataset = path.resolve(datasetDir);
  const resolvedOutput = path.resolve(outputPath);

  log('INFO', `=== Evaluation Harness Starting ===`);
  log('INFO', `Dataset: ${resolvedDataset}`);
  log('INFO', `Prompt variant: ${promptVariant}`);
  log('INFO', `Output: ${resolvedOutput}`);

  // Discover dataset files (exclude .test.ts files)
  let datasetFiles = listFiles(resolvedDataset, '.ts').filter(
    (f) => !f.name.endsWith('.test.ts')
  );

  if (datasetFiles.length === 0) {
    throw new Error(`No .ts files found in dataset directory: ${resolvedDataset}`);
  }

  // Optionally sample N files for quick runs
  if (options?.sample && options.sample < datasetFiles.length) {
    log('INFO', `Sampling ${options.sample} of ${datasetFiles.length} files`);
    datasetFiles = datasetFiles.slice(0, options.sample);
  }

  log('INFO', `Evaluating ${datasetFiles.length} files...`);

  const records: EvalRecord[] = [];
  const startTime = Date.now();

  for (let i = 0; i < datasetFiles.length; i++) {
    const file = datasetFiles[i]!;
    const fileProgress = `[${i + 1}/${datasetFiles.length}]`;
    log('INFO', `${fileProgress} Processing: ${file.name}`);

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
        promptVariant,
        maxIterations: options?.maxIterations ?? 5,
        model: options?.model,
        verbose: options?.verbose ?? false,
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

      log(
        'INFO',
        `${fileProgress} Done: passRate=${record.passRate}% coverage=${record.coverage}% edgeCase=${record.edgeCaseScore} in ${formatDuration(record.durationMs)}`
      );
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      record.error = errMsg;
      log('ERROR', `${fileProgress} Failed: ${errMsg}`);
    }

    records.push(record);

    // Save partial results after each file
    const partial: EvalOutput = {
      promptVariant,
      timestamp: new Date().toISOString(),
      projectRoot,
      records,
      aggregate: computeAggregateMetrics(records),
      totalDurationMs: Date.now() - startTime,
    };
    ensureDir(path.dirname(resolvedOutput));
    fs.writeFileSync(resolvedOutput, JSON.stringify(partial, null, 2), 'utf-8');
  }

  const totalDurationMs = Date.now() - startTime;
  const aggregate = computeAggregateMetrics(records);

  const output: EvalOutput = {
    promptVariant,
    timestamp: new Date().toISOString(),
    projectRoot,
    records,
    aggregate,
    totalDurationMs,
  };

  fs.writeFileSync(resolvedOutput, JSON.stringify(output, null, 2), 'utf-8');

  log('INFO', `=== Evaluation Complete ===`);
  log('INFO', `  Files evaluated  : ${records.length}`);
  log('INFO', `  Avg pass rate    : ${aggregate.avgPassRate}%`);
  log('INFO', `  Avg coverage     : ${aggregate.avgCoverage}%`);
  log('INFO', `  Avg edge score   : ${aggregate.avgEdgeCaseScore}`);
  log('INFO', `  Compile success  : ${aggregate.compileSuccessRate}%`);
  log('INFO', `  Total duration   : ${formatDuration(totalDurationMs)}`);
  log('INFO', `  Results saved to : ${resolvedOutput}`);

  return output;
}

// ---------------------------------------------------------------------------
// CLI entry point: npm run eval
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  const DATASET_DIR = path.resolve('./src/evals/datasets');
  const OUTPUT_PATH = path.resolve('./results/baseline.json');

  // Parse --sample N flag
  let sample: number | undefined;
  const sampleIdx = args.indexOf('--sample');
  if (sampleIdx !== -1 && args[sampleIdx + 1]) {
    sample = parseInt(args[sampleIdx + 1]!, 10);
  }

  // Parse --prompt flag
  let promptVariant: PromptVariant = 'C';
  const promptIdx = args.indexOf('--prompt');
  if (promptIdx !== -1 && args[promptIdx + 1]) {
    const v = args[promptIdx + 1]!.toUpperCase();
    if (['A', 'B', 'C', 'ENHANCED'].includes(v)) {
      promptVariant = v as PromptVariant;
    }
  }

  // Parse --output flag
  let outputPath = OUTPUT_PATH;
  const outputIdx = args.indexOf('--output');
  if (outputIdx !== -1 && args[outputIdx + 1]) {
    outputPath = path.resolve(args[outputIdx + 1]!);
  }

  try {
    await runEvaluation(DATASET_DIR, promptVariant, outputPath, {
      sample,
      verbose: args.includes('--verbose'),
    });
  } catch (err) {
    console.error('Evaluator failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

main();
