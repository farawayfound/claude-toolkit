#!/usr/bin/env node
// dropin.mjs: put individual parts of this toolkit into a checkout (--repo DIR) or into ~/.claude (--user), and take them out again.
//   node dropin.mjs list
//   node dropin.mjs add <part|group|set ...>  [--repo DIR | --user] [--dry-run] [--force] [--home DIR]
//   node dropin.mjs remove <part ...|all>      [--repo DIR | --user] [--dry-run] [--home DIR]
//   node dropin.mjs facts [DIR]                 prints the repo-facts block for CLAUDE.local.md
// Parts: modules/index.json (`list` prints them). Groups: skills, agents, rules. Sets: repo = facts + rules + whatever ~/.claude lacks
// (house rules, permissions, guard); all = every part (in --user mode: minus the per-repo rules and the opt-in hooks); safety, live and
// takehome are the named sets in modules/sets.json. A part's `requires` come along (gate needs facts, verifier needs check, breaker needs break).
// Repo mode never touches git: created paths go to .git/info/exclude and `git status` must read the same before and after. A file is only
// updated or removed while its content is what this tool wrote (hash in the manifest). Settings are merged, backed up once, and subtracted again.
// Home: --home, else env DEV_TOOLKIT_HOME, else the OS home. Exit: 0 ok, 1 failed or leaked, 2 usage / not a repo / refused / invalid JSON, 3 git missing.
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';

export const TK = path.dirname(fileURLToPath(import.meta.url));
const MOD = path.join(TK, 'modules');
export const INDEX = JSON.parse(fs.readFileSync(path.join(MOD, 'index.json'), 'utf8'));
export const SETS = JSON.parse(fs.readFileSync(path.join(MOD, 'sets.json'), 'utf8')); // named sets of parts: safety, live, takehome
const GROUPS = { skills: 'skill', agents: 'agent', rules: 'rule' };
const BLOCK = { 'house-rules': ['<!-- dev-toolkit:begin -->', '<!-- dev-toolkit:end -->'], facts: ['<!-- dev-toolkit:facts:begin -->', '<!-- dev-toolkit:facts:end -->'] };
const EX = ['# >>> dev-toolkit', '# <<< dev-toolkit'];
const OURS = /[\\/]\.claude[\\/]hooks(?:[\\/]tk)?[\\/](guard|gate|trail)\.mjs/;
const HOOK_PART = { 'guard.mjs': 'guard', 'guard-rules.mjs': 'guard', 'gate.mjs': 'gate', 'detect.mjs': 'facts', 'trail.mjs': 'trail' };
export const fwd = (p) => p.replace(/\\/g, '/');
export const die = (code, msg) => { console.error(`ERROR: ${msg}`); process.exit(code); };
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const lf = (s) => s.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
const read = (p) => (fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null);
const lines = (s) => new Set((s || '').split('\n').filter(Boolean));
const stamp = () => { const d = new Date(), p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`; };
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const blockSrc = ([b, e]) => `${esc(b)}[\\s\\S]*?${esc(e)}\\n?`;
function upsertBlock(text, m, body, top) {
  const block = `${m[0]}\n${body.trim()}\n${m[1]}\n`; text = text || ''; const re = new RegExp(blockSrc(m));
  if (re.test(text)) return text.replace(re, () => block);
  return !text ? block : top ? `${block}\n${text}` : `${text.endsWith('\n') ? text : `${text}\n`}\n${block}`;
}
const dropBlock = (text, m, top) => (text || '').replace(new RegExp(top ? `${blockSrc(m)}\\n?` : `\\n?${blockSrc(m)}`), '');
function run(c, args, cwd) {
  const r = spawnSync(c, args, { cwd, timeout: 60000, encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  return { code: r.error ? null : r.status, out: (r.stdout || '').trim(), err: ((r.stderr || '') + (r.error ? r.error.message : '')).trim() };
}
const git = (args, cwd) => run('git', args, cwd);
const walk = (d, base = d) => (!fs.existsSync(d) ? [] : fs.readdirSync(d, { withFileTypes: true })
  .flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name), base) : [fwd(path.relative(base, path.join(d, e.name)))])));
export const kindOf = (g) => (g.hooks || []).map((h) => OURS.exec(h.command || '')).find(Boolean)?.[1] || null;
export const partsOfKind = (kind) => Object.keys(INDEX).filter((n) => INDEX[n].kind === kind);
function readJson(p) { // an unparseable existing file aborts with exit 2 and is never overwritten
  const t = read(p); if (t === null || !t.trim()) return null;
  try { return JSON.parse(t.replace(/^﻿/, '')); } catch (e) { return die(2, `${fwd(p)} is not valid JSON (${e.message}); fix or restore it. It was not changed.`); }
}

// ---- target: where parts go, and the manifest that remembers what was placed
export function target(o = {}) { // { mode: 'repo' | 'user', dir, home, dry, force }
  const home = path.resolve(o.home || process.env.DEV_TOOLKIT_HOME || os.homedir()); const CL = path.join(home, '.claude');
  const t = { mode: o.mode || 'repo', dry: !!o.dry, force: !!o.force, home, CL, counts: { created: 0, updated: 0, removed: 0, unchanged: 0, skipped: 0 }, warns: [], newDirs: [] };
  if (t.mode === 'user') Object.assign(t, { base: CL, hooksRel: 'hooks', stateFile: path.join(CL, '.dev-toolkit-manifest.json'), claudeFile: path.join(CL, 'CLAUDE.md'),
    settingsFile: path.join(CL, 'settings.json'), backupDir: CL, label: fwd(CL) });
  else {
    const dir = path.resolve(o.dir || '.'); if (!fs.existsSync(dir)) die(2, `target not found: ${fwd(dir)}`);
    if (run('git', ['--version']).code !== 0) die(3, 'git not found: install git (bootstrap), then open a new terminal');
    const top = git(['rev-parse', '--show-toplevel'], dir); if (top.code !== 0) die(2, `${fwd(dir)} is not inside a git repository: clone first`);
    const root = path.resolve(top.out); const inside = path.relative(root, TK);
    if (!t.force && !inside.startsWith('..') && !path.isAbsolute(inside)) die(2, `refusing: the toolkit itself lives inside ${fwd(root)}; use a separate clone (or pass --force)`);
    const gp = (p) => path.resolve(root, git(['rev-parse', '--git-path', p], root).out);
    Object.assign(t, { root, base: path.join(root, '.claude'), hooksRel: 'hooks/tk', stateFile: gp('dev-toolkit.json'), claudeFile: path.join(root, 'CLAUDE.local.md'),
      settingsFile: path.join(root, '.claude/settings.local.json'), backupDir: gp('dev-toolkit-backup'), exclude: gp('info/exclude'), label: fwd(root),
      tracked: new Set(git(['ls-files', '--', 'CLAUDE.local.md', '.claude'], root).out.split('\n').filter(Boolean)), porcelain: () => git(['status', '--porcelain'], root).out });
    t.snapshot = t.porcelain();
  }
  t.state = loadState(t); t.state0 = JSON.stringify(t.state);
  readJson(t.settingsFile); // invalid JSON exits 2 before any write
  return t;
}
const partOfPath = (rel) => { const m = /^(skills|agents|rules|hooks(?:\/tk)?)\/([^/]+)/.exec(rel); return !m ? null : m[1].startsWith('hooks') ? HOOK_PART[m[2]] || null : m[2].replace(/\.md$/, ''); };
function loadState(t) {
  const { installedAt, ...m } = readJson(t.stateFile) || {};
  const s = { version: 2, files: {}, settings: { added: {}, backup: null, created: false }, blocks: [], claudeCreated: false, dirs: [], snapshot: t.snapshot ?? null };
  if (m.version === 2) return { ...s, ...m };
  for (const f of m.files || []) s.files[f.path] = { sha256: f.sha256, created: f.created, part: partOfPath(f.path) }; // manifests written before parts existed
  const a = m.added || m.merges?.settingsLocal?.added;
  if (a) {
    s.settings = { added: { permissions: { allow: a.allow || [], ask: a.ask || [], deny: a.deny || [] }, global: { scalars: a.scalars || {}, replaced: a.replaced || {}, ...(a.env ? { env: a.env } : {}) } },
      backup: m.backup || m.merges?.settingsLocal?.backup || null, created: m.createdSettings ?? m.merges?.settingsLocal?.created ?? false };
    for (const k of a.hooks || []) s.settings.added[k] = { hooks: [k] };
    for (const [k, v] of Object.entries(s.settings.added)) if (!Object.values(v).some((x) => (Array.isArray(x) ? x.length : Object.keys(x).length))) delete s.settings.added[k];
  }
  if (m.files && t.mode === 'user') s.blocks = ['house-rules']; if (m.blocks?.claudeLocal) { s.blocks = ['house-rules', 'facts']; s.claudeCreated = !!m.blocks.claudeLocal.created; }
  s.dirs = m.dirs || []; if (m.snapshot !== undefined) s.snapshot = m.snapshot;
  return s;
}

// ---- primitives: every write goes through here, so --dry-run writes nothing and every change is printed
function note(t, kind, p, why = '') { t.counts[kind]++; const w = t.dry && !['unchanged', 'skipped'].includes(kind) ? `would ${kind.replace(/d$/, '')}` : kind; console.log(`  ${w.padEnd(9)} ${fwd(p)}${why ? ` (${why})` : ''}`); }
function warn(t, m) { t.warns.push(m); console.log(`  WARN      ${m}`); }
function mkdirFor(t, p) { let d = path.dirname(p); while (!fs.existsSync(d) && !t.newDirs.includes(d)) { t.newDirs.push(d); d = path.dirname(d); } if (!t.dry) fs.mkdirSync(path.dirname(p), { recursive: true }); }
function writeText(t, p, text, raw = false) { // LF, UTF-8 without BOM, written only on change; raw keeps the bytes of user-owned files that carry a block
  const data = raw ? text : lf(text); const old = read(p); if (old === data) return note(t, 'unchanged', p), false;
  mkdirFor(t, p); if (!t.dry) fs.writeFileSync(p, data); return note(t, old === null ? 'created' : 'updated', p), true;
}
const remove = (t, p) => { if (!t.dry) fs.rmSync(p, { force: true }); note(t, 'removed', p); };
const rel = (t, abs) => fwd(path.relative(t.mode === 'repo' ? t.root : t.CL, abs));
function filesOf(t, name) { // [[source, destination under the .claude dir]]
  const p = INDEX[name], M = (...x) => path.join(MOD, ...x);
  if (p.kind === 'skill') return walk(M('skills', name)).map((f) => [M('skills', name, f), `skills/${name}/${f}`]);
  if (p.kind === 'agent') return [[M('agents', `${name}.md`), `agents/${name}.md`]];
  if (p.kind === 'rule') return [[M('rules', `${name}.md`), `rules/${name}.md`]];
  if (p.kind === 'hook') return p.files.map((f) => [M(name, f), `${t.hooksRel}/${f}`]);
  if (p.kind === 'workflow') return p.files.map((f) => [M(name, f), `workflows/${f}`]);
  return [];
}
function placeFile(t, part, src, dest) { // update only files we own: on-disk hash equals the manifest hash
  const abs = path.join(t.base, dest), data = lf(fs.readFileSync(src, 'utf8')), cur = read(abs), prev = t.state.files[dest];
  if (t.tracked?.has(`.claude/${dest}`)) return warn(t, `.claude/${dest} is tracked by git; skipped`);
  if (cur !== null && cur !== data && !t.force && (!prev || sha(cur) !== prev.sha256)) { warn(t, `${dest} ${prev ? 'was modified after install' : 'exists with different content'}; kept${prev ? '' : ' (--force replaces it)'}`); return note(t, 'skipped', abs); }
  writeText(t, abs, data); t.state.files[dest] = { sha256: sha(data), created: prev ? prev.created : cur === null, part };
}
function removeFile(t, dest) {
  const f = t.state.files[dest], abs = path.join(t.base, dest); delete t.state.files[dest]; const cur = read(abs);
  if (cur === null || f.created === false) return; // a file that existed before us keeps our content: its original is gone
  if (sha(cur) !== f.sha256) return warn(t, `${dest} changed after install; kept`);
  remove(t, abs); for (let d = path.dirname(abs); !t.dry && d.startsWith(t.base) && d !== t.base && fs.existsSync(d) && !fs.readdirSync(d).length; d = path.dirname(d)) fs.rmdirSync(d);
}
const addPerms = (s, perms, added) => { for (const k of ['allow', 'ask', 'deny']) for (const r of perms[k] || []) { s.permissions ||= {}; const l = (s.permissions[k] ||= []); if (!l.includes(r)) { l.push(r); (added[k] ||= []).push(r); } } };
function dropPerms(s, added) {
  for (const k of ['allow', 'ask', 'deny']) { if (!s.permissions?.[k]) continue; s.permissions[k] = s.permissions[k].filter((r) => !(added[k] || []).includes(r)); if (!s.permissions[k].length) delete s.permissions[k]; }
  if (s.permissions && !Object.keys(s.permissions).length) delete s.permissions;
}
function addHooks(s, hooks, added) { // add or refresh in place, so a re-run is byte-stable
  for (const [ev, gs] of Object.entries(hooks || {})) for (const g of gs) { s.hooks ||= {}; const l = (s.hooks[ev] ||= []); const i = l.findIndex((x) => kindOf(x) === kindOf(g)); if (i >= 0) l[i] = g; else l.push(g); if (!(added.hooks ||= []).includes(kindOf(g))) added.hooks.push(kindOf(g)); }
}
function dropHooks(s, kinds) {
  for (const ev of Object.keys(s.hooks || {})) { s.hooks[ev] = s.hooks[ev].filter((g) => !kinds.includes(kindOf(g))); if (!s.hooks[ev].length) delete s.hooks[ev]; }
  if (s.hooks && !Object.keys(s.hooks).length) delete s.hooks;
}
const tidy = (a) => { for (const [k, v] of Object.entries(a)) if (Array.isArray(v) ? !v.length : v && typeof v === 'object' && !Object.keys(v).length) delete a[k]; return a; };
export function mergeSettings(t, part, mutate) { // back up before the first change; never reformat a semantically unchanged file
  const st = t.state.settings; if (t.tracked?.has(rel(t, t.settingsFile))) return warn(t, `${rel(t, t.settingsFile)} is tracked by git; skipped (${part} not merged)`);
  const before = read(t.settingsFile); const s = readJson(t.settingsFile) || {}; const was = JSON.stringify(s); mutate(s, (st.added[part] ||= {})); tidy(st.added[part]); if (!Object.keys(st.added[part]).length) delete st.added[part];
  if (JSON.stringify(s) === was) return before === null ? undefined : note(t, 'unchanged', t.settingsFile);
  if (before !== null && !st.backup && !st.created) { st.backup = fwd(path.join(t.backupDir, `${path.basename(t.settingsFile)}.bak-${stamp()}`)); if (!t.dry) { fs.mkdirSync(t.backupDir, { recursive: true }); fs.writeFileSync(st.backup, before); } console.log(`  ${t.dry ? 'would back up' : 'backup   '} ${st.backup}`); }
  if (before === null) st.created = true;
  writeText(t, t.settingsFile, JSON.stringify(s, null, 2) + '\n');
}
function unmergeSettings(t, parts) { // subtract what the manifest says these parts added; restore the backup bytes when nothing of ours is left and nothing else changed
  const st = t.state.settings; const s = readJson(t.settingsFile) || {}; const was = JSON.stringify(s);
  for (const p of parts) {
    const a = st.added[p]; delete st.added[p]; if (!a) continue;
    dropPerms(s, a); dropHooks(s, a.hooks || []);
    for (const [k, v] of Object.entries(a.scalars || {})) if (JSON.stringify(s[k]) === JSON.stringify(v)) delete s[k];
    for (const [k, r] of Object.entries(a.replaced || {})) if (JSON.stringify(s[k]) === JSON.stringify(r.to)) s[k] = r.from; // a value the user changed since stays
    if (a.env && s.env?.CLAUDE_CODE_GIT_BASH_PATH === a.env) { delete s.env.CLAUDE_CODE_GIT_BASH_PATH; if (!Object.keys(s.env).length) delete s.env; }
  }
  if (read(t.settingsFile) === null) return; if (JSON.stringify(s) === was) return note(t, 'unchanged', t.settingsFile);
  const orig = st.backup ? read(st.backup) : null; let same = false; try { same = !Object.keys(st.added).length && orig !== null && JSON.stringify(JSON.parse(orig)) === JSON.stringify(s); } catch { /* keep the surgical result */ }
  if (same) { if (!t.dry) fs.writeFileSync(t.settingsFile, orig); note(t, 'updated', t.settingsFile, 'restored from backup'); st.backup = null; }
  else if (st.created && !Object.keys(s).length) { remove(t, t.settingsFile); st.created = false; st.backup = null; }
  else writeText(t, t.settingsFile, JSON.stringify(s, null, 2) + '\n');
}
function addBlock(t, part, body) {
  if (t.tracked?.has(rel(t, t.claudeFile))) return warn(t, `${rel(t, t.claudeFile)} is tracked by git; skipped (${part} block not written)`);
  const cur = read(t.claudeFile); if (cur === null) t.state.claudeCreated = true;
  writeText(t, t.claudeFile, upsertBlock(cur, BLOCK[part], body, t.mode === 'repo'), true); if (!t.state.blocks.includes(part)) t.state.blocks.push(part);
}
function removeBlock(t, part) {
  t.state.blocks = t.state.blocks.filter((b) => b !== part); const cur = read(t.claudeFile); if (!cur?.includes(BLOCK[part][0])) return;
  const nt = dropBlock(cur, BLOCK[part], t.mode === 'repo'); if (nt.trim()) writeText(t, t.claudeFile, nt, true); else { remove(t, t.claudeFile); t.state.claudeCreated = false; }
}

// ---- parts
function userHas(t, part) { // is this part already in the user layer (~/.claude)? decides what the `repo` set adds
  if (part === 'house-rules') return (read(path.join(t.CL, 'CLAUDE.md')) || '').includes(BLOCK['house-rules'][0]);
  let s = {}; try { s = JSON.parse(read(path.join(t.CL, 'settings.json')) || '{}'); } catch { return false; }
  return Object.values(s.hooks || {}).flat().some((g) => kindOf(g) === 'guard') && fs.existsSync(path.join(t.CL, 'hooks/guard.mjs'));
}
export function resolve(names, t) { // explicit names, groups and sets, with each part's requires placed first
  const out = []; const push = (n) => { if (!out.includes(n)) { for (const r of INDEX[n].requires || []) push(r); out.push(n); } };
  for (const n of names) {
    if (n === 'all') for (const p of Object.keys(INDEX)) { if (!INDEX[p].optIn && (t.mode === 'repo' || INDEX[p].kind !== 'rule')) push(p); } // opt-in hooks (gate, trail) are named explicitly; rules are per-repo
    else if (n === 'repo') { if (t.mode !== 'repo') die(2, 'the repo set needs --repo'); push('facts'); partsOfKind('rule').forEach(push); if (!userHas(t, 'house-rules')) push('house-rules'); if (!userHas(t, 'guard')) { push('permissions'); push('guard'); } }
    else if (GROUPS[n]) partsOfKind(GROUPS[n]).forEach(push);
    else if (SETS[n]) SETS[n].forEach(push);
    else if (INDEX[n]) push(n);
    else die(2, `unknown part '${n}' (node dropin.mjs list)`);
  }
  return out;
}
export const installed = (t) => [...new Set([...Object.values(t.state.files).map((f) => f.part), ...Object.keys(t.state.settings.added), ...t.state.blocks])].filter((p) => INDEX[p]);
export async function add(t, names) {
  const list = resolve(names, t); console.log(`dev-toolkit add -> ${t.label}: ${list.join(', ')}${t.dry ? ' (dry run: nothing is written)' : ''}`);
  for (const name of list) {
    const p = INDEX[name]; if (p.kind === 'rule' && t.mode === 'user') { note(t, 'skipped', `rules/${name}.md`, 'rules are repo-level: use --repo'); continue; }
    const files = filesOf(t, name); for (const [src, dest] of files) placeFile(t, name, src, dest);
    for (const [dest, f] of Object.entries(t.state.files)) if (f.part === name && !files.some(([, d]) => d === dest)) removeFile(t, dest); // paths this part no longer ships
    const snip = readJson(path.join(MOD, name, 'settings.json')); const hooksDir = fwd(path.join(t.base, t.hooksRel));
    if (snip) mergeSettings(t, name, (s, added) => { const r = JSON.parse(JSON.stringify(snip).split('__HOOKS_DIR__').join(hooksDir)); addPerms(s, r.permissions || {}, added); addHooks(s, r.hooks || {}, added);
      for (const [k, v] of Object.entries(r)) { if (['permissions', 'hooks'].includes(k)) continue; if (s[k] === undefined) { s[k] = v; (added.scalars ||= {})[k] = v; } else if (JSON.stringify(s[k]) !== JSON.stringify(v)) warn(t, `${name}: settings key ${k} is already ${JSON.stringify(s[k])}; left as is (the part expects ${JSON.stringify(v)})`); } }); // other keys: set only when absent, removed with the part
    if (p.kind === 'claude') addBlock(t, name, fs.readFileSync(path.join(MOD, name, 'CLAUDE.md'), 'utf8'));
    if (name === 'facts' && t.mode === 'repo') {
      const { detect } = await import('./modules/facts/detect.mjs'); const { renderFacts } = await import('./modules/facts/facts.mjs'); const det = detect(t.root);
      addBlock(t, 'facts', renderFacts(t.root, det));
      const allow = [...new Set(det.allow)].map((c) => `Bash(${c}:*)`); if (det.services.length) allow.push('Bash(docker compose ps:*)', 'Bash(docker compose logs:*)');
      if (allow.length) mergeSettings(t, 'facts', (s, added) => addPerms(s, { allow }, added));
    }
  }
  return list;
}
export function removeParts(t, names) {
  const have = installed(t); const pick = (n) => (n === 'all' || n === 'repo' ? have : GROUPS[n] ? have.filter((p) => INDEX[p].kind === GROUPS[n]) : SETS[n] ? SETS[n].filter((p) => have.includes(p)) : INDEX[n] ? [n] : die(2, `unknown part '${n}'`));
  let list = [...new Set(names.flatMap(pick))].filter((n) => have.includes(n) || console.log(`  skipped   ${n} (not installed here)`));
  const keep = list.filter((n) => have.some((o) => !list.includes(o) && (INDEX[o].requires || []).includes(n)));
  for (const n of keep) warn(t, `${n} stays: an installed part requires it`); list = list.filter((n) => !keep.includes(n));
  const extra = list.length === have.length ? Object.keys(t.state.settings.added).filter((k) => !INDEX[k]) : []; // settings added by the kit install (model, effort) go with the last part
  console.log(`dev-toolkit remove <- ${t.label}: ${list.join(', ') || 'nothing'}${t.dry ? ' (dry run: nothing is removed)' : ''}`);
  for (const name of list) {
    if (INDEX[name].kind === 'claude') removeBlock(t, name); if (name === 'facts' && t.mode === 'repo') removeBlock(t, 'facts');
    for (const dest of Object.keys(t.state.files)) if (t.state.files[dest].part === name) removeFile(t, dest);
  }
  unmergeSettings(t, [...list, ...extra]);
  return list;
}
export function finish(t, removing = false) { // exclude block (repo), empty-dir cleanup, manifest, leak check, summary
  const st = t.state, base = t.mode === 'repo' ? t.root : t.CL; st.dirs = [...new Set([...st.dirs, ...t.newDirs.map((d) => fwd(path.relative(base, d)))])].filter((d) => d && !d.startsWith('..'));
  if (removing) for (const d of [...st.dirs].sort((a, b) => b.length - a.length)) { const a = path.join(base, d); if (!t.dry && fs.existsSync(a) && !fs.readdirSync(a).length) fs.rmdirSync(a); }
  if (t.mode === 'repo') {
    const created = [...Object.entries(st.files).filter(([, f]) => f.created).map(([d]) => `.claude/${d}`), ...(st.claudeCreated ? ['CLAUDE.local.md'] : []), ...(st.settings.created ? ['.claude/settings.local.json'] : [])];
    const et = read(t.exclude) || ''; const nt = created.length ? upsertBlock(et, EX, created.map((p) => `/${p}`).join('\n'), false) : dropBlock(et, EX, false);
    if (nt !== et) writeText(t, t.exclude, nt, true);
  }
  const empty = !Object.keys(st.files).length && !Object.keys(st.settings.added).length && !st.blocks.length;
  if (empty) { if (fs.existsSync(t.stateFile)) remove(t, t.stateFile); if (st.settings.backup) console.log(`  settings backup kept: ${st.settings.backup}`); }
  else if (JSON.stringify(st) !== t.state0 && !t.dry) { fs.mkdirSync(path.dirname(t.stateFile), { recursive: true }); fs.writeFileSync(t.stateFile, JSON.stringify({ ...st, installedAt: new Date().toISOString() }, null, 2) + '\n'); }
  const c = t.counts;
  if (t.dry) return console.log(`Dry run: ${c.created} to create, ${c.updated} to update, ${c.removed} to remove, ${c.unchanged} unchanged, ${c.skipped} skipped. Nothing was written.`);
  if (t.mode === 'repo') { const ok = new Set([...lines(st.snapshot), ...lines(t.snapshot)]); const leaked = [...lines(t.porcelain())].filter((l) => !ok.has(l)); if (leaked.length) die(1, `git status changed; these paths leaked into the working tree:\n  ${leaked.join('\n  ')}`); }
  console.log(`${c.created} created, ${c.updated} updated, ${c.removed} removed, ${c.unchanged} unchanged, ${c.skipped} skipped${t.mode === 'repo' ? '; git status unchanged' : ''}.${t.warns.length ? ` ${t.warns.length} warning(s) above.` : ''}`);
  if (t.mode === 'repo' && !removing) console.log('Next: claude -> accept trust -> /orient <topic>');
}

// ---- CLI
async function main() {
  const [cmd, ...rest] = process.argv.slice(2); const F = {}; const names = [];
  for (let i = 0; i < rest.length; i++) { const a = rest[i]; if (!a.startsWith('--')) names.push(a); else if (['repo', 'home'].includes(a.slice(2)) && rest[i + 1] !== undefined) F[a.slice(2)] = rest[++i]; else if (['user', 'dry-run', 'force'].includes(a.slice(2))) F[a.slice(2)] = true; else die(2, `unknown or incomplete flag ${a} (see the header of dropin.mjs)`); }
  if (cmd === 'list') {
    for (const [n, p] of Object.entries(INDEX)) console.log(`${n.padEnd(18)}${p.kind.padEnd(10)}${(p.requires ? `needs ${p.requires.join(', ')}` : '').padEnd(14)}${p.what}`);
    for (const [s, parts] of Object.entries(SETS)) console.log(`set ${s.padEnd(14)}${parts.join(', ')}`);
    return console.log('\ngroups: skills, agents, rules    sets: repo (facts + rules + whatever ~/.claude lacks), all, and the named sets above');
  }
  if (cmd === 'facts') { const { renderFacts } = await import('./modules/facts/facts.mjs'); return console.log(renderFacts(path.resolve(names[0] || '.'))); }
  if (!['add', 'remove'].includes(cmd) || !names.length) die(2, 'usage: node dropin.mjs list | add <parts> [--repo DIR | --user] | remove <parts | all> [--repo DIR | --user] | facts [DIR]');
  if (F.user && F.repo) die(2, '--repo and --user are exclusive');
  const t = target({ mode: F.user ? 'user' : 'repo', dir: F.repo, home: F.home, dry: F['dry-run'], force: F.force });
  if (cmd === 'add') { await add(t, names); finish(t); } else { removeParts(t, names); finish(t, true); }
}
const self = path.resolve(fileURLToPath(import.meta.url)).toLowerCase(), argv1 = process.argv[1] ? path.resolve(process.argv[1]).toLowerCase() : '';
if (argv1 === self || argv1 === self.replace(/\.mjs$/, '')) await main();
