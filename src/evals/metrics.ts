/**
 * metrics.ts
 * Pure metric computation functions for the evaluation harness.
 * No side effects — takes data, returns scores.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawnSync } from 'node:child_process';
import { type RunResult } from '../agent/tools.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MetricSet {
  passRate: number;        // 0–100
  coverage: number;        // 0–100 (line coverage)
  compileSuccess: boolean;
  edgeCaseScore: number;   // 0–100
}

// ---------------------------------------------------------------------------
// Metric: Pass Rate
// ---------------------------------------------------------------------------

/**
 * Computes pass rate as a percentage.
 * @returns 0–100
 */
export function computePassRate(result: RunResult): number {
  if (result.total === 0) return 0;
  return Math.round((result.passed / result.total) * 100);
}

// ---------------------------------------------------------------------------
// Metric: Compile Success
// ---------------------------------------------------------------------------

/**
 * Checks whether the generated test file compiles via tsc --noEmit.
 * Returns true if it compiles, false otherwise.
 */
export function computeCompileSuccess(testFile: string, cwd: string): boolean {
  if (!fs.existsSync(testFile)) return false;

  const result = spawnSync(
    'npx',
    [
      'tsc',
      '--noEmit',
      '--skipLibCheck',
      '--target', 'ES2022',
      '--module', 'NodeNext',
      '--moduleResolution', 'bundler',
      '--esModuleInterop', 'true',
      '--strict', 'false', // relax for generated tests
      testFile,
    ],
    {
      cwd: path.resolve(cwd),
      shell: true,
      encoding: 'utf-8',
      timeout: 30_000,
    }
  );

  return result.status === 0;
}

// ---------------------------------------------------------------------------
// Metric: Edge Case Score
// ---------------------------------------------------------------------------

/**
 * Analyzes test source code and returns a score (0–100) based on
 * the presence of edge case patterns.
 *
 * Scoring rubric:
 *   null               → +10
 *   undefined          → +10
 *   empty string       → +10
 *   zero (0)           → +8
 *   negative number    → +8
 *   toThrow/rejects    → +12
 *   Infinity/NaN       → +8
 *   MAX/MIN_SAFE_INT   → +6
 *   empty array []     → +6
 *   empty object {}    → +6
 *   boundary/edge kw   → +6
 *   (capped at 100)
 */
export function computeEdgeCaseScore(testSource: string): number {
  if (!testSource || testSource.trim().length === 0) return 0;

  const checks: Array<{ pattern: RegExp; weight: number; label: string }> = [
    { pattern: /\bnull\b/,                  weight: 10, label: 'null' },
    { pattern: /\bundefined\b/,             weight: 10, label: 'undefined' },
    { pattern: /['"]{2}|`{2}/,             weight: 10, label: 'empty string' },
    { pattern: /\b0\b/,                     weight:  8, label: 'zero' },
    { pattern: /-\d+/,                      weight:  8, label: 'negative number' },
    { pattern: /\.toThrow|\.rejects/,       weight: 12, label: 'exception test' },
    { pattern: /\bInfinity\b|\bNaN\b/,      weight:  8, label: 'Infinity/NaN' },
    { pattern: /MAX_SAFE_INTEGER|MIN_SAFE_INTEGER/, weight: 6, label: 'safe integer bounds' },
    { pattern: /\[\s*\]/,                   weight:  6, label: 'empty array' },
    { pattern: /\{\s*\}/,                   weight:  6, label: 'empty object' },
    { pattern: /boundary|edge.?case|invalid|malformed/i, weight: 6, label: 'edge case label' },
  ];

  let score = 0;
  for (const check of checks) {
    if (check.pattern.test(testSource)) {
      score += check.weight;
    }
  }

  return Math.min(100, score);
}

/**
 * Returns a detailed breakdown of which edge case patterns are present.
 */
export function computeEdgeCaseBreakdown(testSource: string): Record<string, boolean> {
  return {
    null: /\bnull\b/.test(testSource),
    undefined: /\bundefined\b/.test(testSource),
    emptyString: /['"]{2}|`{2}/.test(testSource),
    zero: /\b0\b/.test(testSource),
    negativeNumber: /-\d+/.test(testSource),
    exceptionTesting: /\.toThrow|\.rejects/.test(testSource),
    infinityOrNaN: /\bInfinity\b|\bNaN\b/.test(testSource),
    safeIntegerBounds: /MAX_SAFE_INTEGER|MIN_SAFE_INTEGER/.test(testSource),
    emptyArray: /\[\s*\]/.test(testSource),
    emptyObject: /\{\s*\}/.test(testSource),
    edgeCaseLabel: /boundary|edge.?case|invalid|malformed/i.test(testSource),
  };
}

// ---------------------------------------------------------------------------
// Aggregate metrics across multiple eval records
// ---------------------------------------------------------------------------

export interface AggregateMetrics {
  avgCoverage: number;
  avgPassRate: number;
  avgEdgeCaseScore: number;
  compileSuccessRate: number;
  filesEvaluated: number;
}

export function computeAggregateMetrics(
  records: Array<{
    coverage: number;
    passRate: number;
    edgeCaseScore: number;
    compileSuccess: boolean;
  }>
): AggregateMetrics {
  if (records.length === 0) {
    return {
      avgCoverage: 0,
      avgPassRate: 0,
      avgEdgeCaseScore: 0,
      compileSuccessRate: 0,
      filesEvaluated: 0,
    };
  }

  const n = records.length;
  const sum = (arr: number[]): number => arr.reduce((a, b) => a + b, 0);

  return {
    avgCoverage: Math.round(sum(records.map((r) => r.coverage)) / n),
    avgPassRate: Math.round(sum(records.map((r) => r.passRate)) / n),
    avgEdgeCaseScore: Math.round(sum(records.map((r) => r.edgeCaseScore)) / n),
    compileSuccessRate: Math.round((records.filter((r) => r.compileSuccess).length / n) * 100),
    filesEvaluated: n,
  };
}

// ---------------------------------------------------------------------------
// Failure pattern extraction
// ---------------------------------------------------------------------------

export interface FailurePattern {
  pattern: string;
  count: number;
  suggestion: string;
}

/**
 * Analyzes failed test output to extract recurring failure patterns.
 * Used by the optimizer to auto-enhance the system prompt.
 */
export function extractFailurePatterns(
  failedOutputs: string[]
): FailurePattern[] {
  const patternMap = new Map<string, { count: number; suggestion: string }>();

  const rules: Array<{
    regex: RegExp;
    label: string;
    suggestion: string;
  }> = [
    {
      regex: /division.by.zero|divide.by.zero|cannot.divide/i,
      label: 'Division by zero not tested',
      suggestion: 'Always test divisor = 0 for any function that divides.',
    },
    {
      regex: /cannot.read.prop|undefined.*property|null.*property/i,
      label: 'Null/undefined property access',
      suggestion: 'Test null and undefined for every object parameter.',
    },
    {
      regex: /expected.*throw|should.throw|throws.*error/i,
      label: 'Exception not asserted correctly',
      suggestion: 'Use expect(() => fn()).toThrow() for sync, await expect(fn()).rejects.toThrow() for async.',
    },
    {
      regex: /async|promise|await/i,
      label: 'Async behavior not handled',
      suggestion: 'Mark test functions as async and use await for all Promise-returning functions.',
    },
    {
      regex: /import.*error|cannot.find.module|module.not.found/i,
      label: 'Import path error',
      suggestion: 'Use relative imports with .js extension for ESM. e.g., import { fn } from "./module.js"',
    },
    {
      regex: /type.error|is.not.a.function|not.*callable/i,
      label: 'Type error in test',
      suggestion: 'Verify the exported API matches what is imported in the test.',
    },
    {
      regex: /empty.array|empty.string|empty.collection/i,
      label: 'Empty collection not tested',
      suggestion: 'Always test empty arrays [], empty strings "", and empty objects {} for collection operations.',
    },
    {
      regex: /overflow|max.value|min.value|integer/i,
      label: 'Integer boundary not tested',
      suggestion: 'Test Number.MAX_SAFE_INTEGER and Number.MIN_SAFE_INTEGER for arithmetic functions.',
    },
  ];

  for (const output of failedOutputs) {
    for (const rule of rules) {
      if (rule.regex.test(output)) {
        const existing = patternMap.get(rule.label);
        if (existing) {
          existing.count++;
        } else {
          patternMap.set(rule.label, { count: 1, suggestion: rule.suggestion });
        }
      }
    }
  }

  return Array.from(patternMap.entries())
    .map(([pattern, { count, suggestion }]) => ({ pattern, count, suggestion }))
    .sort((a, b) => b.count - a.count);
}
