# trail (opt-in hook)

A UserPromptSubmit hook that appends one JSON line per prompt (`ts`, `session_id`, `cwd`, redacted `prompt`) to `~/.claude/logs/trail.jsonl`. It prints nothing, so it costs no context. Use it when the work will be written up afterwards: the decisions ledger (`/decide`) and the README's AI-use section can cite what was asked, in which order, against what the agent did.

In: `node dropin.mjs add trail --user` (or `--repo .`). Out: `remove trail`. The log file is never removed by the tool.
