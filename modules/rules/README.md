# rules (repo-level)

> Run the commands here in a terminal, inside your project's folder, unless a line says otherwise. `~/claude-toolkit` is where you cloned the toolkit; `[square brackets]` are yours to replace.

Path-scoped guidance: each file has a `paths:` list in its frontmatter and loads only when a matching file is read. `tk-python`, `tk-typescript`, `tk-go` cover language conventions; `tk-data-safety` covers SQL, migrations and data-access code; `tk-tool-contracts` covers CLI, tool and connector code (stdout/stderr contract, exit codes, dry run, idempotency, timeouts, retries, audit line).

Into a checkout: `node ~/claude-toolkit/dropin.mjs add rules --repo .` (all five), `add tk-python --repo .` (one), or `cp ~/claude-toolkit/modules/rules/tk-python.md [path to your project]/.claude/rules/`. They are not placed in `~/.claude`.
