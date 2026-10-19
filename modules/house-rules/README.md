# house-rules

> Run the commands here in a terminal, inside your project's folder, unless a line says otherwise. `~/claude-toolkit` is where you cloned the toolkit; `[square brackets]` are yours to replace.

One file, `CLAUDE.md`: the working loop (read, plan, failing test, smallest diff, checks with real output, review, PR text), code and error conventions, access control, secrets, shared systems, git, environment, communication, and what "done" means. It names the skills and agents as optional steps, so it reads fine without them.

- Into a checkout: `node ~/claude-toolkit/dropin.mjs add house-rules --repo .` (a marker block at the top of `CLAUDE.local.md`, excluded from git), or `cat ~/claude-toolkit/modules/house-rules/CLAUDE.md >> CLAUDE.local.md`.
- The repository's own CLAUDE.md, AGENTS.md, CONTRIBUTING and CI override it; the first line says so.
