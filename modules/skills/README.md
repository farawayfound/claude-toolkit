# skills

> Run the commands here in a terminal, inside your project's folder, unless a line says otherwise. `~/claude-toolkit` is where you cloned the toolkit; `[square brackets]` are yours to replace.

Fifteen slash commands, one folder each, no shared code; a folder may carry reference files and scripts next to its SKILL.md. Each works alone; where one names another part, that part is optional. Into a checkout: `node ~/claude-toolkit/dropin.mjs add check --repo .`, or by hand `mkdir -p [path to your project]/.claude/skills && cp -r ~/claude-toolkit/modules/skills/check [path to your project]/.claude/skills/` and add `/.claude/skills/check/` to `.git/info/exclude` so git does not see it. A copied folder works on its own: scripts find the repo through git and their own location (on macOS or Linux, `chmod +x` a copied skill's `scripts/*`).

| Skill | Use | Output |
|---|---|---|
| `recon` | Start of work in unfamiliar code; four agents in one message, or the same four passes in sequence | Stack and commands, baseline, code path, chokepoint and bypasses, risks, 3 questions, smallest valuable change |
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
| `parallel` | Several issues at once (user-invoked only): `plan [issues]` before, `check` before merge | Files, overlaps, stacks and launch order; conflicts and PR claims checked. `scripts/`: `wt-new` (worktree and branch per issue with this checkout's Claude config), `wtc` (named plan-mode session, per-session status line and bell), `wt-board`, `wt-conflicts`, `wt-workspace` (a VS Code workspace beside the clone with the scripts on its terminals' PATH) |
| `team` | A review with one lens per teammate, a build with one teammate per disjoint file set, or a bug hunt with competing hypotheses: `review [base]`, `build <approved plan>`, `hunt <symptom>` | Task table with owners and evidence, the merged result, the lead's own re-run, verdict. Needs the `teams` part (the switch, the audit log and the evidence hook), which `dropin.mjs` brings along |
