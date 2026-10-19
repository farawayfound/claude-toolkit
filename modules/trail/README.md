# trail

> Run the commands here in a terminal, inside your project's folder, unless a line says otherwise. `~/claude-toolkit` is where you cloned the toolkit; `[square brackets]` are yours to replace.

In the `live` and `takehome` sets, and named explicitly otherwise (`all` skips it). A UserPromptSubmit hook that appends one JSON line per prompt (`ts`, `session_id`, `cwd`, redacted `prompt`) to `dev-toolkit-logs/trail.jsonl` in the repo's git dir, so nothing is written outside the checkout. It prints nothing, so it costs no context. Use it when the work will be written up afterwards: the decisions ledger (`/decide`) and the README's AI-use section can cite what was asked, in which order, against what the agent did.

In: `node ~/claude-toolkit/dropin.mjs add trail --repo .`. Out: `node ~/claude-toolkit/dropin.mjs remove trail --repo .`. The log file is never removed by the tool; read it from the main checkout with `tail .git/dev-toolkit-logs/trail.jsonl`. A clone or a push never carries it, but a zip of the whole folder does: delete `.git/dev-toolkit-logs/` before sending one.
