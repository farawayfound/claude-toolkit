---
name: deslop
description: "Use after a change is green and before review: removes generated slop (narrating comments, unused defensiveness, one-use wrappers, dead parameters, redundant tests) without changing behaviour, and reports the bulk of the change against the brief."
argument-hint: "[base branch or path]"
---

# Deslop: $ARGUMENTS

Behaviour stays; bulk goes. Work on the diff against the base (the argument, else the merge-base with origin/HEAD, else main), one file at a time, with the verifier afterwards.

1. **Measure first.** `git diff --stat <base>`; for a take-home, lines per deliverable the brief named versus lines beyond it. Print the table; it is the budget.
2. **Remove**, with `${CLAUDE_SKILL_DIR}/slop-patterns.md` as the checklist:
   - Comments and docstrings that narrate the code or restate the signature. Keep only the why.
   - Defensive checks and try/except the surrounding code does not use on that path; casts and `Any` that silence a type error.
   - Helpers used once, wrappers around one stdlib call, abstractions with one implementation, parameters nobody passes, flags nobody asked for, config for one value.
   - Print and log noise, banners and emoji in output, trailing "Note:" paragraphs.
   - Tests that assert the same behaviour twice, tests of the language or the stdlib, names like `test_works`.
   - Anything beyond the prompt the fence did not approve: list it; delete only with the user.
3. **Keep**: validation at trust boundaries, the error paths the brief names, a comment that explains a non-obvious why, and the repository's own style even where it is verbose.
4. **Prove**: the verifier runs the suite; the diff against the pre-deslop state is removals only. Every surviving line answers "what breaks without it?".
5. The built-in `/simplify` and the code-simplifier agent do the mechanical part; this skill is the policy and the budget.

## Output
```
| file | lines before | after | removed |
Bulk: <lines in the prompt> in the prompt, <lines> beyond it; Verifier: PASS | FAIL
Left in on purpose: <item>: <why>
```
