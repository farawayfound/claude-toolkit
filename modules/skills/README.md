# skills

Fourteen slash commands, one folder each, no shared code; a folder may carry reference files and scripts next to its SKILL.md. Each works alone; where one names another part, that part is optional. Into a checkout: `node dropin.mjs add check --repo .` or `cp -r modules/skills/check <repo>/.claude/skills/`. For every repo: `--user` or `cp -r ... ~/.claude/skills/`.

| Skill | Use | Output |
|---|---|---|
| `recon` | Start of work in unfamiliar code; four agents in one message | Stack and commands, baseline, code path, chokepoint and bypasses, risks, 3 questions, smallest valuable change |
| `orient` | The same, single-agent | Same brief |
| `takehome-init` | A brief arrives | A clean repo, ignore file, docs skeleton, AGENTS.md, ledger, the fence, the time plan |
| `scope` | Before any change beyond one file | Requirements verbatim, options with a recommendation, questions, acceptance cases, files, budget, fence, time plan, ledger rows; stops for approval |
| `decide` | Any decision, as it happens | One attributed row in docs/decisions.md |
| `repro-fix` | Bugs, incidents, regressions | RED, root cause, minimal fix, GREEN, siblings, detection |
| `check` | After any change, before "done" | Check / Command / Exit / Result table, failing output verbatim, PASS, FAIL or PARTIAL |
| `break` | After GREEN, before review or submission | Hidden-test list, findings table with reproducers, mutation score, BROKEN, WEAK or HELD (`edge-matrix.md`, `scripts/mutate.mjs`) |
| `deslop` | Before review | Lines before and after per file, bulk in and beyond the prompt (`slop-patterns.md`) |
| `tighten-docs` | Before handing over | README to the skeleton, detail into docs/, AGENTS.md, flagged patterns (`readme-skeleton.md`, `agents-skeleton.md`, `ai-writing-patterns.md`) |
| `ship` | Submission time | The gate table, fixes applied, the note (`scripts/ship-check.mjs`) |
| `access-control` | Who may read or change which records | Chokepoint, bypasses, identity source, deny-by-default matrix RED then GREEN, audit line |
| `perf-baseline` | Slowness, timeouts, queueing | p50, p95, max and queue wait before and after, bottleneck with evidence, limits |
| `pr-brief` | A verified change ready for review (user-invoked only) | PR title and body: problem, change, verification, measurement, risks, rollback, follow-ups |
