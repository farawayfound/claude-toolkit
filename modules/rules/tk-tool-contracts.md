---
paths:
  - "**/{cli,cmd,bin,tools,tool,connectors,connector,integrations,commands,mcp}/**"
  - "**/{cli,tool,tools,connector,command,commands}.{py,ts,js,mjs,go}"
  - "**/*{_cli,-cli,Cli,_tool,-tool,Tool,_connector,-connector,Connector,_command,-command,Command}.{py,ts,js,mjs,go}"
---
# Tool and CLI contracts

Callers may be models or scripts, so the output format, exit codes and side effects are the interface.
Apply this to new commands; when editing an existing one, keep its current behaviour unless asked.

## Output
- stdout carries only data: JSON with `--json`, or whenever stdout is not a TTY. Logs and progress go to stderr.
- Errors are JSON on stderr: `{error, code, message, hint, retryable}`; `code` is stable and `hint` names the next step.
- Exit codes are documented: 0 ok, 1 general, 2 usage/validation, 3 authentication, 4 authorization, 5 upstream.
- A repo with an existing exit-code map keeps it.

## Writes
- Every write supports `--dry-run`, which prints the exact change and makes zero downstream calls.
- Read, write and delete stay separate commands or tools, so each can be approved on its own.
- Writes are idempotent (an idempotency key or natural-key upsert): the same input twice gives one effect.

## Calls and limits
- Commands never prompt when stdin is not a TTY; they fail with a usage error instead.
- Network calls default to a 30 s timeout.
- Retries: at most 3, exponential backoff with jitter, honoring Retry-After.
- A non-idempotent write without a key is never retried.
- Lists take `--limit` with a small default and return a `next` cursor.
- Output is bounded; truncation adds a marker and a hint on how to get more.

## Input, identity, audit
- Input is validated at the boundary; unknown fields are rejected.
- Secrets come from env or a secret store, never from flags, and are never echoed.
- Identity comes from the authenticated context; `on_behalf_of` is recorded separately.
- One structured log line per invocation: `{ts, correlation_id, actor, action, target, outcome, latency_ms}`.

## Change and test
- Changes are additive and backward compatible: new flags and fields, no renamed or removed ones.
- Contract tests per subcommand cover exit codes, JSON shape, dry-run making zero calls,
  a duplicate write giving one effect, and the timeout path.
