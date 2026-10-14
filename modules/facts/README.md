# facts

`detect.mjs` reads a checkout (never spawns, installs or opens secrets) and reports the stack, package manager, test/lint/typecheck/format commands with their source (Makefile targets, package scripts, CI, stack defaults), CI workflow files, compose services, `.env.example`, conventions files and subprojects. `facts.mjs` renders that as the facts block for `CLAUDE.local.md`.

- Print only: `node modules/facts/facts.mjs <repo>` or `node dropin.mjs facts <repo>`; JSON: `node modules/facts/detect.mjs <repo>`.
- Into a checkout: `node dropin.mjs add facts --repo .` writes the block at the top of `CLAUDE.local.md` (your own notes below it are kept), copies `detect.mjs` to `.claude/hooks/tk/` so `/orient` and `/check` can re-run it, and allow-lists the detected commands (`Bash(<cmd>:*)`) in `.claude/settings.local.json`.
- For every repo: `--user` places only `detect.mjs` under `~/.claude/hooks/`.
- Confirm the commands against CI before relying on them; the block says which ones CI runs.
