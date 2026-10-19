#!/usr/bin/env bash
# install.sh - per-repo drop-in from Git Bash/POSIX through dropin.mjs: the toolkit into this checkout only (git never sees it).
# Usage, in a Git Bash terminal: bash ~/claude-toolkit/install.sh [--target DIR] [--gate] [--full|--lean] [--dry-run] [--uninstall] [--force]
#   Default (the `default` set): every part except the opt-in hooks, under the repo's .claude/ and CLAUDE.local.md; nothing outside
#   the checkout. On a machine with the opt-in ~/.claude user layer it adds only what that layer lacks, so nothing loads twice.
#   --full places every part even then (--portable is the same, kept for old commands); --lean always adds only the repo set;
#   --gate adds the Stop gate; --uninstall removes everything this tool placed.
#   One part at a time instead: node ~/claude-toolkit/dropin.mjs add <part> --repo .   (node dropin.mjs list)
# From PowerShell use install.ps1 (plain `bash` there can resolve to WSL), or: & "$env:ProgramFiles\Git\bin\bash.exe" "$HOME/claude-toolkit/install.sh"
# Exit: 0 ok, 1 failed/leaked, 2 usage/not a repo/refused, 3 node or git missing.
set -euo pipefail
command -v node >/dev/null || { echo 'node not found: run bootstrap first' >&2; exit 3; }
dir=.; parts=(add default); flags=()
while [ $# -gt 0 ]; do
  case "$1" in
    --target) [ $# -ge 2 ] || { echo '--target needs a directory' >&2; exit 2; }; dir="$2"; shift 2 ;;
    --gate) parts+=(gate); shift ;;
    --full|--portable) parts[1]=all; shift ;;
    --lean) parts[1]=repo; shift ;;
    --uninstall) parts=(remove all); shift ;;
    --dry-run|--force) flags+=("$1"); shift ;;
    *) echo "unknown option: $1 (see the header of install.sh)" >&2; exit 2 ;;
  esac
done
exec node "$(cd "$(dirname "$0")" && pwd)/dropin.mjs" "${parts[@]}" --repo "$dir" ${flags[@]+"${flags[@]}"}
