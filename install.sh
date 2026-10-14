#!/usr/bin/env bash
# install.sh - per-repo drop-in from Git Bash/POSIX: the `repo` set (facts, rules, and whatever ~/.claude lacks) through dropin.mjs.
# Usage, in a Git Bash terminal: bash ~/.claude/dev-toolkit/install.sh [--target DIR] [--gate] [--portable] [--dry-run] [--uninstall] [--force]
#   --gate adds the Stop gate; --portable adds every part into the repo (no user layer needed); --uninstall removes everything this tool placed.
#   One part at a time instead: node ~/.claude/dev-toolkit/dropin.mjs add <part> --repo .   (node dropin.mjs list)
# From PowerShell use install.ps1 (plain `bash` there can resolve to WSL), or: & "$env:ProgramFiles\Git\bin\bash.exe" "$HOME/.claude/dev-toolkit/install.sh"
# Exit: 0 ok, 1 failed/leaked, 2 usage/not a repo/refused, 3 node or git missing.
set -euo pipefail
command -v node >/dev/null || { echo 'node not found: run bootstrap first' >&2; exit 3; }
dir=.; parts=(add repo); flags=()
while [ $# -gt 0 ]; do
  case "$1" in
    --target) [ $# -ge 2 ] || { echo '--target needs a directory' >&2; exit 2; }; dir="$2"; shift 2 ;;
    --gate) parts+=(gate); shift ;;
    --portable) parts=(add all); shift ;;
    --uninstall) parts=(remove all); shift ;;
    --dry-run|--force) flags+=("$1"); shift ;;
    *) echo "unknown option: $1 (see the header of install.sh)" >&2; exit 2 ;;
  esac
done
exec node "$(cd "$(dirname "$0")" && pwd)/dropin.mjs" "${parts[@]}" --repo "$dir" ${flags[@]+"${flags[@]}"}
