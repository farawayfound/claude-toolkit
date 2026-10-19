// Claude Code status line: "<folder> | <branch>", so every session says which worktree it is in. Reads the status-line JSON on stdin.
// wtc passes it per session with --settings; any error prints a short fallback instead of failing the status line.
import { execFileSync } from 'node:child_process'; import fs from 'node:fs'; import path from 'node:path';

let dir = process.cwd();
try { dir = JSON.parse(fs.readFileSync(0, 'utf8')).workspace?.current_dir || dir; } catch { /* no input: use the cwd */ }
let branch = 'no git';
try { branch = execFileSync('git', ['-C', dir, 'branch', '--show-current'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 2000 }).trim() || 'detached'; } catch { /* not a repo */ }
process.stdout.write(`${path.basename(dir)} | ${branch}`);
