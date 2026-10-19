# facts

> Run the commands here in a terminal, inside your project's folder, unless a line says otherwise. `~/claude-toolkit` is where you cloned the toolkit; `[square brackets]` are yours to replace.

`detect.mjs` reads a checkout (never spawns, installs or opens secrets) and reports the stack, package manager, test/lint/typecheck/format commands with their source (Makefile targets, package scripts, CI, stack defaults), CI workflow files, compose services, `.env.example`, conventions files and subprojects. `facts.mjs` renders that as the facts block for `CLAUDE.local.md`.

- Print only: `node ~/claude-toolkit/modules/facts/facts.mjs [path to your project]` or `node ~/claude-toolkit/dropin.mjs facts [path to your project]`; JSON: `node ~/claude-toolkit/modules/facts/detect.mjs [path to your project]`.
- Into a checkout: `node ~/claude-toolkit/dropin.mjs add facts --repo .` writes the block at the top of `CLAUDE.local.md` (your own notes below it are kept), copies `detect.mjs` to `.claude/hooks/tk/` so `/orient` and `/check` can re-run it, and allow-lists the detected commands (`Bash(<cmd>:*)`) in `.claude/settings.local.json`.
- Confirm the commands against CI before relying on them; the block says which ones CI runs.
