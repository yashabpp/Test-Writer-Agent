/**
 * report.ts
 * Reads evaluation JSON results and generates a Markdown report.
 *
 * Usage: npm run report
 */

import 'dotenv/config';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { type EvalOutput } from '../evals/evaluator.js';
import { type OptimizationOutput } from './optimize.js';
import { ensureDir, log } from '../agent/tools.js';

// ---------------------------------------------------------------------------
// Report generator
// ---------------------------------------------------------------------------

function loadJson<T>(filePath: string): T | null {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
    }
  } catch {
    // ignore
  }
  return null;
}

function formatPct(n: number, suffix = '%'): string {
  return `${n}${suffix}`;
}

function sign(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

function generateReport(resultsDir: string, outputPath: string): void {
  const baseline = loadJson<EvalOutput>(path.join(resultsDir, 'baseline.json'));
  const promptA = loadJson<EvalOutput>(path.join(resultsDir, 'promptA.json'));
  const promptB = loadJson<EvalOutput>(path.join(resultsDir, 'promptB.json'));
  const promptC = loadJson<EvalOutput>(path.join(resultsDir, 'promptC.json'));
  const optimized = loadJson<EvalOutput>(path.join(resultsDir, 'optimized.json'));
  const comparison = loadJson<{ variants: Record<string, { avgCoverage: number; avgPassRate: number; avgEdgeCaseScore: number; compileSuccessRate: number }>; winner: string }>(
    path.join(resultsDir, 'comparison.json')
  );
  const optimizationResult = loadJson<OptimizationOutput>(path.join(resultsDir, 'optimization_result.json'));

  const baselineData = baseline ?? promptA;
  const optimizedData = optimized ?? promptC;

  const lines: string[] = [];

  // ---------------------------------------------------------------------------
  // Header
  // ---------------------------------------------------------------------------
  lines.push('# Test Writer Agent — Evaluation Report');
  lines.push('');
  lines.push(`> Generated: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('---');

  // ---------------------------------------------------------------------------
  // Executive Summary
  // ---------------------------------------------------------------------------
  lines.push('## Executive Summary');
  lines.push('');
  lines.push('This report presents evaluation results for the **Test Writer Agent** across a dataset of 20 TypeScript source files.');
  lines.push('The agent autonomously generates, runs, and repairs Vitest tests using the Claude Agent SDK.');
  lines.push('');

  if (baselineData && optimizedData) {
    const covDelta = optimizedData.aggregate.avgCoverage - baselineData.aggregate.avgCoverage;
    const prDelta = optimizedData.aggregate.avgPassRate - baselineData.aggregate.avgPassRate;
    lines.push(`- **Line Coverage**: ${baselineData.aggregate.avgCoverage}% → ${optimizedData.aggregate.avgCoverage}% (${sign(covDelta)}%)`);
    lines.push(`- **Pass Rate**: ${baselineData.aggregate.avgPassRate}% → ${optimizedData.aggregate.avgPassRate}% (${sign(prDelta)}%)`);
    lines.push(`- **Files Evaluated**: ${baselineData.aggregate.filesEvaluated}`);
    lines.push('');
  }

  // ---------------------------------------------------------------------------
  // Baseline vs Optimized Comparison Table
  // ---------------------------------------------------------------------------
  lines.push('## Baseline vs Optimized');
  lines.push('');

  if (baselineData && optimizedData) {
    const ba = baselineData.aggregate;
    const oa = optimizedData.aggregate;

    lines.push('| Metric | Baseline | Optimized | Delta |');
    lines.push('|---|---|---|---|');
    lines.push(`| Line Coverage | ${formatPct(ba.avgCoverage)} | ${formatPct(oa.avgCoverage)} | **${sign(oa.avgCoverage - ba.avgCoverage)}%** |`);
    lines.push(`| Pass Rate | ${formatPct(ba.avgPassRate)} | ${formatPct(oa.avgPassRate)} | **${sign(oa.avgPassRate - ba.avgPassRate)}%** |`);
    lines.push(`| Edge Case Score | ${ba.avgEdgeCaseScore}/100 | ${oa.avgEdgeCaseScore}/100 | **${sign(oa.avgEdgeCaseScore - ba.avgEdgeCaseScore)}** |`);
    lines.push(`| Compile Success | ${formatPct(ba.compileSuccessRate)} | ${formatPct(oa.compileSuccessRate)} | **${sign(oa.compileSuccessRate - ba.compileSuccessRate)}%** |`);
    lines.push('');
  } else {
    lines.push('_Run `npm run eval` and `npm run optimize` to generate results._');
    lines.push('');
  }

  // ---------------------------------------------------------------------------
  // Prompt Comparison
  // ---------------------------------------------------------------------------
  lines.push('## Prompt Variant Comparison');
  lines.push('');

  if (comparison) {
    lines.push(`Winner: **Prompt ${comparison.winner}**`);
    lines.push('');
    lines.push('| Prompt | Coverage | Pass Rate | Edge Score | Compile Success |');
    lines.push('|---|---|---|---|---|');
    for (const [variant, m] of Object.entries(comparison.variants)) {
      const isWinner = variant === comparison.winner ? ' 🏆' : '';
      lines.push(`| ${variant}${isWinner} | ${m.avgCoverage}% | ${m.avgPassRate}% | ${m.avgEdgeCaseScore}/100 | ${m.compileSuccessRate}% |`);
    }
    lines.push('');
  } else if (promptA && promptB && promptC) {
    lines.push('| Prompt | Coverage | Pass Rate | Edge Score | Compile Success |');
    lines.push('|---|---|---|---|---|');
    for (const [label, data] of [['A', promptA], ['B', promptB], ['C', promptC]] as const) {
      lines.push(`| ${label} | ${data.aggregate.avgCoverage}% | ${data.aggregate.avgPassRate}% | ${data.aggregate.avgEdgeCaseScore}/100 | ${data.aggregate.compileSuccessRate}% |`);
    }
    lines.push('');
  }

  // ---------------------------------------------------------------------------
  // Per-File Breakdown
  // ---------------------------------------------------------------------------
  if (optimizedData && optimizedData.records.length > 0) {
    lines.push('## Per-File Results (Optimized Prompt)');
    lines.push('');
    lines.push('| File | Pass Rate | Coverage | Edge Score | Compile | Tests |');
    lines.push('|---|---|---|---|---|---|');
    for (const record of optimizedData.records) {
      const status = record.compileSuccess ? '✅' : '❌';
      lines.push(
        `| ${record.file} | ${record.passRate}% | ${record.coverage}% | ${record.edgeCaseScore}/100 | ${status} | ${record.testsPassed}/${record.testsTotal} |`
      );
    }
    lines.push('');
  }

  // ---------------------------------------------------------------------------
  // Failure-Driven Optimization Summary
  // ---------------------------------------------------------------------------
  if (optimizationResult) {
    lines.push('## Failure-Driven Optimization');
    lines.push('');
    lines.push(`**Failure patterns identified**: ${optimizationResult.failurePatternsFound}`);
    lines.push('');
    lines.push('**Improvement summary**:');
    lines.push('```');
    lines.push(optimizationResult.improvementSummary);
    lines.push('```');
    lines.push('');
  }

  // ---------------------------------------------------------------------------
  // Architecture Notes
  // ---------------------------------------------------------------------------
  lines.push('## Architecture');
  lines.push('');
  lines.push('```');
  lines.push('User Input (source file)');
  lines.push('        │');
  lines.push('        ▼');
  lines.push('  ┌─────────────────────┐');
  lines.push('  │  Test Writer Agent  │  ← claude-agent-sdk query()');
  lines.push('  │                     │');
  lines.push('  │  ┌─────────────┐    │');
  lines.push('  │  │ Read Tool   │    │  (native SDK tools)');
  lines.push('  │  │ Write Tool  │    │');
  lines.push('  │  │ Edit Tool   │    │');
  lines.push('  │  │ Bash Tool   │    │');
  lines.push('  │  └─────────────┘    │');
  lines.push('  └─────────┬───────────┘');
  lines.push('            │');
  lines.push('            ▼');
  lines.push('  ┌─────────────────────┐');
  lines.push('  │  Objective Verifier │  ← runTests(), getCoverage()');
  lines.push('  └─────────┬───────────┘');
  lines.push('            │');
  lines.push('            ▼');
  lines.push('  ┌─────────────────────┐');
  lines.push('  │  Evaluation Harness │  ← evaluator.ts, metrics.ts');
  lines.push('  └─────────┬───────────┘');
  lines.push('            │');
  lines.push('            ▼');
  lines.push('  ┌─────────────────────┐');
  lines.push('  │  Optimization Loop  │  ← optimize.ts');
  lines.push('  │  (Prompt A/B/C/Enh) │');
  lines.push('  └─────────┬───────────┘');
  lines.push('            │');
  lines.push('            ▼');
  lines.push('     results/report.md');
  lines.push('```');
  lines.push('');

  // ---------------------------------------------------------------------------
  // How to Run
  // ---------------------------------------------------------------------------
  lines.push('## How to Run');
  lines.push('');
  lines.push('```bash');
  lines.push('# 1. Install dependencies');
  lines.push('npm install');
  lines.push('');
  lines.push('# 2. Set your API key');
  lines.push('cp .env.example .env');
  lines.push('# Edit .env and add your ANTHROPIC_API_KEY');
  lines.push('');
  lines.push('# 3. Run agent on a single file');
  lines.push('npm run agent -- ./src/evals/datasets/calculator.ts');
  lines.push('');
  lines.push('# 4. Run full evaluation (all 20 files)');
  lines.push('npm run eval');
  lines.push('');
  lines.push('# 5. Run optimization harness');
  lines.push('npm run optimize');
  lines.push('');
  lines.push('# 6. Generate this report');
  lines.push('npm run report');
  lines.push('```');
  lines.push('');

  // ---------------------------------------------------------------------------
  // Footer
  // ---------------------------------------------------------------------------
  lines.push('---');
  lines.push('_Generated by Test Writer Agent — Powered by Claude Agent SDK_');

  // Write report
  ensureDir(path.dirname(outputPath));
  fs.writeFileSync(outputPath, lines.join('\n'), 'utf-8');
  log('INFO', `Report saved: ${outputPath}`);
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const RESULTS_DIR = './results';
  const OUTPUT_PATH = './results/report.md';

  generateReport(RESULTS_DIR, OUTPUT_PATH);
  console.log(`\n✅ Report generated: ${path.resolve(OUTPUT_PATH)}\n`);
}

main();
