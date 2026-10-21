#!/usr/bin/env node
// team.mjs: the team terminal for a project that already has the toolkit, one line from the project's folder in any terminal:
//   node "$HOME/claude-toolkit/team.mjs" [--target DIR]
// psmux (Windows) or tmux attached in this terminal, claude started in its first pane, every teammate in a pane of its own; an existing
// session of this project is reattached. Nothing is placed or changed. Same as: node "$HOME/claude-toolkit/install.mjs" --panes
import path from 'node:path'; import { spawnSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
const r = spawnSync(process.execPath, [path.join(path.dirname(fileURLToPath(import.meta.url)), 'install.mjs'), '--panes', ...process.argv.slice(2)], { stdio: 'inherit' });
process.exit(r.status ?? 1);
