# claude-toolkit

Drop-in parts for Claude Code that turn an agent that edits files into a workflow that plans before it edits, proves before it claims, and leaves a record of who decided what. It was built for time-boxed work in repositories you did not write (a live session, a take-home, the first week on a team) and fits anywhere a confident wrong answer is expensive.

Everything is plain files: Markdown skills and agents, a few dependency-free Node hooks and shell scripts, two JSON catalogs. It applies to the checkout you install it into: nothing goes into `~/.claude`, your global settings or your editor's user settings, and the parallel scripts add only what you ask for beside the clone (`[repo].wt/` worktrees, a `[repo].code-workspace` file). The hooks and skills make no network calls and run nothing in the background; `wt-new` fetches from the repo's own remote and `wt-board` asks `gh` for PR state, both with a time cap where a `timeout` command exists, and only the optional laptop bootstrap installs software.

Commands are in [Quickstart.md](Quickstart.md). This file explains how the pieces fit and where the sharp edges are. [docs/](docs/) holds the playbooks and sample prompts, and each folder under `modules/` documents its own parts.

## Principles

1. **Claims carry evidence.** A result is a command and its exit code. A review finding is CONFIRMED only with a reproducer that was run, otherwise PLAUSIBLE. Anything that could not run is written as `not verified: [reason]`. A subagent's report is a claim until you re-run its decisive command.
2. **Roles are separate contexts.** Planning, writing tests, fixing, breaking, verifying and reviewing are different agents with different tool limits, so a reviewer never inherits the author's assumptions and read-only work can fan out in parallel on a cheaper model. The cost is tokens; the benefit is independence.
3. **The human decides, and it is written down.** Plans stop for approval. Questions come with a recommended default. Every decision becomes a ledger row attributed to you, to an agent default you accepted, or to an agent proposal you changed, so the write-up can say honestly who chose what.
4. **Safety is code, not instructions.** Destructive and secret-revealing commands are denied by a hook and by native permission rules, not by asking the model nicely. When the guard fires, the model is told to ask you to run the command, never to route around it.
5. **Small, reversible, invisible.** The smallest correct diff, a budget of about 200 lines, no new dependencies. Installs leave `git status` unchanged and come out byte for byte.

## The loop

```
recon / orient ─► scope (options, questions, cases, fence) ─► you approve
      ─► test-writer: RED ─► fix ─► check ─► break (breakers + mutation score) ─► fix with tests
      ─► gate (8 lenses + refuters) ─► deslop ─► tighten-docs ─► ship / pr-brief
                          every decision ─► decide (ledger)
```

Read-only stages (`recon`, `verifier`, `reviewer`, `breaker`) can run in parallel and in the background. Writers run one at a time, or in separate worktrees on disjoint files; several issues at once get one worktree, branch and session each through `parallel`. The live loop stops at `pr-brief`; the take-home loop adds `takehome-init` at the start and `ship` at the end. Two playbooks cover timing and what to say: [live](docs/live-playbook.md) and [take-home](docs/takehome-playbook.md).

## Parts

Thirty-one parts in a flat catalog (`modules/index.json`; running `node ~/claude-toolkit/dropin.mjs list` in a terminal prints it with what each needs). By role:

- **Orient and plan:** `recon` (four read-only agents at once), `orient` (the sequential version), `scope`, `decide`, `takehome-init`.
- **Several issues at once:** `parallel`, a skill that maps overlaps and launch order and checks PRs before merge, with scripts for you: `wt-new` (a worktree and branch per issue, each with this checkout's Claude config), `wtc` (a named plan-mode session per worktree), `wt-board`, `wt-conflicts` and `wt-workspace`.
- **Build and verify:** `repro-fix`, `check`, `access-control`, `perf-baseline`, with the agents `test-writer` and `verifier`.
- **Break and review:** `break` and its agent `breaker`, the `reviewer` agent, and `gate-workflow`, the eight-lens review that checks its own findings.
- **Trim and hand over:** `deslop`, `tighten-docs`, `ship`, `pr-brief`.
- **Guardrails:** `house-rules` (the CLAUDE.md block), `permissions`, `guard`, `facts`, and the opt-in hooks `gate` and `trail`.
- **Language and data rules,** loaded only when matching files are read: `tk-python`, `tk-typescript`, `tk-go`, `tk-data-safety`, `tk-tool-contracts`.

Sets in `modules/sets.json` are just named lists: `safety` (permissions and guard), `live` (the 60-minute loop, including `parallel`) and `takehome`. The built-in `repo` set adds facts, the rules, and the house rules, permissions and guard unless an opt-in user layer already has them; `all` is everything except the opt-in hooks; `default`, what `install.sh` and `install.ps1` place, is `all`, or `repo` on a machine where the opt-in user layer already provides the rest. A part's `requires` come along: `verifier` brings `check`, `breaker` brings `break`, `gate` brings `facts`.

## How placement works

Everything goes into the checkout you name. `dropin.mjs add [parts] --repo .`, or `install.sh` / `install.ps1` for every part, writes `[your project]/.claude/`, `CLAUDE.local.md` and `.claude/settings.local.json`, then lists every created path in `.git/info/exclude`; hook logs (`dev-toolkit-logs/`), the manifest and the settings backup live in the repo's git dir. Nothing is written to `~/.claude`, global settings or other repos, so the setup is invisible to teammates and to git, and `remove all --repo .` takes it out. Worktrees made with `wt-new` get a copy of the main checkout's files (their hooks point at the main checkout's, so remove worktrees before uninstalling) and lose it when the worktree is removed. Any single part also works when copied by hand: a skill folder into `.claude/skills/`, an agent file into `.claude/agents/`, a rule into `.claude/rules/` (create the folder first; Quickstart step 2 has the commands). A repo's own `CLAUDE.md`, `AGENTS.md`, CONTRIBUTING and CI override these rules, and the first line of the house rules says so.

The older user layer (`--user`, `install-global.ps1`) still works for anyone who types it; it writes `~/.claude` and installs plugins for every repo. Nothing in these docs needs it. With it installed, `install.sh` adds only what it lacks, so nothing loads twice (`--full` places every part anyway).

Ownership is by hash. The manifest records the SHA-256 of every file the tool wrote. A file is updated or removed only while its content is still that hash; one you edited is kept with a warning, and `--force` replaces it. Tracked files are never touched. Settings are merged, never replaced: an unparseable `settings.json` exits 2 untouched, a backup is taken once before the first change, and `remove` subtracts exactly what was added, restoring the backup bytes when nothing else changed. Re-running an install is byte-stable, so updating the toolkit is `git pull` and the same command again.

## Choices worth knowing about

- **The guard is a heuristic, not a sandbox.** It matches commands as text, including inside compound commands, and cannot see inside a script you tell it to run. It fails open on its own errors on purpose, because a broken safety hook that blocks all work gets switched off. Pair it with `permissions`, which hold even where hooks are disabled. The contract cases are in `setup/tests/hook-cases.json`; add a case with every rule you change.
- **The gate is opt-in.** A Stop hook that blocks wrongly costs minutes at the worst moment, so `gate` is never in a set. It counts only a test run whose exit code was observable, not one masked by a pipe, a `;` or a background job.
- **`/gate` costs agents.** Eight lenses plus one refuter per high or medium finding. It depends on Claude Code's workflows feature, which varies by plan; without it, ask the `reviewer` agent for one lens at a time.
- **The breaker is bounded.** Each family stops after three mutants find nothing, scratch work stays outside the checkout, and only CONFIRMED high findings block. `break/scripts/mutate.mjs` applies one operator at a time to a temporary copy of the tree and refuses a suite that never loads the file; it skips comments and strings, does not generate comparison mutants for TypeScript, and counts a mutant that no longer parses as killed. Treat the score as a pointer to missing tests, not a quality number.
- **`ship` runs only what looks like a runner.** It extracts commands from the README's run and test sections and executes `python`, `node`, `pytest`, `npm test`, `go test` and similar in a fresh clone with secret-named environment variables removed. Installs, pipelines and scripts are listed and left to `--cmd`.
- **Models are pinned in the agent files.** `reviewer` is opus and `verifier` is sonnet; set `model: inherit` if a plan lacks one. Saying "second model" is only true when `/model` differs from the reviewer's.
- **Parallel work stays per session.** `wtc` gives each session its name, plan mode, status line and bell through command-line flags and turns the IDE link off with one environment variable; `wt-workspace` puts the scripts on the PATH of one VS Code workspace's terminals. Nothing in `~/.claude`, `~/.claude.json` or the VS Code user settings changes. Review is the limit, not the number of sessions: every window passes the same gates, and `wt-conflicts` sees committed work only, so commit before review and before stacking.
- **Logs live in the repo's git dir.** The guard's decisions and the trail's prompts go to `.git/dev-toolkit-logs/`, so a clone or a push never carries them, but a zip of the whole folder does: delete that folder before sharing one.
- **Hooks and agents are cached per session.** Restart `claude` after installing or updating.
- **Windows first, POSIX fine.** Repo commands assume Git Bash so the allowlist and the guard see them. The laptop bootstrap is Windows-only; everything else is portable Node.

## Extending

A part is a folder under `modules/` plus an entry in `modules/index.json` (kind, one-line `what`, optional `requires`). Skills are one `SKILL.md` with reference files and scripts next to it and stay under 90 lines; agents under 40; the house rules under 60. Frontmatter keys are checked against an allowlist. The self-test enforces the contract: every catalog entry has its files, every file has an entry, every slash command the docs name exists, this README names every part and set, no payload file mentions a company or a person, and skill and agent counts match the catalog. Unit tests for the two scripts run with `node --test "setup/tests/*.test.mjs"` in a terminal inside the toolkit folder.

## License

Apache-2.0, see `LICENSE` and `NOTICE`. It is permissive like MIT and adds an explicit patent grant. Copying a skill or agent file into your own repository is fine; keep the license text with substantial copies and mark files you change.

## Layout

`modules/` parts, `index.json` and `sets.json` · `dropin.mjs` placement and removal · `install.sh` and `install.ps1` the per-repo shortcut (every part, or `--lean`) · `install-global.ps1` the opt-in user layer · `setup/` the Windows laptop path, the self-test and the unit tests · `docs/` playbooks and examples · `practice/live-cli` a small CLI with planted authorization, pagination and error-handling problems to rehearse on.
