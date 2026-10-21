#!/usr/bin/env bash
# tmux.sh - split-pane agent teams on Linux, macOS and WSL: tmux, git, Node 18+, Claude Code, this toolkit at $HOME/claude-toolkit,
# ~/.tmux.conf (from setup/tmux/tmux.conf) and teammateMode "auto" in ~/.claude/settings.json (panes inside tmux, in-process elsewhere). Idempotent: present pieces are skipped
# and nothing of yours is overwritten (an existing ~/.tmux.conf gets one source-file line; settings.json gets one key, backed up first).
#   bash "$HOME/claude-toolkit/setup/tmux.sh" [--check] [--dry-run]
# Windows: tmux.cmd instead (psmux, native). Package managers: apt-get, dnf, pacman, brew; sudo asks for your password once.
# Exit: 0 ready, 1 something is still missing (the table says what), 2 usage.
set -uo pipefail
CHECK=0 DRY=0
for a in "$@"; do case "$a" in
  --check|-check|-Check) CHECK=1 ;; --dry-run|-dry-run|-DryRun|--whatif|-WhatIf) DRY=1 ;;
  -h|--help|-help|-\?) sed -n '2,7p' "$0"; exit 0 ;; *) echo "unknown flag $a (see --help)" >&2; exit 2 ;; esac; done
here=$(cd "$(dirname "$0")" && pwd); TK=$(dirname "$here")
say() { printf '==> %s\n' "$*"; }
run() { if [ $DRY = 1 ]; then printf 'would run: %s\n' "$*"; else "$@"; fi; }
have() { command -v "$1" >/dev/null 2>&1; }
SUDO=""; if [ "$(id -u)" != 0 ] && have sudo; then SUDO=sudo; fi
pkg() { # install packages with whatever manager this system has
  if have apt-get; then run $SUDO apt-get install -y -q "$@"
  elif have dnf; then run $SUDO dnf install -y -q "$@"
  elif have pacman; then run $SUDO pacman -S --noconfirm --needed "$@"
  elif have brew; then run brew install "$@"
  else echo "no package manager found (apt-get, dnf, pacman, brew): install $* yourself" >&2; return 1; fi
}
node_ok() { have node && node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 18 ? 0 : 1)' 2>/dev/null; }

if [ $CHECK = 0 ]; then
  if have apt-get && [ $DRY = 0 ] && ! have tmux; then $SUDO apt-get update -q >/dev/null 2>&1 || true; fi
  have tmux || { say 'tmux'; pkg tmux; }
  have git || { say 'git'; pkg git; }
  have curl || { say 'curl'; pkg curl; }
  if ! node_ok; then say 'Node.js (distro package)'; if have brew; then pkg node; else pkg nodejs npm; fi; fi
  if ! have claude && [ ! -x "$HOME/.local/bin/claude" ]; then
    say 'Claude Code (native installer)'; run bash -c 'curl -fsSL https://claude.ai/install.sh | bash'
    for rc in "$HOME/.bashrc" "$HOME/.zshrc"; do
      if [ -f "$rc" ] && ! grep -q '\.local/bin' "$rc" && [ $DRY = 0 ]; then printf '\nexport PATH="$HOME/.local/bin:$PATH"\n' >> "$rc"; fi
    done
  fi
  export PATH="$HOME/.local/bin:$PATH"
  if [ ! -e "$HOME/claude-toolkit" ] && [ "$TK" != "$HOME/claude-toolkit" ]; then
    say "toolkit clone -> $HOME/claude-toolkit (so the install line is the same here)"
    run git clone -q https://github.com/farawayfound/claude-toolkit.git "$HOME/claude-toolkit"
  fi
  conf="$HOME/claude-toolkit/setup/tmux/tmux.conf"; [ -f "$conf" ] || conf="$here/tmux/tmux.conf"
  if [ ! -f "$HOME/.tmux.conf" ]; then say "~/.tmux.conf <- $conf"; run cp "$conf" "$HOME/.tmux.conf"
  elif ! grep -q 'claude-toolkit' "$HOME/.tmux.conf"; then
    say "~/.tmux.conf: appending source-file $conf"
    [ $DRY = 1 ] || printf '\n# claude-toolkit: agent-team panes\nsource-file %s\n' "$conf" >> "$HOME/.tmux.conf"
  fi
  if node_ok; then
    say 'teammateMode "auto" in ~/.claude/settings.json'; [ $DRY = 0 ] || echo 'would set teammateMode'
    [ $DRY = 1 ] || node -e '
      const fs = require("fs"), p = require("path"), f = p.join(process.env.HOME, ".claude", "settings.json");
      fs.mkdirSync(p.dirname(f), { recursive: true }); let s = {};
      if (fs.existsSync(f)) { try { s = JSON.parse(fs.readFileSync(f, "utf8")); } catch (e) { console.error("settings.json is not valid JSON; left untouched: " + e.message); process.exit(1); } }
      if (s.teammateMode) process.exit(0);
      if (fs.existsSync(f)) fs.copyFileSync(f, f + ".bak-tmux");
      s.teammateMode = "auto"; fs.writeFileSync(f, JSON.stringify(s, null, 2) + "\n");'
  fi
fi

# status table; MISSING and OLD rows make the exit code 1, TODO rows do not
export PATH="$HOME/.local/bin:$PATH"; miss=0
row() { printf '%-13s %-8s %s\n' "$1" "$2" "$3"; case "$2" in MISSING|OLD) miss=1 ;; esac; }
for t in tmux git claude; do
  if have "$t"; then row "$t" OK "$("$t" --version 2>/dev/null | head -1 | tr -d '\r')"; else row "$t" MISSING "re-run this script, then open a new terminal"; fi
done
if node_ok; then row node OK "$(node --version)"
elif have node; then row node OLD "$(node --version): need 18 or later; apt: curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt-get install -y nodejs"
else row node MISSING "re-run this script"; fi
if [ -f "$HOME/claude-toolkit/install.mjs" ]; then row toolkit OK "$HOME/claude-toolkit"; else row toolkit MISSING 'git clone https://github.com/farawayfound/claude-toolkit.git "$HOME/claude-toolkit"'; fi
if grep -qs 'claude-toolkit' "$HOME/.tmux.conf"; then row tmux.conf OK "$HOME/.tmux.conf"; else row tmux.conf MISSING "source-file $TK/setup/tmux/tmux.conf in ~/.tmux.conf"; fi
if grep -qs '"teammateMode": *"\(auto\|tmux\)"' "$HOME/.claude/settings.json"; then row teammateMode OK "$(grep -o '"teammateMode": *"[a-z-]*"' "$HOME/.claude/settings.json" | head -1)"; else row teammateMode MISSING '"teammateMode": "auto" in ~/.claude/settings.json'; fi
if [ -f "$HOME/.claude/.credentials.json" ]; then row login OK ''; else row login TODO 'run claude once and finish the browser login'; fi
if [ $miss = 0 ]; then
  echo 'Next, in your project: node "$HOME/claude-toolkit/install.mjs" --set live   # once per repo'
  echo '      then: tmux new -A -s <name>   and inside it: claude   -> /recon, /scope ..., /team build; teammates open as panes'
fi
exit $miss
