# agents

> Run the commands here in a terminal, inside your project's folder, unless a line says otherwise. `"$HOME/claude-toolkit"` is where you cloned the toolkit; `[square brackets]` are yours to replace.

Six agents, one file each; `builder` and `qa` are teammate roles for `/team build`. Into a checkout: `node "$HOME/claude-toolkit/dropin.mjs" add reviewer --repo .`, or by hand `mkdir -p [path to your project]/.claude/agents && cp "$HOME/claude-toolkit/modules/agents/reviewer.md" [path to your project]/.claude/agents/` and add the path to `.git/info/exclude`.

| Agent | Model | Tools | Does |
|---|---|---|---|
| `verifier` | sonnet | read-only + Bash | Runs the repo's checks for real and reports PASS or FAIL with exit codes and output; never fixes. Preloads the `check` skill, so `dropin.mjs` brings `check` along |
| `reviewer` | opus | read-only + Bash | Adversarial review of the diff, or one lens or one finding on request: correctness, bypasses, tests, security, idempotency, scope, concision, operability. CONFIRMED only with a reproducer it ran; SHIP or FIX FIRST. The refuter inside `/gate` |
| `test-writer` | inherit | read + edit + Bash | Failing tests first (table-driven, deterministic, mocks at boundaries), test files only, shows RED and reports which cases already pass |
| `breaker` | inherit | read + Bash + Write (outside the checkout) | Input-driven adversarial tester: mutated inputs through the real entrypoints, the hidden-test lens, grades the tests; CONFIRMED only with the output. Reads `edge-matrix.md` from the `break` skill, which `dropin.mjs` brings along |
| `builder` | inherit | read + edit + Bash | Teammate: builds one plan file from `.claude/plan/` inside its own worktree and branch; RED first, smallest fix at the cause, the repo's checks, a hand-off to `qa`, test-then-fix commits, a PR brief; edits only the files the plan owns |
| `qa` | inherit | read + edit (test files) + Bash | Teammate: re-runs each worktree's checks on GREEN, adversarial inputs through the real entrypoints, regression tests for confirmed gaps in that worktree's test files, grades the tests; PASS or GAPS per plan with evidence |

`reviewer` is pinned to `opus`; if that model is unavailable on the account, set `model: inherit` in the copied file.

With the `teams` part installed, the same files define teammate types: a teammate is an `Agent` call with a `name`, and `/team` spawns `builder`, `qa`, `reviewer`, `test-writer`, `breaker` and `verifier` teammates with the definition's tools and model. A preloaded skill (`verifier` and `check`) does not carry over to a teammate; the spawn prompt names the skill instead.
