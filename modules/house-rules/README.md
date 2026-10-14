# house-rules

One file, `CLAUDE.md`: the working loop (read, plan, failing test, smallest diff, checks with real output, review, PR text), code and error conventions, access control, secrets, shared systems, git, environment, communication, and what "done" means. It names the skills and agents as optional steps, so it reads fine without them.

- Into a checkout: `node dropin.mjs add house-rules --repo .` (a marker block at the top of `CLAUDE.local.md`, excluded from git), or `cat modules/house-rules/CLAUDE.md >> CLAUDE.local.md`.
- For every repo: `node dropin.mjs add house-rules --user` (a marker block at the end of `~/.claude/CLAUDE.md`).
- The repository's own CLAUDE.md, AGENTS.md, CONTRIBUTING and CI override it; the first line says so.
