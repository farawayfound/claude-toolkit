#!/usr/bin/env bash
# install.sh - forwards to install.mjs with the same arguments (see its header); same as: node "$HOME/claude-toolkit/install.mjs" [flags]
# Usage: bash "$HOME/claude-toolkit/install.sh" [--set full|live|takehome|unbound] [--target DIR] [--gate] [--init] [--update] [--dry-run] [--force] [--uninstall]
command -v node >/dev/null || { echo 'node not found: install Node.js 18 or later (macOS: brew install node; Windows: winget install OpenJS.NodeJS.LTS), then open a new terminal' >&2; exit 3; }
exec node "$(dirname "$0")/install.mjs" "$@"
