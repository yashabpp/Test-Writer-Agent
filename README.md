# Test Writer Agent

> An autonomous AI agent that reads TypeScript source files, generates Vitest tests, runs them, repairs failures, and iterates until tests pass — powered by the **Claude Agent SDK**.

---

## Quick Start (verify it works in ~3 minutes)

```bash
# 1. Install
npm install

# 2. Set your API key
cp .env.example .env
# Edit .env and set ANTHROPIC_API_KEY=sk-ant-...

# 3. Run on a single file (fastest way to see it work)
npm run agent -- ./src/evals/datasets/calculator.ts --verbose

# 4. Run a 3-file demo eval (writes to results/live-demo.json, safe to run)
npm run demo
```

The `results/` folder contains **pre-built example outputs** from a full 20-file run. Running `npm run demo` writes to `results/live-demo.json` — it does **not** overwrite the pre-built results.

---

## Overview

The Test Writer Agent is a production-quality agentic system that demonstrates:

- **Autonomous agent design** using `@anthropic-ai/claude-agent-sdk`
- **Tool-augmented reasoning** with native Read, Write, Edit, and Bash tools
- **Self-repair loops** — the agent runs tests, reads failures, and rewrites broken tests
- **Evaluation harness** — benchmarks the agent across 20 TypeScript source files
- **Prompt optimization** — compares variants A/B/C, extracts failure patterns, auto-enhances the prompt

---

## Architecture

```
User Input (source file)
        │
        ▼
┌─────────────────────────────────────────────────┐
│              CLI  (src/cli.ts)                  │
└──────────────────────┬──────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────┐
│       Test Writer Agent  (src/agent/)           │
│                                                 │
│  testWriter.ts — Orchestrator                   │
│  • Builds user prompt                           │
│  • Calls claude-agent-sdk query()               │
│  • Streams & logs agent messages                │
│  • Runs objective verification                  │
│                                                 │
│  prompts.ts — System Prompts                    │
│  • Variant A  (minimal)                         │
│  • Variant B  (edge-focused)                    │
│  • Variant C  (full production)                 │
│  • ENHANCED   (optimizer-generated)             │
│                                                 │
│  tools.ts — Orchestrator Utilities              │
│  • readFile / writeFile                         │
│  • runTests (vitest)                            │
│  • getCoverage (v8)                             │
└──────────────────────┬──────────────────────────┘
                       │ Claude Agent SDK
                       │ (native tools: Read/Write/Edit/Bash)
                       ▼
┌─────────────────────────────────────────────────┐
│          Evaluation Harness  (src/evals/)       │
│                                                 │
│  evaluator.ts — runs agent on each dataset file │
│  metrics.ts   — pass rate, coverage, edge score │
│  datasets/    — 20 TypeScript source files      │
└──────────────────────┬──────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────┐
│         Optimization Harness  (src/optimizer/)  │
│                                                 │
│  optimize.ts — Phase 1: compare A/B/C           │
│              — Phase 2: failure-driven repair   │
│  report.ts   — generates results/report.md      │
└──────────────────────┬──────────────────────────┘
                       │
                       ▼
                 results/
                 ├── baseline.json       (Prompt C full run)
                 ├── comparison.json     (A vs B vs C)
                 ├── optimized.json      (enhanced prompt run)
                 └── report.md
```

---

## Agent Workflow

The agent follows a strict **Observe → Act → Evaluate → Repair → Repeat** loop:

```
1. READ source file
        │
        ▼
2. ANALYZE exported API surface
   (functions, classes, methods, types)
        │
        ▼
3. PLAN tests
   (happy path, edge cases, boundaries,
    invalid inputs, exceptions, async)
        │
        ▼
4. WRITE test file
   (<source-name>.test.ts)
        │
        ▼
5. RUN tests
   (npx vitest run <testfile>)
        │
        ▼
6. CHECK results
   ┌────┴────┐
   │ All pass│ → DONE ✅
   └────┬────┘
        │ Failures found
        ▼
7. DIAGNOSE failures
   (read error messages & stack traces)
        │
        ▼
8. REPAIR failing tests ONLY
   (do not touch passing tests)
        │
        ▼
9. RE-RUN → back to step 6
   (max 5 repair iterations)
```

---

## Results

Pre-built example results are in `results/`. These were generated from a full 20-file run.

| Metric          | Prompt A (baseline) | Prompt C | Optimized |
|-----------------|---------------------|----------|-----------|
| Pass Rate       | 61%                 | 99%      | **100%**  |
| Line Coverage   | 64%                 | 89%      | **93%**   |
| Edge Case Score | 42/100              | 83/100   | **89/100**|
| Compile Success | 85%                 | 100%     | **100%**  |

The 42% → 89% edge case improvement is the key result: the optimizer identified that Prompt A routinely missed null/undefined, exception paths, and boundary values, then auto-injected requirements for all of them.

---

## How to Run

### Prerequisites

- Node.js 20+
- npm 9+
- An Anthropic API key (`ANTHROPIC_API_KEY`)

### Setup

```bash
npm install
cp .env.example .env
# Edit .env and set your ANTHROPIC_API_KEY
```

### Commands

```bash
# Run agent on a single file (~1-2 min, ~$0.05)
npm run agent -- ./src/evals/datasets/calculator.ts

# Stream agent output
npm run agent -- ./src/evals/datasets/auth.ts --verbose

# Use a specific prompt variant
npm run agent -- ./src/evals/datasets/sorting.ts --prompt B

# 3-file demo eval — safe, writes to results/live-demo.json (~5 min, ~$0.15)
npm run demo

# Full evaluation — all 20 files, overwrites results/baseline.json (~40 min, ~$1)
npm run eval

# Quick optimizer — 3 files, writes to results/live/ (~20 min, ~$0.60)
npm run demo:optimize

# Full optimizer — all 20 files × 4 prompts (~3 hrs, ~$4)
npm run optimize

# Regenerate results/report.md from existing result files
npm run report
```

> **Cost note:** All estimates assume the default model (`claude-haiku-4-5-20251001`). The single-file `npm run agent` is the lowest-cost way to verify the agent works end-to-end. Use `--model claude-sonnet-4-6` for higher quality at higher cost.

---

## Key Design Decisions

**Why Claude Agent SDK (not raw API)?**
The agent needs a multi-turn tool-use loop: read a file, write tests, run them, read the failure output, repair, re-run. The SDK's `query()` handles the tool execution loop and message history automatically, so the orchestrator only needs to define allowed tools and provide the initial prompt.

**Why Vitest?**
Fast startup, native ESM support, built-in coverage via V8 — and the agent can run `npx vitest run` in a Bash tool call without any build step. This makes the repair loop tight.

**Why these 4 metrics?**
- **Pass rate** — did the agent produce working tests?
- **Coverage** — did it exercise the code thoroughly?
- **Edge case score** — did it test the hard cases (null, throw, boundaries)?
- **Iterations** — how efficiently did it reach a passing state?

Coverage alone would miss tests that pass but don't actually stress the code. Edge case score catches that gap.

**How the optimizer works:**
Phase 1 runs Prompts A, B, C on the full dataset and scores each. Phase 2 analyzes the winner's failures, extracts recurring patterns (e.g., "exception not asserted", "async not handled"), appends remediation clauses to the system prompt, and re-evaluates. The improvement from 83→89 edge score came entirely from those injected clauses.

---

## What the Edge Case Score Measures

The score (0–100) checks the generated test file for presence of these patterns:

| Pattern | Weight | Why it matters |
|---------|--------|----------------|
| `null` literal | +10 | Most functions silently break on null input |
| `undefined` literal | +10 | Different from null in JS — worth testing separately |
| Empty string `""` | +10 | Common boundary for string operations |
| Zero `0` | +8 | Division, modulo, loops — zero is a known failure point |
| Negative numbers `-N` | +8 | Factorial, sqrt, index — often untested |
| `.toThrow` / `.rejects` | +12 | Exception paths are the most likely to be skipped |
| `Infinity` / `NaN` | +8 | JS arithmetic quirks that break most naive implementations |
| `MAX_SAFE_INTEGER` | +6 | Integer overflow edge that rarely appears in happy-path tests |
| Empty array `[]` | +6 | Collection operations break on empty input |
| Empty object `{}` | +6 | Object operations break on missing keys |
| `boundary`/`edge`/`invalid` keywords | +6 | Descriptive test names signal intentional edge coverage |

A score of 42% (Prompt A) means most generated test suites hit coverage numbers but skip the hard cases. 100% line coverage with 42% edge score is a real, observable gap — the agent was writing tests that execute all lines but never challenged the code with unusual inputs.

---

## Future Improvements

- **Parallel evaluation** — run multiple files concurrently with a concurrency limit to cut eval time from 40 min to ~10 min
- **Multi-model comparison** — benchmark Haiku vs Sonnet vs Opus to find the cost/quality tradeoff for test generation
- **Mutation testing integration** — use Stryker to score test quality beyond coverage; this would make the edge case score objective rather than heuristic
- **Regression tracking** — compare results across evaluation runs over time so prompt changes can be validated against a stable baseline

---

## Project Structure

```
test-writer-agent/
├── src/
│   ├── agent/
│   │   ├── testWriter.ts     # Agent orchestrator (query() loop)
│   │   ├── prompts.ts        # System prompt variants A/B/C/ENHANCED
│   │   └── tools.ts          # Orchestrator utilities
│   ├── evals/
│   │   ├── evaluator.ts      # Evaluation harness
│   │   ├── metrics.ts        # Metric computation functions
│   │   └── datasets/         # 20 TypeScript source files
│   ├── optimizer/
│   │   ├── optimize.ts       # Two-phase optimization harness
│   │   ├── promptVariants.ts # Prompt registry re-export
│   │   └── report.ts         # Markdown report generator
│   └── cli.ts                # CLI entry point
├── results/
│   ├── baseline.json         # Pre-built: Prompt C, 20-file run
│   ├── comparison.json       # Pre-built: Prompt A/B/C comparison
│   ├── optimized.json        # Pre-built: enhanced prompt run
│   ├── report.md             # Generated evaluation report
│   └── live-demo.json        # Created by: npm run demo (gitignored)
├── .env.example              # Environment variable template
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

---

## Tech Stack

| Technology | Role |
|---|---|
| `@anthropic-ai/claude-agent-sdk` | Agent loop, tool execution, context management |
| TypeScript (strict) | Type safety throughout |
| Vitest | Test runner for generated tests |
| `@vitest/coverage-v8` | V8-powered coverage reporting |
| `tsx` | Direct TypeScript execution (no build step) |
| `dotenv` | Environment variable loading |
| Node.js 20+ | ESM runtime |

---

_Built with the Claude Agent SDK — Observe → Act → Evaluate → Repair → Repeat_
