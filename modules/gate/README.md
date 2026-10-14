# gate (opt-in)

> Run the commands here in a terminal, inside your project's folder, unless a line says otherwise. `~/claude-toolkit` is where you cloned the toolkit; `[square brackets]` are yours to replace.

A verification gate on four events (SessionStart, PostToolUse and PostToolUseFailure for Bash, Stop). It fingerprints non-doc changes since the session started and, at Stop, blocks once when code changed and no passing test run has been seen for that exact state. A check only counts when a shell segment starts with it (`pytest`, `npm test`, `go test`, `make test`, ...) and its exit code is observable (not masked by `;`, a bare pipe, or a background run). Fail-open; the ledger lives in the OS temp dir, per session.

Needs `facts` (`detect.mjs`, for the repo's test command); `dropin.mjs` brings it along.

- Into a checkout: `node ~/claude-toolkit/dropin.mjs add gate --repo .` (or `bash ~/claude-toolkit/install.sh --gate`). Never part of the user layer by default; `add gate --user` registers it everywhere on purpose.
- Off for one repo: `touch "$(git rev-parse --git-path dev-toolkit-gate-off)"` or start the session with `TK_GATE=off claude`. Out: `node ~/claude-toolkit/dropin.mjs remove gate --repo .`.
- When it nags: run the test command as the last step of the command and show the output, or write `not verified: [reason]`.
