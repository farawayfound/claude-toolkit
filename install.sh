#!/usr/bin/env bash
# install.sh - per-repo drop-in from Git Bash/POSIX through dropin.mjs: one set of the toolkit into this checkout only (git never sees it).
# Usage, in a Git Bash terminal: bash ~/claude-toolkit/install.sh [--set full|live|takehome|unbound] [--target DIR] [--gate] [--dry-run] [--force] [--uninstall]
#   Without --set it asks which set to place (Enter = full); when stdin is not a terminal it places full.
#     full      every part except the opt-in Stop gate (on a machine with the opt-in ~/.claude user layer: only what that layer lacks)
#     live      a 60-90 minute session on someone else's code: recon, scope, decide, repro-fix, check, pr-brief, team; test-writer, verifier, reviewer; trail
#     takehome  a timed challenge, 90 minutes to 3 hours: recon, takehome-init, scope, decide, check, break, deslop, tighten-docs, ship, team; four agents; trail
#     unbound   no time limit: live plus access-control, perf-baseline, break, deslop, tighten-docs, parallel, breaker and the /gate review; no trail
#   Every set carries the house rules, permissions, guard, facts, the path rules and the agent-teams switch. Any other set or part name works too
#   (node ~/claude-toolkit/dropin.mjs list): --set repo places only the base; --gate adds the opt-in Stop gate; --uninstall removes everything this
#   tool placed; re-running with another set only adds.
# From PowerShell use ~\claude-toolkit\install.cmd (a plain `bash` there resolves to WSL, which has no bash to run).
# Exit: 0 ok, 1 failed/leaked, 2 usage/not a repo/refused, 3 node or git missing.
set -euo pipefail
command -v node >/dev/null || { echo 'node not found: run bootstrap first' >&2; exit 3; }
dir=.; chosen=''; extra=(); flags=(); uninstall=''
while [ $# -gt 0 ]; do
  case "$1" in
    --target) [ $# -ge 2 ] || { echo '--target needs a directory' >&2; exit 2; }; dir="$2"; shift 2 ;;
    --set) [ $# -ge 2 ] || { echo '--set needs a name: full, live, takehome, unbound, or any set or part' >&2; exit 2; }; chosen="$2"; shift 2 ;;
    --gate) extra+=(gate); shift ;;
    --uninstall) uninstall=1; shift ;;
    --dry-run|--force) flags+=("$1"); shift ;;
    *) echo "unknown option: $1 (see the header of install.sh)" >&2; exit 2 ;;
  esac
done
tk="$(cd "$(dirname "$0")" && pwd)"
if [ -n "$uninstall" ]; then exec node "$tk/dropin.mjs" remove all --repo "$dir" ${flags[@]+"${flags[@]}"}; fi
if [ -z "$chosen" ]; then
  chosen=full
  if [ -t 0 ]; then
    echo 'Which set?'
    echo '  1  full      every part except the opt-in Stop gate'
    echo "  2  live      60-90 minute session on someone else's code: recon, scope, decide, repro-fix, check, pr-brief, team; three agents; prompt log"
    echo '  3  takehome  timed challenge, 90 minutes to 3 hours: takehome-init, scope, decide, check, break, deslop, tighten-docs, ship, team; four agents; prompt log'
    echo '  4  unbound   no time limit: everything general-purpose, including parallel and the /gate review'
    printf 'Choose [1-4, Enter = 1]: '
    read -r answer || answer=''
    case "${answer// /}" in
      ''|1|full) chosen=full ;; 2|live) chosen=live ;; 3|takehome) chosen=takehome ;; 4|unbound) chosen=unbound ;;
      *) echo "unknown set: $answer (1-4, or a name from node dropin.mjs list)" >&2; exit 2 ;;
    esac
  fi
fi
exec node "$tk/dropin.mjs" add "$chosen" ${extra[@]+"${extra[@]}"} --repo "$dir" ${flags[@]+"${flags[@]}"}
