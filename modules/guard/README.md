# guard

> Run the commands here in a terminal, inside your project's folder, unless a line says otherwise. `~/claude-toolkit` is where you cloned the toolkit; `[square brackets]` are yours to replace.

A PreToolUse hook for Bash, PowerShell, Read, Edit, Write, MultiEdit, NotebookEdit and Grep. `guard-rules.mjs` holds the rules (first match wins, anywhere in a compound command; read-only search segments such as `rg "git push --force" docs/` are skipped unless the rule is about leaking or executing):

- **deny**: force-push, remote branch delete, `--no-verify`, `reset --hard`, `git clean -f`, discard-all checkouts, stash drop, history rewrites, recursive deletes, destructive SQL (`DROP`, `TRUNCATE`, `DELETE` without `WHERE`), `terraform destroy`, `kubectl delete`, `helm uninstall`, cloud deletes, docker prune, publishing, pipe-to-shell, env dumps, echoing secret variables, token printing, touching secret files (`.env` and variants, keys, credentials, `.ssh`, `.aws`)
- **ask**: `git push`, `branch -D`, GitHub writes, dependency and lockfile changes, migrations, external HTTP writes, exec flags on search tools, infra changes, anything that names production, formatters in write mode, `uv run` without a lock

A denied call tells the model to ask the user to run the command by hand; it never works around the guard. Every decision is appended as one JSON line to `~/.claude/logs/guard.jsonl` (subject redacted). Fail-open: unreadable input or an internal error exits 0 silently, so a broken hook never blocks work.

- Into a checkout: `node ~/claude-toolkit/dropin.mjs add guard --repo .` (files under `.claude/hooks/tk/`, the hook registered in `.claude/settings.local.json` with an absolute path). For every repo on this machine, use `--user` instead of `--repo .` (run it anywhere).
- Test by hand: `echo '{"hook_event_name":"PreToolUse","tool_name":"Bash","tool_input":{"command":"git push --force"}}' | node .claude/hooks/tk/guard.mjs`
- Off: `"disableAllHooks": true` in `~/.claude/settings.json` and restart `claude`, or `node ~/claude-toolkit/dropin.mjs remove guard --repo .`. The contract cases live in `setup/tests/hook-cases.json`.
