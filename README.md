# claude-toolkit

Drop-in parts for Claude Code that turn an agent that edits files into a workflow that plans before it edits, proves before it claims, and leaves a record of who decided what. It was built for time-boxed work in repositories you did not write (a live session, a take-home, the first week on a team) and fits anywhere a confident wrong answer is expensive.

Everything is plain files: Markdown skills and agents, a few dependency-free Node hooks and shell scripts, two JSON catalogs. It applies to the checkout you install it into: nothing goes into `~/.claude`, your global settings or your editor's user settings, and the parallel scripts add only what you ask for beside the clone (`[repo].wt/` worktrees, a `[repo].code-workspace` file). The hooks and skills make no network calls and run nothing in the background; `wt-new` fetches from the repo's own remote and `wt-board` asks `gh` for PR state, both with a time cap where a `timeout` command exists, and only the optional laptop bootstrap installs software.

Commands are in [Quickstart.md](Quickstart.md). This file explains how the pieces fit and where the sharp edges are. [docs/](docs/) holds the playbooks and sample prompts, and each folder under `modules/` documents its own parts.

## Principles

1. **Claims carry evidence.** A result is a command and its exit code. A review finding is CONFIRMED only with a reproducer that was run, otherwise PLAUSIBLE. Anything that could not run is written as `not verified: [reason]`. A subagent's or teammate's report is a claim until you re-run its decisive command.
2. **Roles are separate contexts.** Planning, writing tests, fixing, breaking, verifying and reviewing are different agents with different tool limits, so a reviewer never inherits the author's assumptions and read-only work can fan out in parallel on a cheaper model. The cost is tokens; the benefit is independence.
3. **The human decides, and it is written down.** Plans stop for approval. Questions come with a recommended default. Every decision becomes a ledger row attributed to you, to an agent default you accepted, or to an agent proposal you changed, so the write-up can say honestly who chose what.
4. **Safety is code, not instructions.** Destructive and secret-revealing commands are denied by a hook and by native permission rules, not by asking the model nicely. When the guard fires, the model is told to ask you to run the command, never to route around it. A teammate cannot mark a task done without evidence for the same reason.
5. **Small, reversible, invisible.** The smallest correct diff, a budget of about 200 lines, no new dependencies. Installs leave `git status` unchanged and come out byte for byte.

## The loop

```
recon ─► scope (options, questions, cases, fence) ─► you approve
      ─► test-writer: RED ─► fix ─► check ─► review (reviewer, or team review; break + gate when installed)
      ─► pr-brief, or deslop ─► tighten-docs ─► ship          every decision ─► decide (ledger)
```

Read-only stages (`recon`, `verifier`, `reviewer`, `breaker`) run in parallel and in the background. Writers run one at a time, or in separate worktrees on disjoint files; several issues at once get one worktree, branch and session each through `parallel`, and a review, a disjoint-file build or a bug hunt can run as an agent team through `team`. Two playbooks cover timing and what to say: [live](docs/live-playbook.md) and [take-home](docs/takehome-playbook.md).

## Sets

The installer asks which set to place. Each is a named list in `modules/sets.json`, and every one carries the guardrails (`house-rules`, `permissions`, `guard`), the `facts` block, the path rules and the agent-teams switch with its `team` skill.

| Set | For | Adds |
|---|---|---|
| `live` | A 60 to 90 minute session on someone else's code: collaboration, visible evidence, a record afterwards | `recon`, `scope`, `decide`, `repro-fix`, `check`, `pr-brief`; the agents `test-writer`, `verifier`, `reviewer`; the `trail` prompt log |
| `takehome` | A timed challenge of 90 minutes to 3 hours, where the repository is the product | `recon`, `takehome-init`, `scope`, `decide`, `check`, `break`, `deslop`, `tighten-docs`, `ship`; all four agents; `trail` |
| `unbound` | Work with no clock: the general-purpose set | `live` plus `access-control`, `perf-baseline`, `break`, `deslop`, `tighten-docs`, `parallel`, the `breaker` agent and the `gate-workflow` review, minus `trail` |
| `full` | Every part except the opt-in Stop gate | `unbound` plus `takehome-init`, `ship` and `trail` |

`safety` (permissions and guard) and the built-in `repo` set (facts, rules, and the guardrails unless the opt-in user layer already has them) stay available by name; `all` is every part that is not opt-in, and `default` is `all`, or `repo` on a machine where the opt-in user layer provides the rest. A part's `requires` come along: `verifier` brings `check`, `breaker` brings `break`, `gate` brings `facts`, `team` brings `teams`. The live set leaves out `break`, `gate-workflow` and `parallel` on purpose: with an hour on the clock, the `reviewer` agent with one lens per probe, or `/team review`, is the review, and `node ~/claude-toolkit/dropin.mjs add break gate-workflow --repo .` adds the rest for a longer slot.

## Parts

Thirty-two parts in a flat catalog (`modules/index.json`; `node ~/claude-toolkit/dropin.mjs list` prints it with what each needs). By role:

- **Orient and plan:** `recon` (four read-only passes, as parallel agents or in sequence), `scope`, `decide`, `takehome-init`.
- **Several issues at once:** `parallel`, a skill that maps overlaps and launch order and checks PRs before merge, with scripts for you: `wt-new` (a worktree and branch per issue, each with this checkout's Claude config), `wtc` (a named plan-mode session per worktree), `wt-board`, `wt-conflicts` and `wt-workspace`.
- **Agent teams:** `teams` (the experimental switch, an audit log of tasks and idle teammates in the repo's git dir, and a hook that refuses a task completion without evidence) and `team`, the skill that runs a review, a disjoint-file build or a competing-hypotheses hunt as named teammates spawned from the toolkit's own agents.
- **Build and verify:** `repro-fix`, `check`, `access-control`, `perf-baseline`, with the agents `test-writer` and `verifier`.
- **Break and review:** `break` and its agent `breaker`, the `reviewer` agent, and `gate-workflow`, the eight-lens review that checks its own findings.
- **Trim and hand over:** `deslop`, `tighten-docs`, `ship`, `pr-brief`.
- **Guardrails and records:** `house-rules` (the CLAUDE.md block), `permissions`, `guard`, `facts`, the `trail` prompt log, and the opt-in `gate` hook.
- **Language and data rules,** loaded only when matching files are read: `tk-python`, `tk-typescript`, `tk-go`, `tk-data-safety`, `tk-tool-contracts`.

## How placement works

Everything goes into the checkout you name. `dropin.mjs add [parts] --repo .`, or `install.sh` / `install.cmd` for a set, writes `[your project]/.claude/`, `CLAUDE.local.md` and `.claude/settings.local.json`, then lists every created path in `.git/info/exclude`; hook logs (`dev-toolkit-logs/`), the manifest and the settings backup live in the repo's git dir. Nothing is written to `~/.claude`, global settings or other repos, so the setup is invisible to teammates and to git, and `remove all --repo .` takes it out. Worktrees made with `wt-new` get a copy of the main checkout's files (their hooks point at the main checkout's, so remove worktrees before uninstalling) and lose it when the worktree is removed. Any single part also works when copied by hand: a skill folder into `.claude/skills/`, an agent file into `.claude/agents/`, a rule into `.claude/rules/` (create the folder first; Quickstart step 2 has the commands). A repo's own `CLAUDE.md`, `AGENTS.md`, CONTRIBUTING and CI override these rules, and the first line of the house rules says so.

The older user layer (`--user`, `install-global.ps1`) still works for anyone who types it; it writes `~/.claude` and installs plugins for every repo. Nothing in these docs needs it. With it installed, every set adds only what it lacks, so nothing loads twice (`dropin.mjs add all --repo .` places every part anyway).

Ownership is by hash. The manifest records the SHA-256 of every file the tool wrote. A file is updated or removed only while its content is still that hash; one you edited is kept with a warning, and `--force` replaces it. Tracked files are never touched. Settings are merged, never replaced: an unparseable `settings.json` exits 2 untouched, a backup is taken once before the first change, and `remove` subtracts exactly what was added (permission rules, hook entries, `env` keys), restoring the backup bytes when nothing else changed. Re-running an install is byte-stable, so updating the toolkit is `git pull` and the same command again.

## Choices worth knowing about

- **The guard is a heuristic, not a sandbox.** It matches commands as text, including inside compound commands, and cannot see inside a script you tell it to run. It fails open on its own errors on purpose, because a broken safety hook that blocks all work gets switched off. Pair it with `permissions`, which hold even where hooks are disabled. The contract cases are in `setup/tests/hook-cases.json`; add a case with every rule you change.
- **The gate is opt-in.** A Stop hook that blocks wrongly costs minutes at the worst moment, so `gate` is never in a set. It counts only a test run whose exit code was observable, not one masked by a pipe, a `;` or a background job.
- **Agent teams are experimental, and the switch has a side effect.** With `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`, any subagent the model names launches as a teammate, a full session with its own context and cost. The house rules keep fan-out reads unnamed, `/team` is the only place that names them, and the kill switch is the same key set to `0` in `.claude/settings.local.json`, which applies without a restart. Split panes need tmux or iTerm2 and do not work in VS Code's terminal or Windows Terminal; the default in-process mode works everywhere. `/resume` does not bring teammates back. The `TaskCompleted` hook fails open on its own errors like the guard and refuses only a teammate's completion whose task text has no command with an exit code, no `file:line` and no `not verified:`.
- **`/gate` costs agents.** Eight lenses plus one refuter per high or medium finding. It depends on Claude Code's workflows feature, which varies by plan; without it, ask the `reviewer` agent for one lens at a time, or `/team review`.
- **The breaker is bounded.** Each family stops after three mutants find nothing, scratch work stays outside the checkout, and only CONFIRMED high findings block. `break/scripts/mutate.mjs` applies one operator at a time to a temporary copy of the tree and refuses a suite that never loads the file; it skips comments and strings, does not generate comparison mutants for TypeScript, and counts a mutant that no longer parses as killed. Treat the score as a pointer to missing tests, not a quality number.
- **`ship` runs only what looks like a runner.** It extracts commands from the README's run and test sections and executes `python`, `node`, `pytest`, `npm test`, `go test` and similar in a fresh clone with secret-named environment variables removed. Installs, pipelines and scripts are listed and left to `--cmd`.
- **Models are pinned in the agent files.** `reviewer` is opus and `verifier` is sonnet; set `model: inherit` if a plan lacks one. Saying "second model" is only true when `/model` differs from the reviewer's. A teammate spawned from an agent file keeps its model unless the spawn prompt names one.
- **Parallel work stays per session.** `wtc` gives each session its name, plan mode, status line and bell through command-line flags and turns the IDE link off with one environment variable; `wt-workspace` puts the scripts on the PATH of one VS Code workspace's terminals. Nothing in `~/.claude`, `~/.claude.json` or the VS Code user settings changes. Review is the limit, not the number of sessions: every window passes the same gates, and `wt-conflicts` sees committed work only, so commit before review and before stacking.
- **Logs live in the repo's git dir.** The guard's decisions, the trail's prompts and the team's task events go to `.git/dev-toolkit-logs/`, so a clone or a push never carries them, but a zip of the whole folder does: delete that folder before sharing one.
- **Hooks and agents are cached per session.** Restart `claude` after installing or updating.
- **Windows first, POSIX fine.** Repo commands assume Git Bash so the allowlist and the guard see them. From PowerShell, run `install.cmd`, never a bare `bash`: Windows resolves that to WSL. The laptop bootstrap is Windows-only; everything else is portable Node.

## Extending

A part is a folder under `modules/` plus an entry in `modules/index.json` (kind, one-line `what`, optional `requires`). Skills are one `SKILL.md` with reference files and scripts next to it and stay under 90 lines; agents under 40; the house rules under 60. Frontmatter keys are checked against an allowlist. The self-test enforces the contract: every catalog entry has its files, every file has an entry, every slash command the docs name exists, this README names every part and set, every set dry-runs, no payload file mentions a company or a person, and skill and agent counts match the catalog. Unit tests for the two scripts run with `node --test "setup/tests/*.test.mjs"` in a terminal inside the toolkit folder.

## License

Apache-2.0, see `LICENSE` and `NOTICE`. It is permissive like MIT and adds an explicit patent grant. Copying a skill or agent file into your own repository is fine; keep the license text with substantial copies and mark files you change.

## Layout

`modules/` parts, `index.json` and `sets.json` · `dropin.mjs` placement and removal · `install.sh`, `install.ps1` and `install.cmd` the per-repo shortcut (asks which set) · `install-global.ps1` the opt-in user layer · `setup/` the Windows laptop path, the self-test and the unit tests · `docs/` playbooks and examples · `practice/live-cli` a small CLI with planted authorization, pagination and error-handling problems to rehearse on.
