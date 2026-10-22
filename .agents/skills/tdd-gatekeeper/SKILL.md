---
name: tdd-gatekeeper
description: Use this skill before writing any code, during feature development, and before concluding any implementation step to enforce strict test-driven development.
---

# Test-Driven Verification & Quality Protocol

## Goal
Guarantee that every component works under real conditions with unit and integration tests before marking any task as complete.

## Enforcement Rules
1. **Red-Green-Refactor Requirement**:
   - Always write tests in `tests/` before writing or modifying implementation code in `src/`.
   - Run tests using `npx vitest run tests/<target>.test.ts` to confirm failure.
   - Implement minimum code in `src/` to make tests pass.
2. **Mandatory Test Coverage**:
   - `tests/parser.test.ts`: Test loading JSON, YAML, invalid files, and schemas with recursive `$ref`.
   - `tests/generator.test.ts`: Test types, depth limits (no stack overflows), and semantic Faker heuristics.
   - `tests/server.test.ts`: Spin up test Hono instances; test path params, `Prefer` headers, and CORS.
   - `tests/state.test.ts`: Verify POST-then-GET consistency in stateful mode.
3. **Execution Gate**:
   - Never claim a phase is complete until `npx vitest run` passes with 0 failures.
