# skills

> Run the commands here in a terminal, inside your project's folder, unless a line says otherwise. `"$HOME/claude-toolkit"` is where you cloned the toolkit; `[square brackets]` are yours to replace.

Fourteen slash commands, one folder each, no shared code; a folder may carry reference files and scripts next to its SKILL.md. Each works alone; where one names another part, that part is optional. Into a checkout: `node "$HOME/claude-toolkit/dropin.mjs" add check --repo .`, or by hand `mkdir -p [path to your project]/.claude/skills && cp -r "$HOME/claude-toolkit/modules/skills/check" [path to your project]/.claude/skills/` and add `/.claude/skills/check/` to `.git/info/exclude` so git does not see it. A copied folder works on its own: scripts find the repo through git and their own location (on macOS or Linux, `chmod +x` a copied skill's `scripts/*`).

| Skill | Use | Output |
|---|---|---|
| `recon` | First, in code you have not read, brief or no brief; four agents in one message | `.claude/plan/recon.md`: stack and commands, baseline, map of entrypoints to side effects, conventions, hotspots; then three questions (issues, constraints, rules) and the `/scope` line to type next |
| `takehome-init` | A brief arrives | A clean repo, ignore file, docs skeleton, AGENTS.md, ledger, the fence, the time plan |
| `scope` | After recon, with the issues, constraints and rules | One self-contained plan file per issue in `.claude/plan/` (`plan-template.md`), ranked by fix velocity, with acceptance cases, owned files, a diff budget and a Decisions table; `index.md` with the launch order; stops for approval. A take-home brief is one plan with a fence and time plan |
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
| `team` | `build [plans]`: one `builder` teammate per plan in its own worktree and branch, plus `qa`; `review [base]`: one lens per `reviewer` teammate; `hunt <symptom>`: competing hypotheses | Plan, teammate, worktree, branch, status, evidence and qa per row; the lead's own re-run; a verdict per plan. Needs the `teams` part (the switch, the audit log and the evidence hook), which `dropin.mjs` brings along |
