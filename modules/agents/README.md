# agents

Four subagents, one file each. Into a checkout: `node dropin.mjs add reviewer --repo .` or `cp modules/agents/reviewer.md <repo>/.claude/agents/`. For every repo: `--user`.

| Agent | Model | Tools | Does |
|---|---|---|---|
| `verifier` | sonnet | read-only + Bash | Runs the repo's checks for real and reports PASS or FAIL with exit codes and output; never fixes. Preloads the `check` skill, so `dropin.mjs` brings `check` along |
| `reviewer` | opus | read-only + Bash | Adversarial review of the diff, or one lens or one finding on request: correctness, bypasses, tests, security, idempotency, scope, concision, operability. CONFIRMED only with a reproducer it ran; SHIP or FIX FIRST. The refuter inside `/gate` |
| `test-writer` | inherit | read + edit + Bash | Failing tests first (table-driven, deterministic, mocks at boundaries), test files only, shows RED and reports which cases already pass |
| `breaker` | inherit | read + Bash + Write (outside the checkout) | Input-driven adversarial tester: mutated inputs through the real entrypoints, the hidden-test lens, grades the tests; CONFIRMED only with the output. Reads `edge-matrix.md` from the `break` skill, which `dropin.mjs` brings along |

`reviewer` is pinned to `opus`; if that model is unavailable on the account, set `model: inherit` in the copied file.
