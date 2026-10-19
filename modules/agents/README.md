# agents

> Run the commands here in a terminal, inside your project's folder, unless a line says otherwise. `~/claude-toolkit` is where you cloned the toolkit; `[square brackets]` are yours to replace.

Four subagents, one file each. Into a checkout: `node ~/claude-toolkit/dropin.mjs add reviewer --repo .`, or by hand `mkdir -p [path to your project]/.claude/agents && cp ~/claude-toolkit/modules/agents/reviewer.md [path to your project]/.claude/agents/` and add the path to `.git/info/exclude`.

| Agent | Model | Tools | Does |
|---|---|---|---|
| `verifier` | sonnet | read-only + Bash | Runs the repo's checks for real and reports PASS or FAIL with exit codes and output; never fixes. Preloads the `check` skill, so `dropin.mjs` brings `check` along |
| `reviewer` | opus | read-only + Bash | Adversarial review of the diff, or one lens or one finding on request: correctness, bypasses, tests, security, idempotency, scope, concision, operability. CONFIRMED only with a reproducer it ran; SHIP or FIX FIRST. The refuter inside `/gate` |
| `test-writer` | inherit | read + edit + Bash | Failing tests first (table-driven, deterministic, mocks at boundaries), test files only, shows RED and reports which cases already pass |
| `breaker` | inherit | read + Bash + Write (outside the checkout) | Input-driven adversarial tester: mutated inputs through the real entrypoints, the hidden-test lens, grades the tests; CONFIRMED only with the output. Reads `edge-matrix.md` from the `break` skill, which `dropin.mjs` brings along |

`reviewer` is pinned to `opus`; if that model is unavailable on the account, set `model: inherit` in the copied file.

With the `teams` part installed, the same files define teammate types: `/team` spawns `reviewer`, `test-writer`, `breaker` and `verifier` teammates, which keep the definition's tools and model. A preloaded skill (`verifier` and `check`) does not carry over to a teammate; the spawn prompt names the skill instead.
