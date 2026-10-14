// setup/lib/install.mjs: the whole kit for one machine, on top of dropin.mjs.
//   global [--plugins core|all|none] [--model M] [--effort E] [--home DIR] [--dry-run] [--uninstall]
//     every part into ~/.claude (dropin add all --user), then settings defaults (effortLevel, enableWorkflows, Git Bash path), the toolkit mirror
//     at ~/.claude/dev-toolkit, official plugins, and a claude doctor summary. --uninstall takes it all out again (plugins stay).
//   vscode-settings [--dry-run]   presentation settings for VS Code (font 16, zoom 1, dark theme, Git Bash terminal).
// Home: --home, else env DEV_TOOLKIT_HOME, else the OS home (plugins and doctor only for the real one). Exit: 0 ok, 1 failed, 2 usage/invalid JSON, 3 prerequisite missing.
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { TK, fwd, die, target, add, removeParts, finish, mergeSettings } from '../../dropin.mjs';

const DEFAULTS = { effortLevel: 'high', enableWorkflows: true };
const VS = { 'editor.fontSize': 16, 'terminal.integrated.fontSize': 16, 'window.zoomLevel': 1, 'workbench.colorTheme': 'Default Dark Modern',
  'terminal.integrated.defaultProfile.windows': 'Git Bash', 'editor.minimap.enabled': false, 'window.restoreWindows': 'none', 'workbench.startupEditor': 'none' };
const FLAGS = { global: ['plugins', 'model', 'effort', 'home', 'dry-run', 'uninstall'], 'vscode-settings': ['dry-run'] };
const VALUED = ['plugins', 'model', 'effort', 'home'];
const [cmd, ...rest] = process.argv.slice(2); const F = {};
for (let i = 0; i < rest.length; i++) { if (!rest[i].startsWith('--')) die(2, `unexpected argument ${rest[i]}`); const k = rest[i].slice(2); F[k] = VALUED.includes(k) ? rest[++i] : true; }
if (!FLAGS[cmd]) die(2, 'usage: node install.mjs global|vscode-settings [flags] (see the header of this file)');
for (const k of Object.keys(F)) if (!FLAGS[cmd].includes(k) || F[k] === undefined) die(2, `unknown or incomplete flag --${k} for '${cmd}'`);
if (F.plugins && !['core', 'all', 'none'].includes(F.plugins)) die(2, '--plugins must be core, all or none');
if (F.effort && !['low', 'medium', 'high', 'xhigh', 'max'].includes(F.effort)) die(2, '--effort must be low, medium, high, xhigh or max');
const DRY = !!F['dry-run']; const lf = (s) => s.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n'); const read = (p) => (fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null);
function run(c, args = [], o = {}) { // a shell only for the .cmd shims of claude/npm/code on Windows; stdin closed
  const shell = process.platform === 'win32' && ['claude', 'npm', 'npx', 'code'].includes(c); const q = (a) => (/[\s"&|<>^()]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a);
  const opt = { cwd: o.cwd, timeout: o.timeout || 60000, encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], shell };
  const r = shell ? spawnSync([c, ...args].map(q).join(' '), opt) : spawnSync(c, args, opt);
  return { code: r.error ? null : r.status, out: (r.stdout || '').trim(), err: ((r.stderr || '') + (r.error ? r.error.message : '')).trim() };
}
const onPath = (n) => (process.env.PATH || '').split(path.delimiter).some((d) => d && ['', '.exe', '.cmd'].some((x) => fs.existsSync(path.join(d, n + x))));
function gitBash() { // never `where bash`: System32\bash.exe is WSL
  if (process.platform !== 'win32') return null;
  const c = [process.env.CLAUDE_CODE_GIT_BASH_PATH, 'C:/Program Files/Git/bin/bash.exe', 'C:/Program Files (x86)/Git/bin/bash.exe', process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Programs/Git/bin/bash.exe')];
  for (const g of run('where', ['git']).out.split(/\r?\n/)) if (/[\\/]cmd[\\/]git\.exe$/i.test(g.trim())) c.push(path.join(g.trim(), '../../bin/bash.exe'));
  const hit = c.find((p) => p && fs.existsSync(p)); return hit ? fwd(path.resolve(hit)) : null;
}
const walk = (d, base = d) => (!fs.existsSync(d) ? [] : fs.readdirSync(d, { withFileTypes: true }).filter((e) => !['.git', 'node_modules'].includes(e.name) && !(d === base && ['docs', 'practice', 'Quickstart.md', 'LICENSE', 'NOTICE'].includes(e.name)))
  .flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name), base) : [fwd(path.relative(base, path.join(d, e.name)))])));
function mirror(t) { // ~/.claude/dev-toolkit lets the per-repo commands run without the toolkit folder open; docs/, practice/, Quickstart.md, LICENSE and NOTICE stay out of ~/.claude
  const dst = path.join(t.CL, 'dev-toolkit'); const files = walk(TK); const n = { created: 0, updated: 0, removed: 0 };
  if (fwd(path.resolve(TK)).toLowerCase() === fwd(path.resolve(dst)).toLowerCase()) return console.log('  mirror    running from the mirror; refresh skipped');
  for (const f of files) {
    let buf = fs.readFileSync(path.join(TK, f)); if (/\.(mjs|md|json|sh|example)$/.test(f)) buf = Buffer.from(lf(buf.toString('utf8')));
    const d = path.join(dst, f); const old = fs.existsSync(d) ? fs.readFileSync(d) : null; if (old && old.equals(buf)) continue;
    if (!DRY) { fs.mkdirSync(path.dirname(d), { recursive: true }); fs.writeFileSync(d, buf); } n[old ? 'updated' : 'created']++;
  }
  for (const f of walk(dst)) if (!files.includes(f)) { if (!DRY) fs.rmSync(path.join(dst, f)); n.removed++; }
  console.log(`  ${DRY ? 'would ' : ''}mirror    ${fwd(dst)}: ${n.created} created, ${n.updated} updated, ${n.removed} removed`);
}
function plugins(real) {
  if (F.plugins === 'none') return 'skipped (--plugins none)';
  if (!real) return 'skipped (--home is not the real profile; claude plugin would change the real one)';
  if (run('claude', ['--version']).code !== 0) return 'skipped (no claude: install Claude Code, then re-run)';
  const want = ['commit-commands', 'pr-review-toolkit'];
  if (F.plugins === 'all') {
    want.push('security-guidance');
    for (const [p, bin] of [['pyright-lsp', 'pyright'], ['typescript-lsp', 'typescript-language-server'], ['gopls-lsp', 'gopls']]) if (onPath(bin)) want.push(p); else console.log(`  plugin    ${p} skipped: ${bin} not on PATH (bootstrap -Lsp)`);
  }
  const have = run('claude', ['plugin', 'list']).out; const need = want.filter((p) => !have.includes(`${p}@`));
  for (const p of want) if (!need.includes(p)) console.log(`  plugin    ${p}: already installed`);
  if (!need.length) return `OK (${want.join(', ')} already installed)`;
  if (DRY) return `PLANNED (would install ${need.join(', ')})`;
  run('claude', ['plugin', 'marketplace', 'update', 'anthropic-plugin-directory'], { timeout: 180000 });
  const ml = run('claude', ['plugin', 'marketplace', 'list']).out; const mp = ['anthropic-plugin-directory', 'claude-plugins-official'].find((m) => ml.includes(m));
  if (!mp) return 'WARN official marketplace not listed: run `claude plugin marketplace update anthropic-plugin-directory`, then `claude plugin install commit-commands@anthropic-plugin-directory`';
  let bad = 0;
  for (const p of need) {
    const r = run('claude', ['plugin', 'install', `${p}@${mp}`], { timeout: 180000 });
    if (r.code === 0) console.log(`  plugin    ${p}@${mp}: installed`); else { bad++; console.log(`  WARN      plugin ${p}@${mp} failed (exit ${r.code}): ${(r.err || r.out).split('\n').pop()}`); }
  }
  return bad ? `WARN (${bad} failed)` : `OK (${want.join(', ')} @${mp})`;
}
const scalar = (s, added, k, v, onlyIfAbsent) => { // remember what we set or replaced, so --uninstall can put the user's value back
  added.scalars ||= {}; added.replaced ||= {};
  if (s[k] === undefined) { s[k] = v; added.scalars[k] = v; return; }
  if (onlyIfAbsent || JSON.stringify(s[k]) === JSON.stringify(v)) return;
  if (k in added.scalars) added.scalars[k] = v; else if (k in added.replaced) added.replaced[k] = { ...added.replaced[k], to: v }; else added.replaced[k] = { from: s[k], to: v };
  s[k] = v;
};
async function globalInstall() {
  const t = target({ mode: 'user', home: F.home, dry: DRY }); const real = fwd(t.home).toLowerCase() === fwd(os.homedir()).toLowerCase(); // `claude plugin` and `claude doctor` always act on the real profile
  console.log(`dev-toolkit global -> ${fwd(t.CL)}${DRY ? ' (dry run: nothing is written)' : ''}`); const before = read(t.settingsFile);
  await add(t, ['all']); mirror(t);
  mergeSettings(t, 'global', (s, added) => {
    scalar(s, added, 'effortLevel', F.effort || DEFAULTS.effortLevel, !F.effort); scalar(s, added, 'enableWorkflows', DEFAULTS.enableWorkflows, true);
    if (F.model) scalar(s, added, 'model', F.model, false);
    const bash = gitBash(); if (bash && !s.env?.CLAUDE_CODE_GIT_BASH_PATH) { s.env ||= {}; s.env.CLAUDE_CODE_GIT_BASH_PATH = bash; added.env = bash; }
    if (s.env?.CLAUDE_CODE_SUBAGENT_MODEL) console.log('  WARN      env.CLAUDE_CODE_SUBAGENT_MODEL is set: it overrides the agents\' model choice (verifier sonnet, reviewer opus); remove it if unintended');
  });
  const pl = plugins(real); finish(t);
  const v = run('claude', ['--version']); const cred = fs.existsSync(path.join(t.CL, '.credentials.json')); const c = t.counts; const changed = read(t.settingsFile) !== before || (DRY && c.created + c.updated > 0 && before === null);
  const rows = [['files', DRY && c.created + c.updated + c.removed ? 'PLANNED' : 'OK', `${c.created} ${DRY ? 'to create' : 'created'}, ${c.updated} ${DRY ? 'to update' : 'updated'}, ${c.unchanged} unchanged, ${c.skipped} skipped`],
    ['settings.json', DRY && changed ? 'PLANNED' : 'OK', `${!changed ? 'unchanged' : DRY ? 'would merge' : 'merged'}${t.state.settings.backup ? `; backup ${t.state.settings.backup}` : ''}`], ['plugins', pl.split(' ')[0], pl],
    ['claude', v.code === 0 ? 'OK' : 'MISSING', v.code === 0 ? v.out.split('\n')[0] : 'run bootstrap.cmd, then open a new terminal']];
  if (v.code === 0 && real && !DRY) {
    const d = run('claude', ['doctor'], { timeout: 30000 }); const out = `${d.out}\n${d.err}`; const bad = d.code !== 0 || /error|fail/i.test(out) || (/issue/i.test(out) && !/no installation issues/i.test(out));
    rows.push(['claude doctor', bad ? 'WARN' : 'OK', out.split('\n').map((l) => l.trim()).filter((l) => /^(Running|.*issue|.*error|.*warn)/i.test(l)).slice(0, 3).join(' | ') || `exit ${d.code}`]);
  }
  rows.push(['login', cred ? 'OK' : 'TODO', cred ? 'credentials present' : 'run `claude` to log in']);
  console.log('\nItem           Status   Detail'); for (const [a, b, x] of rows) console.log(`${a.padEnd(15)}${b.padEnd(9)}${x}`);
  if (t.warns.length) console.log(`\n${t.warns.length} warning(s) above.`);
  console.log('Next, per repo, in a Git Bash terminal: bash ~/.claude/dev-toolkit/install.sh   (PowerShell: & "$HOME\\.claude\\dev-toolkit\\install.ps1"; one part at a time: node ~/.claude/dev-toolkit/dropin.mjs add <part> --repo .)');
}
function globalUninstall() {
  const t = target({ mode: 'user', home: F.home, dry: DRY }); console.log(`dev-toolkit global uninstall <- ${fwd(t.CL)}${DRY ? ' (dry run)' : ''}`);
  const backup = t.state.settings.backup; removeParts(t, ['all']);
  if (fs.existsSync(path.join(t.CL, 'dev-toolkit'))) { if (!DRY) fs.rmSync(path.join(t.CL, 'dev-toolkit'), { recursive: true, force: true }); console.log(`  removed   ${fwd(path.join(t.CL, 'dev-toolkit'))}`); }
  finish(t, true);
  console.log('Plugins stay installed. To remove: claude plugin uninstall commit-commands@anthropic-plugin-directory; claude plugin uninstall pr-review-toolkit@anthropic-plugin-directory (and security-guidance, pyright-lsp, typescript-lsp, gopls-lsp after -Plugins all).');
  if (backup) console.log(`Pre-install settings backup: ${backup}`);
}
function vscode() {
  const base = process.platform === 'win32' ? process.env.APPDATA : path.join(os.homedir(), process.platform === 'darwin' ? 'Library/Application Support' : '.config');
  const p = path.join(base, 'Code/User/settings.json'); const t = read(p); let s = {};
  try { if (t?.trim()) s = JSON.parse(t.replace(/^\uFEFF/, '')); } catch { return console.log(`  WARN      ${fwd(p)} has comments or trailing commas (JSONC); skipped. Set font size 16, zoom 1 and a dark theme by hand.`); }
  const was = JSON.stringify(s); Object.assign(s, VS); if (JSON.stringify(s) === was) return console.log(`  unchanged ${fwd(p)}`);
  if (!DRY) { if (t !== null) fs.writeFileSync(`${p}.bak-${Date.now()}`, t); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, JSON.stringify(s, null, 2) + '\n'); }
  console.log(DRY ? 'Dry run: nothing was written.' : `VS Code presentation settings merged into ${fwd(p)}; reload VS Code to apply.`);
}
if (cmd === 'global') { if (F.uninstall) globalUninstall(); else await globalInstall(); } else vscode();
process.exit(0);
