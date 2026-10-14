---
name: repro-fix
description: "Use when fixing a bug, incident or regression: reproduces it as a failing test first, states the root cause in one sentence, applies the minimal fix, sweeps sibling call sites and adds detection."
argument-hint: "[symptom]"
---

# Repro-fix: $ARGUMENTS

Every bug becomes a regression test. Order: red, root cause, minimal fix, green, sibling sweep, detection. Symptom: $ARGUMENTS

## Steps
1. **Expectation.** Rewrite the symptom as `Expected: ... / Actual: ...` and pick a test name that states scenario and expectation in the repo's naming style. Reproduce only with fixtures or mocks, never against live, shared or production systems.
2. **Hypotheses.** List 2-3 ranked causes, each with the cheapest check that tells them apart (a grep, a log line, a one-off `python -c` or `node -e` that writes no files). Run the checks; say out loud which hypotheses are disproved and drop them.
3. **Red.** Delegate the failing test to the test-writer agent if installed (give it the expectation and the test name), or write it yourself. Run only that test and show the RED output; the failure must match the symptom. If the test passes, the hypothesis is wrong: say so and return to step 2.
4. **Root cause.** Before editing, state it in one sentence: `Root cause: <file:line> <what is wrong and why>`. Make the minimal fix at the cause, not where the symptom surfaced.
5. **Green.** Rerun the same test and show it passing, then run /check (if installed; else the repo's own lint and test commands, with their output).
6. **Sibling sweep.** Search for the same pattern with `rg -n "<pattern>"`. Fix siblings that are in scope; list the rest as follow-ups with `file:line`.
7. **Detection.** Make the silent failure loud where it was silent: a structured error with a code, or a log line with a correlation id.
8. **Commits.** Only when asked: two commits, the test first, then the fix, so the red state stays reproducible.

## Anti-patterns
Editing the test or its expectation to fit the current behaviour; sleep or retry band-aids; catch-and-ignore; raising limits or timeouts instead of fixing the cause.

## Usual suspects
Pagination stopping at the first page; retries without idempotency creating duplicates; missing timeouts; token expiry mid-run; swallowed exceptions returning empty success; schema drift; truncated output treated as complete; concurrent writers to one file; CRLF or encoding on Windows; time zones; off-by-one.

## Output
```
Expected / Actual: <one line each>
Hypotheses: 1. <cause> - check: <cmd> - <disproved | confirmed>
RED: `<test cmd>` exit <n>; <failing assertion line>
Root cause: <file:line> <one sentence>
GREEN: `<test cmd>` exit 0; <summary line>; /check verdict: <PASS | FAIL | PARTIAL>
Siblings: fixed <file:line> | follow-up <file:line> | none found (pattern: <rg pattern>)
Detection: <error code or log line added, file:line>
```
