/**
 * cli.ts
 * Command-line interface for the Test Writer Agent.
 * Usage: npm run agent -- <source-file> [options]
 */

import 'dotenv/config';
import * as path from 'node:path';
import * as process from 'node:process';
import { runTestWriter } from './agent/testWriter.js';
import { type PromptVariant } from './agent/prompts.js';
import { log, formatDuration } from './agent/tools.js';

// ---------------------------------------------------------------------------
// CLI Argument Parser
// ---------------------------------------------------------------------------

interface CliArgs {
  sourceFile: string;
  promptVariant: PromptVariant;
  maxIterations: number;
  model: string;
  verbose: boolean;
  help: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const args = argv.slice(2); // strip node + script

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    return { sourceFile: '', promptVariant: 'C', maxIterations: 5, model: '', verbose: false, help: true };
  }

  const sourceFile = args[0] ?? '';
  let promptVariant: PromptVariant = 'C';
  let maxIterations = 5;
  let model = process.env['AGENT_MODEL'] ?? 'claude-haiku-4-5-20251001';
  let verbose = process.env['AGENT_VERBOSE'] === 'true';

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if ((arg === '--prompt' || arg === '-p') && args[i + 1]) {
      const v = args[++i]!.toUpperCase();
      if (['A', 'B', 'C', 'ENHANCED'].includes(v)) {
        promptVariant = v as PromptVariant;
      }
    } else if ((arg === '--max-iterations' || arg === '-m') && args[i + 1]) {
      maxIterations = parseInt(args[++i]!, 10);
    } else if ((arg === '--model') && args[i + 1]) {
      model = args[++i]!;
    } else if (arg === '--verbose' || arg === '-v') {
      verbose = true;
    }
  }

  return { sourceFile, promptVariant, maxIterations, model, verbose, help: false };
}

function printHelp(): void {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║           Test Writer Agent — CLI                            ║
╚══════════════════════════════════════════════════════════════╝

USAGE:
  npm run agent -- <source-file> [options]

ARGUMENTS:
  <source-file>           Path to the TypeScript source file to test.

OPTIONS:
  -p, --prompt <A|B|C>    Prompt variant (default: C — full production)
  -m, --max-iterations N  Max repair iterations (default: 5)
      --model <name>      Claude model (default: claude-haiku-4-5-20251001)
  -v, --verbose           Stream agent output to stdout
  -h, --help              Show this help message

EXAMPLES:
  npm run agent -- ./src/evals/datasets/calculator.ts
  npm run agent -- ./src/evals/datasets/auth.ts --verbose
  npm run agent -- ./src/evals/datasets/validator.ts -p B -m 3
  npm run agent -- ./src/evals/datasets/stringUtils.ts --model claude-opus-4-5

ENVIRONMENT:
  ANTHROPIC_API_KEY       Required. Your Anthropic API key.
  AGENT_MODEL             Default model (overridden by --model).
  AGENT_VERBOSE           Set to 'true' for verbose output.
  `);
}

function printResults(result: Awaited<ReturnType<typeof runTestWriter>>): void {
  const status = result.passed ? '✅ PASSED' : '❌ FAILED';
  const bar = (pct: number): string => {
    const filled = Math.round(pct / 5);
    return '█'.repeat(filled) + '░'.repeat(20 - filled) + ` ${pct}%`;
  };

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                  Test Writer — Results                       ║
╚══════════════════════════════════════════════════════════════╝

  Status        : ${status}
  Test file     : ${result.testFile}
  Duration      : ${formatDuration(result.durationMs)}
  Iterations    : ${result.iterations}
  Compile       : ${result.compileSuccess ? '✅ Success' : '❌ Failed'}

  Pass Rate     : ${bar(result.passRate)}
  Line Coverage : ${bar(result.coverage.lines)}
  Branch Cov.   : ${bar(result.coverage.branches)}
  Fn Coverage   : ${bar(result.coverage.functions)}
  Edge Score    : ${bar(result.edgeCaseScore)}

  Tests         : ${result.finalRunResult.passed} passed, ${result.finalRunResult.failed} failed (${result.finalRunResult.total} total)
`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = parseArgs(process.argv);

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  if (!args.sourceFile) {
    console.error('Error: No source file specified. Run with --help for usage.');
    process.exit(1);
  }

  const sourceFile = path.resolve(args.sourceFile);

  log('INFO', `Test Writer Agent starting...`);

  try {
    const result = await runTestWriter({
      sourceFile,
      promptVariant: args.promptVariant,
      maxIterations: args.maxIterations,
      model: args.model,
      verbose: args.verbose,
      projectRoot: process.cwd(),
    });

    printResults(result);

    process.exit(result.passed ? 0 : 1);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`\nFatal error: ${msg}`);
    process.exit(1);
  }
}

main();
