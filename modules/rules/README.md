# rules (repo-level)

Path-scoped guidance: each file has a `paths:` list in its frontmatter and loads only when a matching file is read. `tk-python`, `tk-typescript`, `tk-go` cover language conventions; `tk-data-safety` covers SQL, migrations and data-access code; `tk-tool-contracts` covers CLI, tool and connector code (stdout/stderr contract, exit codes, dry run, idempotency, timeouts, retries, audit line).

Into a checkout: `node dropin.mjs add rules --repo .` (all five), `add tk-python --repo .` (one), or `cp modules/rules/tk-python.md <repo>/.claude/rules/`. They are not placed in `~/.claude`.
