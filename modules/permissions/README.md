# permissions

`settings.json`: Claude Code's native permission rules, no node and no hooks involved, so they also hold on a machine where hooks are off.

- allow: read-only `git` (status, diff, log, show, blame, rev-parse, ls-files, merge-base, branch --show-current, worktree list), `ls`, `wc`, `rg`, `set -o pipefail`, the usual test and lint runners (`npm test`, `pytest`, `uv run --frozen pytest`, `go test`, `make test`, ...), read-only `gh` views
- ask: `git push`, `gh pr create`, `gh pr merge`
- deny: `git push --force`/`-f`, `git reset --hard`, `git clean`, `rm -rf`/`-fr`, `printenv`, `gh auth token`, reading or editing `*.env`

Into a checkout: `node dropin.mjs add permissions --repo .` (merged into `.claude/settings.local.json`; existing rules are kept). For every repo: `--user` (merged into `~/.claude/settings.json`, backed up once). `remove` subtracts exactly these rules. The `guard` part covers much more (compound commands, `.env.*` variants, SQL, infra, supply chain) but needs node.
