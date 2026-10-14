---
name: break
description: "Use after the tests are green and before review or submission: input-driven adversarial testing. Derives an edge matrix from the brief and the input shapes, runs breaker agents that mutate inputs and execute the real entrypoints, mutates the code to grade the test suite, and turns every confirmed miss into a failing test."
argument-hint: "[entrypoint or feature]"
---

# Break: $ARGUMENTS

Find what a strict reviewer's hidden test would find, with evidence, then make the suite catch it. The checkout stays read-only; scratch copies and mutated fixtures go under the scratch directory you name in each brief, never inside the repo.

## 1. Targets
- From the brief, README and tests, list: input shapes (files, records, fields, enums, ids), rules in their stated order (gates, validation, status mapping), side effects (writes, calls, logs) and every assertion the brief names.
- Read `${CLAUDE_SKILL_DIR}/edge-matrix.md` and pick the families that apply.
- Write the hidden-test list: 3-6 assertions a reviewer's hidden test would make, verbatim and exact (a call list after a full run, "blocked before any call", the output shape, an exit code).

## 2. Breakers, in one message
Launch `breaker` agents in parallel, one per group, each with a self-contained brief: entrypoints and commands, the families to cover, the hidden-test list, the scratch directory, and `return at most 12 findings; CONFIRMED needs the command and its output`.
1. Input shape and identifiers.
2. Rules, order and semantics: gates, fail-open defaults, heuristics, leakage, injection.
3. Process, CLI and concurrency: reruns, partial writes, exit codes, tracebacks, stale state.
Start the `verifier` in the background when the suite has not run this session.

## 3. Mutation score
```
node ${CLAUDE_SKILL_DIR}/scripts/mutate.mjs --test "<test command>" --max 15 <chokepoint files>
```
One operator at a time, on a temporary copy of the working tree (ignored directories such as `.venv` and `node_modules` are linked in): it writes the mutant, runs the suite there, and prints killed and survived. The checkout is never written. Every survivor is a test gap: add it as `[med] survivor file:line <op>`.

## 4. Triage
Merge and de-duplicate. high = wrong status, skipped gate, leak, crash, or a hidden-test assertion that fails; med = silent coercion, a false positive, a survivor; low = cosmetic. Re-run the decisive command yourself for every high before reporting it.

## 5. Close the loop
- High and med findings go to `test-writer` as a case table, RED first; fix at the cause; `verifier` after.
- Anything deferred goes into the README's limits list with its reproducer. Nothing is dropped silently.

## Output
```
**Hidden tests**: 1. <assertion> (holds | fails: <evidence>) ...
| # | sev | family | reproducer | observed | expected | file:line | CONFIRMED/PLAUSIBLE |
Mutation: <killed>/<run> killed; survivors: <file:line op>, ...
Verdict: BROKEN (any high) | WEAK (med only) | HELD (nothing confirmed)
Next: test-writer cases <ids>; deferred <ids> to README limits
```
