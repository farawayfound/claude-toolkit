#!/usr/bin/env node
// install.mjs: one set of the toolkit into one checkout, from any terminal on Windows, macOS or Linux (logic: dropin.mjs). install.sh and install.cmd forward here.
//   node "$HOME/claude-toolkit/install.mjs" [set ...] [--set NAME] [--target DIR] [--gate] [--init] [--update] [--panes | --no-panes] [--dry-run] [--force] [--uninstall]
// Without a set it asks which one (Enter = full); when input is not a terminal it places full. The menu sets are full, live, takehome and
// unbound; any set or part from `node dropin.mjs list` works too, and several names add up. Re-running with another set only adds.
// Flags take one or two dashes in any case, PowerShell spelling included (-Set live, -Target D:\x, -DryRun, -WhatIf), and --name=value.
// A folder given in place of a set is the target. Anything else is rejected before anything runs.
//   --gate       adds the opt-in Stop gate
//   --init       the target is not the root of a git repository: git init there and commit its files as a baseline (asked when interactive)
//   --update     git pull --ff-only in this clone first, then install from the updated files
//   --uninstall  removes everything this tool placed (or only the names given)
//   --panes      after the install, open the team terminal here without asking: psmux (Windows) or tmux attached in this terminal, claude
//                started in its first pane, every teammate in a pane of its own. Missing psmux or tmux is installed first (setup/tmux.ps1,
//                setup/tmux.sh). Interactive runs are asked instead; --no-panes skips the step. Alone, in a repo already set up, it only opens
//                (team.mjs is that one line: node "$HOME/claude-toolkit/team.mjs").
// The docs write the clone as "$HOME/claude-toolkit", never ~/claude-toolkit: Windows PowerShell hands ~ to git and node unexpanded, so
// `git clone ... ~/claude-toolkit` there clones into a folder literally named ~ inside the current one. This script refuses to run from such
// a folder and prints the fix.
// Exit: 0 ok, 1 failed or leaked into git status, 2 usage / not a repo / refused, 3 node too old or git missing.
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import readline from 'node:readline';
import { spawnSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';

const SELF = fileURLToPath(import.meta.url); const TK = path.dirname(SELF); const WIN = process.platform === 'win32';
const URL = 'https://github.com/farawayfound/claude-toolkit.git';
const MENU = [['full', 'every part except the opt-in Stop gate'],
  ['live', "60-90 minute session on someone else's code: recon, scope (a plan per issue), team build, repro-fix, check, deslop, pr-brief; five agents; prompt log"],
  ['takehome', 'timed challenge, 90 minutes to 3 hours: takehome-init, scope, check, break, deslop, tighten-docs, ship, team; six agents; prompt log'],
  ['unbound', 'no time limit: everything general-purpose, including parallel and the /gate review']];
const FLAGS = { set: 'set', target: 'target', repo: 'target', gate: 'gate', init: 'init', update: 'update', panes: 'panes', nopanes: 'nopanes', dryrun: 'dry', whatif: 'dry', force: 'force', uninstall: 'uninstall', help: 'help', h: 'help', '?': 'help' };
const OPTIONS = '--set NAME, --target DIR, --gate, --init, --update, --panes, --no-panes, --dry-run, --force, --uninstall, --help';
const fwd = (p) => p.replace(/\\/g, '/');
const die = (code, msg) => { console.error(`ERROR: ${msg}`); process.exit(code); };
function git(args, cwd) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8', windowsHide: true, timeout: 120000, stdio: ['ignore', 'pipe', 'pipe'] });
  return { code: r.error ? null : r.status, out: (r.stdout || '').trim(), err: ((r.stderr || '') + (r.error ? r.error.message : '')).trim() };
}
const within = (p, root) => { const r = path.relative(root, p); return !r.startsWith('..') && !path.isAbsolute(r); };
function ask(q) { const rl = readline.createInterface({ input: process.stdin, output: process.stdout }); return new Promise((res) => rl.question(q, (a) => { rl.close(); res(a.trim()); })); }
const HOMEISH = /^(~|\$home|%userprofile%)$/i; // what an unexpanded home folder leaves behind as a folder name
const rmLines = (p) => `${WIN ? `    PowerShell: Remove-Item -Recurse -Force -LiteralPath '${p.replace(/\//g, '\\')}'\n    Git Bash:   ` : '    '}rm -rf '${fwd(p)}'`;
const isFlag = (a) => /^-{1,2}[A-Za-z?]/.test(a) || a === '/?';
const keyOf = (a) => FLAGS[a.split('=')[0].replace(/^[-/]+/, '').replace(/-/g, '').toLowerCase()];

// ---- arguments: forgiving about spelling style, strict about names
const argv = process.argv.slice(2); const F = { names: [] };
for (let i = 0; i < argv.length; i++) {
  const a = argv[i]; if (!isFlag(a)) { F.names.push(a); continue; }
  const key = keyOf(a); if (!key) die(2, `unknown option ${a} (options: ${OPTIONS})`);
  if (key === 'set' || key === 'target') {
    const v = a.includes('=') ? a.slice(a.indexOf('=') + 1) : argv[++i]; if (!v || isFlag(v)) die(2, `${a} needs a value (options: ${OPTIONS})`);
    if (key === 'set') F.names.push(v); else F.target = v;
  } else F[key] = true;
}
if (F.help) { console.log(fs.readFileSync(SELF, 'utf8').split('\n').slice(1).filter((l, i, all) => all.slice(0, i + 1).every((x) => x.startsWith('//'))).map((l) => l.slice(3)).join('\n')); process.exit(0); }
if (+process.versions.node.split('.')[0] < 18) die(3, `node ${process.versions.node} is too old: install Node.js 18 or later, then open a new terminal`);

// ---- a clone made with ~ unexpanded sits in a folder literally named ~ (or $HOME): refuse and say how to fix it
const segs = fwd(TK).split('/'); const stray = segs.findIndex((s) => HOMEISH.test(s));
if (stray >= 0 && !F.force) {
  const bad = segs.slice(0, stray + 1).join('/'); const homeClone = path.join(os.homedir(), 'claude-toolkit'); const url = git(['remote', 'get-url', 'origin'], TK).out || URL;
  const get = fs.existsSync(homeClone) ? `A clone already exists at ${fwd(homeClone)}; update it and use that one:\n    git -C "$HOME/claude-toolkit" pull\n  then:`
    : `Clone it into your home folder (this line works the same in PowerShell, Git Bash and macOS):\n    git clone ${url} "$HOME/claude-toolkit"\n  then:`;
  die(2, `this copy of the toolkit is at ${fwd(TK)}, inside a folder literally named "${segs[stray]}".\n  The clone command got ${segs[stray]} unexpanded (Windows PowerShell does not expand ~ for git or node), so it cloned into the folder you were in.\n`
    + `  ${get}\n    node "$HOME/claude-toolkit/install.mjs"\n  and delete the stray folder by its full path, never by a bare ~ (git marks its object files read-only, hence -Force / -f):\n${rmLines(bad)}`);
}

// ---- --update: pull this clone, then run the updated installer with the same arguments
if (F.update) {
  if (git(['rev-parse', '--show-prefix'], TK).out !== '' || git(['rev-parse', '--git-dir'], TK).code !== 0) die(2, `${fwd(TK)} is not the root of a git clone, so --update cannot pull it; update the clone it was copied from`);
  const before = git(['rev-parse', 'HEAD'], TK).out; const p = git(['pull', '--ff-only', '--quiet'], TK); if (p.code !== 0) die(1, `git pull in ${fwd(TK)} failed: ${p.err || p.out}`);
  const after = git(['rev-parse', 'HEAD'], TK).out;
  if (after !== before) { console.log(`toolkit updated ${before.slice(0, 7)} -> ${after.slice(0, 7)}`); const r = spawnSync(process.execPath, [SELF, ...argv.filter((a) => keyOf(a) !== 'update')], { stdio: 'inherit' }); process.exit(r.status ?? 1); }
  console.log('toolkit already up to date');
}

const { INDEX, SETS, target, add, removeParts, finish } = await import('./dropin.mjs');
const known = (n) => !!(INDEX[n] || SETS[n] || ['all', 'repo', 'default', 'skills', 'agents', 'rules'].includes(n));
for (const n of [...F.names]) {
  if (known(n)) continue;
  if (!F.target && fs.existsSync(n) && fs.statSync(n).isDirectory()) { F.target = n; F.names.splice(F.names.indexOf(n), 1); continue; }
  die(2, `unknown set or part '${n}' (sets: ${[...Object.keys(SETS), 'repo', 'all'].join(', ')}; every part: node "${fwd(TK)}/dropin.mjs" list)`);
}

// ---- the target: an existing folder, the toolkit outside it, and a git repository whose root is where claude will start
const dir = path.resolve(F.target || '.'); if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) die(2, `target not found: ${fwd(dir)}`);
if (git(['--version']).code !== 0) die(3, `git not found: install it (${WIN ? 'winget install Git.Git' : process.platform === 'darwin' ? 'xcode-select --install' : 'your package manager'}), then open a new terminal`);
if (within(TK, dir) && !F.force) die(2, `the toolkit (${fwd(TK)}) is inside the target ${fwd(dir)}. Run this from your project's folder, with the toolkit cloned outside it: git clone ${URL} "$HOME/claude-toolkit"`);
const prefix = git(['rev-parse', '--show-prefix'], dir); const isRepo = prefix.code === 0; let init = !!F.init && !(isRepo && prefix.out === '');
const placed = isRepo && fs.existsSync(path.resolve(dir, git(['rev-parse', '--git-path', 'dev-toolkit.json'], dir).out || 'none')); // the manifest: this checkout already has the toolkit
if (F.panes && !F.names.length && !F.gate && !F.uninstall && !placed) die(2, `${fwd(dir)} has no toolkit yet: run node "${fwd(TK)}/install.mjs" there first (it ends by opening the team terminal); --panes alone only opens it`);
const leftover = fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory() && HOMEISH.test(e.name)).map((e) => path.join(dir, e.name))[0];
const leftMsg = leftover && `${fwd(leftover)} looks like a clone made with ~ unexpanded. Delete it by its full path (never a bare ~):\n${rmLines(leftover)}`;
const refuseLeftover = () => leftover && die(2, `${leftMsg}\n  then run this again: a baseline commit would take it in as an embedded repository.`);
if ((init || !isRepo) && !F.uninstall) refuseLeftover(); // before any question, so no answer leads to a refusal
if (!isRepo && !init && !F.uninstall) {
  if (process.stdin.isTTY) init = /^(y|yes)?$/i.test(await ask(`${fwd(dir)} is not a git repository. Make it one (git init and a baseline commit of its files)? [Y/n] `));
  if (!init) die(2, `${fwd(dir)} is not a git repository. Run again with --init to make it one (git init and a baseline commit of its files), or clone the project first.`);
}
if (isRepo && prefix.out && !init && !F.uninstall) {
  const top = fwd(path.resolve(git(['rev-parse', '--show-toplevel'], dir).out)); const q = `${fwd(dir)} is inside the repository ${top}.`;
  if (process.stdin.isTTY) init = /^i/i.test(await ask(`${q} Install into ${top} and start claude there [Enter], or make this folder a repository of its own [i]? `));
  else console.log(`  note      ${q} The toolkit goes there, so start claude in that folder (--init makes this folder a repository of its own instead).`);
}
if (init) refuseLeftover(); else if (leftover) console.log(`  WARN      ${leftMsg}`);
if (init) {
  if (F.dry) { console.log(`  would init ${fwd(dir)}: git init and a baseline commit of its files. Dry run: nothing was written; the file list needs the repository.`); process.exit(0); }
  const id = git(['config', 'user.email'], dir).out ? [] : ['-c', 'user.name=dev-toolkit', '-c', 'user.email=dev-toolkit@localhost'];
  for (const a of [['init', '-q'], ['add', '-A'], [...id, 'commit', '-q', '--allow-empty', '-m', 'baseline']]) { const r = git(a, dir); if (r.code !== 0) die(1, `git ${a.filter((x) => x !== '-c' && !x.startsWith('user.')).join(' ')} failed in ${fwd(dir)}: ${r.err || r.out}`); }
  console.log(`  init      ${fwd(dir)}: git init and a baseline commit of ${git(['ls-files'], dir).out.split('\n').filter(Boolean).length} files`);
}

// ---- which set (--panes alone, in a repo that already has the toolkit, installs nothing and only opens the team terminal)
let names = F.names;
if (!names.length && !F.uninstall && !(F.panes && placed)) {
  names = ['full'];
  if (process.stdin.isTTY) {
    console.log('Which set?'); MENU.forEach(([s, w], i) => console.log(`  ${i + 1}  ${s.padEnd(9)} ${w}`));
    const a = (await ask('Choose [1-4, Enter = 1]: ')).toLowerCase(); const pick = a === '' ? 'full' : MENU[+a - 1]?.[0] || a;
    if (!known(pick)) die(2, `unknown set: ${a} (1-4, or a name from node dropin.mjs list)`); names = [pick];
  }
}
if (F.gate && !F.uninstall) names.push('gate');

const rev = git(['log', '-1', '--format=%h %cs', '--', '.'], TK).out; console.log(`toolkit   ${fwd(TK)}${rev ? ` (${rev})` : ''}`);
const t = target({ dir, dry: F.dry, force: F.force });
if (F.uninstall) { removeParts(t, names.length ? names : ['all']); finish(t, true); } else if (names.length) { await add(t, names); finish(t); } else console.log(`nothing to place: ${t.label} already has the toolkit`);

// ---- the team terminal: psmux on Windows, tmux elsewhere, attached in this terminal with claude started in its first pane, so the parts
// just placed load and every teammate opens as a pane (the session sets TMUX, and claude gets --teammate-mode tmux). Asked on a terminal;
// --panes says yes without asking (and installs a missing psmux or tmux first), --no-panes skips it; a pipe only prints the lines.
const MUXNAME = WIN ? 'psmux (tmux for Windows)' : 'tmux';
const SETUP = WIN ? `& "${fwd(TK)}/tmux.cmd"   (PowerShell or Windows Terminal; cmd: "${fwd(TK)}/tmux.cmd")` : `bash "${fwd(TK)}/setup/tmux.sh"`;
const LATER = `node "${fwd(TK)}/install.mjs" --panes   (in your project's folder)${WIN ? `; two windows, psmux left and VS Code right: & "${fwd(TK)}/tmux.cmd" -Open .` : ''}`;
function findMux() { // the tmux binary: PATH first, then where winget puts psmux, because a terminal opened before the install still has the old PATH
  const names = WIN ? ['tmux.exe', 'psmux.exe'] : ['tmux']; const dirs = (process.env.PATH || '').split(path.delimiter).filter(Boolean);
  const la = WIN && process.env.LOCALAPPDATA; const pk = la && path.join(la, 'Microsoft', 'WinGet', 'Packages');
  if (la) dirs.push(path.join(la, 'Microsoft', 'WinGet', 'Links'), ...(fs.existsSync(pk) ? fs.readdirSync(pk).filter((d) => /psmux/i.test(d)).map((d) => path.join(pk, d)) : []));
  for (const d of dirs) for (const n of names) { const p = path.join(d, n); if (fs.existsSync(p)) return p; }
  return null;
}
async function teamTerminal() {
  if (F.nopanes || F.dry || F.uninstall) return;
  const tty = !!process.stdin.isTTY; const mintty = WIN && (process.env.TERM_PROGRAM === 'mintty' || (!!process.env.MSYSTEM && !process.env.WT_SESSION && process.env.TERM_PROGRAM !== 'vscode'));
  if (process.env.TMUX) return console.log(`Team terminal: already inside ${MUXNAME}; type claude here`);
  let bin = findMux();
  if (!bin && (!tty || mintty)) return console.log(`Team terminal (teammates in panes): install ${MUXNAME} once with\n  ${SETUP}\n  then ${LATER}`);
  if (!bin) {
    const yes = F.panes || /^(y|yes)$/i.test(await ask(`Team terminal: ${MUXNAME} is not installed. Install it now${WIN ? ' with winget (psmux, PowerShell 7, the Claude Code CLI; per user, no admin)' : ' with your package manager (tmux, Node, the Claude Code CLI)'}? [y/N] `));
    if (!yes) return console.log(`  later: ${SETUP}\n  then ${LATER}`);
    const r = WIN ? spawnSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(TK, 'setup', 'tmux.ps1')], { stdio: 'inherit' }) : spawnSync('bash', [path.join(TK, 'setup', 'tmux.sh')], { stdio: 'inherit' });
    bin = findMux(); if (r.status !== 0 || !bin) return console.log(`  the setup did not finish (exit ${r.status}): see its table above, then ${LATER}`);
  }
  if (!tty || mintty) return console.log(`Team terminal: ${fwd(bin)} found. ${mintty ? 'psmux needs a Windows console (Windows Terminal, PowerShell, cmd or the VS Code terminal), not Git Bash; there, ' : 'Open it with '}${LATER}`);
  if (!F.panes && !/^(y|yes)?$/i.test(await ask(`Open the team terminal here and start claude in ${fwd(dir)}? [Y/n] `))) return console.log(`  later: ${LATER}`);
  const name = path.basename(dir).toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'team';
  const run = (a) => spawnSync(bin, a, { cwd: dir, encoding: 'utf8', windowsHide: true, timeout: 20000, stdio: ['ignore', 'pipe', 'pipe'] });
  if (run(['has-session', '-t', name]).status !== 0) {
    const ns = run(['new-session', '-d', '-s', name, '-c', dir]); if (ns.status !== 0) return console.log(`  could not start ${fwd(bin)}: ${(ns.stderr || ns.stdout || '').trim()}`);
    run(['send-keys', '-t', name, 'claude --teammate-mode tmux', 'Enter']);
  } else console.log(`  session ${name} already exists: attaching`);
  console.log(`Team terminal: session ${name} in ${fwd(dir)}. claude starts in the first pane; each teammate opens as a pane (click into it to talk to it). Detach: Ctrl+b then d. Later: ${LATER}`);
  const at = spawnSync(bin, ['attach-session', '-t', name], { cwd: dir, stdio: 'inherit' }); process.exit(at.status ?? 0);
}
await teamTerminal();
