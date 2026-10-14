// setup/lib/selftest.mjs: end-to-end "is everything wired" check. Offline by default; --live adds real headless Claude probes.
// Flags: --quick (skip toolchain runs) --live --keep (keep temp dirs and print them) --banned <csv>. Prints ID | Check | Result | Detail; exit 1 on any FAIL.
// Never writes to the real ~/.claude: installs target a temp HOME; stage E2 only reads it; --live reads the guard log the real guard writes.
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
import { scenarioA, scenarioB, untrackedB, expected } from '../tests/fixture.mjs';

const TK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'); const INST = path.join(TK, 'setup/lib/install.mjs'); const DROP = path.join(TK, 'dropin.mjs'); const MOD = path.join(TK, 'modules');
const argv = process.argv.slice(2); const QUICK = argv.includes('--quick'); const LIVE = argv.includes('--live'); const KEEP = argv.includes('--keep');
const bi = argv.indexOf('--banned'); const BANNED = bi >= 0 ? (argv[bi + 1] || '').split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean) : [];
const WIN = process.platform === 'win32'; const T0 = Date.now(); const rows = [];
const TMP = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), 'tk-selftest-')));
const fwd = (p) => p.replace(/\\/g, '/'); const exists = fs.existsSync; const read = (p) => fs.readFileSync(p, 'utf8'); const readIf = (p) => (exists(p) ? read(p) : '');
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const lf = (s) => s.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
console.log(`${'ID'.padEnd(6)}${'Check'.padEnd(68)}${'Result'.padEnd(7)}Detail`);
function res(id, check, result, detail = '') { rows.push(result); console.log(`${id.padEnd(6)}${check.padEnd(68)}${result.padEnd(7)}${String(detail).replace(/\s+/g, ' ').trim().slice(0, 220)}`); }
const ok = (id, check, cond, detail = '', level = 'FAIL') => res(id, check, cond ? 'PASS' : level, cond ? '' : detail);
function sh(c, a, o = {}) { // a === null runs `c` as one shell string
  const opt = { encoding: 'utf8', windowsHide: true, timeout: o.timeout || 120000, cwd: o.cwd, env: { ...process.env, ...(o.env || {}) }, input: o.input,
    stdio: [o.input === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe'], shell: a === null, maxBuffer: 1 << 26 };
  const r = a === null ? spawnSync(c, opt) : spawnSync(c, a, opt);
  return { code: r.error ? null : r.status, out: r.stdout || '', err: `${r.stderr || ''}${r.error ? r.error.message : ''}` };
}
const tail = (r, n = 3) => `exit ${r.code}: ${`${r.out}\n${r.err}`.trim().split('\n').slice(-n).join(' | ')}`;
const walk = (d, base = d) => (!exists(d) ? [] : fs.readdirSync(d, { withFileTypes: true }).filter((e) => !['.git', 'node_modules', '.venv'].includes(e.name))
  .flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name), base) : [fwd(path.relative(base, path.join(d, e.name)))])));
const treeHash = (d) => JSON.stringify(walk(d).sort().map((f) => [f, sha(fs.readFileSync(path.join(d, f)))]));
const nlines = (p) => { const t = read(p); return t.split('\n').length - (t.endsWith('\n') ? 1 : 0); };
function write(root, map) { for (const [k, v] of Object.entries(map)) { const p = path.join(root, k); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, v); } }
const G = ['-c', 'user.name=selftest', '-c', 'user.email=selftest@example.invalid', '-c', 'commit.gpgsign=false'];
function mkRepo(name, files, untracked) {
  const d = path.join(TMP, name); fs.mkdirSync(d, { recursive: true }); write(d, files);
  sh('git', ['init', '-q'], { cwd: d }); sh('git', ['config', 'core.autocrlf', 'false'], { cwd: d });
  sh('git', [...G, 'add', '-A'], { cwd: d }); sh('git', [...G, 'commit', '-q', '-m', 'fixture'], { cwd: d }); if (untracked) write(d, untracked); return d;
}
const porc = (d) => sh('git', ['status', '--porcelain'], { cwd: d }).out;
const gitPath = (d, p) => path.resolve(d, sh('git', ['rev-parse', '--git-path', p], { cwd: d }).out.trim());
function fm(text) { // tiny YAML frontmatter reader: `key: value`, quoted scalars, inline [a, b] and block `- item` lists
  const m = /^---\n([\s\S]*?)\n---\n/.exec(lf(text)); if (!m) return null; const o = {}; let last = null;
  const unq = (v) => { v = v.trim(); if (/^".*"$/.test(v)) return JSON.parse(v); if (/^'.*'$/.test(v)) return v.slice(1, -1).replace(/''/g, "'"); if (/^\[.*\]$/.test(v)) return v.slice(1, -1).split(',').map(unq).filter(Boolean); return v; };
  for (const l of m[1].split('\n')) {
    const kv = /^([\w-]+):\s*(.*)$/.exec(l); const item = /^\s+-\s+(.*)$/.exec(l);
    if (kv) { last = kv[1]; o[last] = kv[2] === '' ? [] : unq(kv[2]); } else if (item && Array.isArray(o[last])) o[last].push(unq(item[1])); else if (l.trim() && !l.trim().startsWith('#')) return null;
  }
  return o;
}
function gitBash() {
  if (!WIN) return 'bash';
  const c = [process.env.CLAUDE_CODE_GIT_BASH_PATH, 'C:/Program Files/Git/bin/bash.exe', 'C:/Program Files (x86)/Git/bin/bash.exe', process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Programs/Git/bin/bash.exe')];
  for (const g of sh('where', ['git']).out.split(/\r?\n/)) if (/[\\/]cmd[\\/]git\.exe$/i.test(g.trim())) c.push(path.join(g.trim(), '../../bin/bash.exe'));
  return c.find((p) => p && exists(p)) || null;
}
const BASH = gitBash();
const psFile = (file, args, env) => sh('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', file, ...args], { env, timeout: 180000 });
const psCmd = (script, o = {}) => sh('powershell', ['-NoProfile', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')], o);
const decisionOf = (out) => { try { const h = JSON.parse(out.trim()).hookSpecificOutput; return { d: h.permissionDecision, why: h.permissionDecisionReason || '' }; } catch { return { d: out.trim() ? 'unparsed' : null, why: '' }; } };
const settingsCmds = (s) => Object.entries(s?.hooks || {}).flatMap(([ev, gs]) => gs.flatMap((g) => (g.hooks || []).map((h) => [ev, h.command || ''])));
const scriptOf = (c) => (/"([^"]+\.mjs)"/.exec(c) || [])[1];
const drop = (args, env) => sh('node', [DROP, ...args], { env });

// A: static checks on the parts
let INDEX = {}; try { INDEX = JSON.parse(read(path.join(MOD, 'index.json'))); } catch { /* reported in A1 */ }
const byKind = (k) => Object.keys(INDEX).filter((n) => INDEX[n].kind === k);
const SK = path.join(MOD, 'skills'); const AG = path.join(MOD, 'agents'); const RU = path.join(MOD, 'rules');
const skills = exists(SK) ? fs.readdirSync(SK).filter((d) => exists(path.join(SK, d, 'SKILL.md'))) : [];
const isPart = (f) => f.endsWith('.md') && !/^readme\.md$/i.test(f); // each module folder may carry a README.md next to its parts
const agents = exists(AG) ? fs.readdirSync(AG).filter(isPart).map((f) => f.slice(0, -3)) : [];
const rules = exists(RU) ? fs.readdirSync(RU).filter(isPart) : [];
const hookSrc = byKind('hook').flatMap((n) => (INDEX[n].files || []).map((f) => [n, f, path.join(MOD, n, f)])); // [part, file, source]
const HK = path.join(TMP, 'hooks'); fs.mkdirSync(HK); for (const [, f, s] of hookSrc) if (exists(s)) fs.copyFileSync(s, path.join(HK, f)); // hooks run from one dir, as installed
const hookMods = hookSrc.map(([, f]) => f);
const JSONS = ['modules/index.json', 'modules/sets.json', 'modules/permissions/settings.json', 'modules/guard/settings.json', 'modules/gate/settings.json', 'modules/trail/settings.json', 'modules/gate-workflow/settings.json', 'setup/tests/hook-cases.json', 'setup/mcp.json.example'];
const jsonBad = JSONS.filter((f) => { try { JSON.parse(read(path.join(TK, f))); return false; } catch { return true; } });
ok('A1', 'index.json, settings snippets, hook-cases.json, mcp.json.example parse', !jsonBad.length, `invalid: ${jsonBad.join(', ')}`);
const SKEYS = ['name', 'description', 'argument-hint', 'arguments', 'disable-model-invocation', 'user-invocable', 'allowed-tools', 'context', 'paths', 'model', 'effort'];
const AKEYS = ['name', 'description', 'tools', 'disallowedTools', 'model', 'skills', 'maxTurns', 'permissionMode', 'effort', 'isolation', 'color'];
const fmBad = (dir, names, file, keys) => names.flatMap((n) => { const f = fm(read(path.join(dir, file(n)))); if (!f) return [`${n}: no frontmatter`];
  return [...(f.name !== n ? [`${n}: name=${f.name}`] : []), ...(!f.description ? [`${n}: no description`] : []), ...Object.keys(f).filter((k) => !keys.includes(k)).map((k) => `${n}: key ${k}`)]; });
const sBad = fmBad(SK, skills, (n) => `${n}/SKILL.md`, SKEYS); ok('A2', `skill frontmatter (${skills.length} skills)`, skills.length === byKind('skill').length && !sBad.length, sBad.join('; ') || `found ${skills.length}`);
const aBad = fmBad(AG, agents, (n) => `${n}.md`, AKEYS); ok('A3', `agent frontmatter (${agents.length} agents)`, agents.length === byKind('agent').length && !aBad.length, aBad.join('; ') || `found ${agents.length}`);
const rBad = rules.filter((r) => { const p = fm(read(path.join(RU, r)))?.paths; return !Array.isArray(p) || !p.length || p.some((x) => typeof x !== 'string'); });
ok('A4', `rule paths are YAML lists of strings (${rules.length} rules)`, rules.length >= 5 && !rBad.length, rBad.join(', ') || `found ${rules.length}`);
const budget = [['modules/house-rules/CLAUDE.md', 60], ...rules.map((r) => [`modules/rules/${r}`, 45]), ...skills.map((s) => [`modules/skills/${s}/SKILL.md`, 90]),
  ...hookSrc.map(([n, f]) => [`modules/${n}/${f}`, 70]), ...agents.map((a) => [`modules/agents/${a}.md`, 40])];
const over = budget.filter(([f, n]) => !exists(path.join(TK, f)) || nlines(path.join(TK, f)) > n).map(([f, n]) => `${f} ${exists(path.join(TK, f)) ? nlines(path.join(TK, f)) : 'missing'}>${n}`);
ok('A5', 'line budgets (CLAUDE.md 60, rules 45, skills 90, hooks 70, agents 40)', !over.length, over.join(', '));
const all = walk(TK); const crBad = all.filter((f) => /\.(mjs|md|json|sh|example)$/.test(f) && read(path.join(TK, f)).includes('\r'));
const asciiBad = all.filter((f) => /\.(ps1|cmd)$/.test(f) && /[^\x00-\x7F]/.test(read(path.join(TK, f))));
ok('A6', 'no CR in .mjs/.md/.json/.sh; .ps1/.cmd are ASCII', !crBad.length && !asciiBad.length, `CR: ${crBad.join(', ')} non-ASCII: ${asciiBad.join(', ')}`);
const chk = all.filter((f) => f.endsWith('.mjs')).map((f) => [f, sh('node', ['--check', path.join(TK, f)])]).filter(([, r]) => r.code !== 0);
ok('A7', 'node --check on every .mjs', !chk.length, chk.map(([f, r]) => `${f}: ${tail(r, 1)}`).join('; '));
const snippet = (n) => { try { return JSON.parse(read(path.join(MOD, n, 'settings.json'))); } catch { return {}; } };
const hookRefs = ['guard', 'gate', 'trail'].flatMap((n) => settingsCmds(snippet(n)).map(([, c]) => (/__HOOKS_DIR__\/([\w.-]+\.mjs)/.exec(c) || [])[1]));
ok('A8', 'every hook command references a script a hook part ships', hookRefs.length >= 6 && hookRefs.every((h) => h && hookMods.includes(h)), `refs: ${hookRefs.join(', ')}`);
const perms = ['allow', 'ask', 'deny'].flatMap((k) => snippet('permissions').permissions?.[k] || []);
const pBad = perms.filter((p) => !/^(Bash|Read|Edit)\(.+\)$/.test(p) || (p.startsWith('Bash(') && !p.endsWith(':*)')));
ok('A9', `permission rules are well formed (${perms.length})`, perms.length > 0 && !pBad.length, pBad.join(', '));
const BUILTIN = ['plan', 'review', 'init', 'verify', 'code-review', 'simplify', 'security-review', 'run', 'loop', 'compact', 'doctor', 'memory', 'hooks', 'agents', 'model', 'status'];
ok('A10', 'skill names avoid built-in commands', !skills.some((s) => BUILTIN.includes(s)), skills.filter((s) => BUILTIN.includes(s)).join(', '));
const cmd = readIf(path.join(MOD, 'house-rules/CLAUDE.md')); const miss = [...skills.filter((s) => !new RegExp(`/${s}\\b`).test(cmd)), ...agents.filter((a) => !cmd.includes(a))];
ok('A11', 'CLAUDE.md names every skill (/name) and agent', !miss.length, `missing: ${miss.join(', ')}`);
const preBad = agents.flatMap((a) => { const s = fm(read(path.join(AG, `${a}.md`)))?.skills; return (Array.isArray(s) ? s : s ? String(s).split(',') : []).map((x) => x.trim()).filter((x) => !skills.includes(x)).map((x) => `${a}->${x}`); });
ok('A12', 'agent skills: preloads name existing skills', !preBad.length, preBad.join(', '));
if (!BANNED.length) res('A13', 'banned-term scan', 'SKIP', 'pass -Banned "<csv>" to run it');
else {
  const re = new RegExp(`(?<![A-Za-z0-9_])(${BANNED.map((b) => b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(?![A-Za-z0-9_])`, 'i');
  const screen = all.filter((f) => !/^(docs\/|practice\/|Quickstart\.md$)/.test(f)); // what the mirror installs; docs, practice and the Quickstart never reach ~/.claude
  const hits = screen.flatMap((f) => read(path.join(TK, f)).split('\n').map((l, i) => (re.test(l) ? `${f}:${i + 1}` : null)).filter(Boolean));
  ok('A13', `banned-term scan (${BANNED.length} terms, ${screen.length} files that the mirror installs)`, !hits.length, hits.slice(0, 12).join(', '));
}
const catBad = [...Object.entries(INDEX).flatMap(([n, p]) => { // every catalog entry has its files; every file has an entry; requires exist
  const need = p.kind === 'skill' ? [`skills/${n}/SKILL.md`] : p.kind === 'agent' ? [`agents/${n}.md`] : p.kind === 'rule' ? [`rules/${n}.md`] : ['hook', 'workflow'].includes(p.kind) ? (p.files || ['?']).map((f) => `${n}/${f}`) : p.kind === 'claude' ? [`${n}/CLAUDE.md`] : p.kind === 'settings' ? [`${n}/settings.json`] : ['?'];
  return [...need.filter((f) => !exists(path.join(MOD, f))).map((f) => `${n}: missing ${f}`), ...(p.requires || []).filter((r) => !INDEX[r]).map((r) => `${n}: requires unknown ${r}`), ...(p.what ? [] : [`${n}: no what`])]; }),
  ...skills.filter((s) => INDEX[s]?.kind !== 'skill').map((s) => `skill ${s} not in index`), ...agents.filter((a) => INDEX[a]?.kind !== 'agent').map((a) => `agent ${a} not in index`), ...rules.filter((r) => INDEX[r.slice(0, -3)]?.kind !== 'rule').map((r) => `rule ${r} not in index`)];
ok('A14', `catalog matches the module files (${Object.keys(INDEX).length} parts)`, Object.keys(INDEX).length >= 20 && !catBad.length, catBad.join('; '));
const listed = drop(['list']); ok('A15', 'dropin.mjs list prints every part', listed.code === 0 && Object.keys(INDEX).every((n) => new RegExp(`^${n}\\s`, 'm').test(listed.out)), tail(listed, 1));
const wfs = byKind('workflow').flatMap((n) => (INDEX[n].files || []).map((f) => `modules/${n}/${f}`));
const wfBad = wfs.filter((f) => { const t = readIf(path.join(TK, f)); if (!/^export const meta = \{/m.test(t)) return true; // a workflow is a function body (top-level return and await): parse it wrapped, never evaluate it
  return sh('node', ['--check'], { input: `(async () => {\n${t.replace(/^export const meta =/m, 'const meta =')}\n})` }).code !== 0; });
ok('A16', `workflow scripts export meta and parse (${wfs.length})`, wfs.length >= 1 && !wfBad.length, wfBad.join(', '));
let SETS = {}; try { SETS = JSON.parse(read(path.join(MOD, 'sets.json'))); } catch { /* reported in A1 */ }
const setBad = Object.entries(SETS).flatMap(([s, parts]) => parts.filter((p) => !INDEX[p]).map((p) => `${s}: ${p}`));
const README_TK = readIf(path.join(TK, 'README.md')); const unlisted = Object.keys(INDEX).filter((n) => !new RegExp(`\`${n}\``).test(README_TK));
ok('A17', 'sets name real parts; README.md lists every part and set', !setBad.length && !unlisted.length && Object.keys(SETS).every((s) => README_TK.includes(`\`${s}\``)), [setBad.join(', '), unlisted.length ? `not in README: ${unlisted.join(', ')}` : ''].filter(Boolean).join('; '));
const CMDS = new Set([...skills, ...byKind('workflow').map((w) => w.replace(/-workflow$/, '')), ...BUILTIN, 'hooks', 'skills', 'agents', 'model', 'tasks', 'btw', 'rewind', 'compact', 'context', 'permissions', 'exit', 'logout', 'login', 'status', 'workflows', 'batch', 'help', 'memory', 'skill-doctor', 'effort', 'config', 'export', 'rename', 'clear', 'resume', 'fast', 'mcp', 'plugin', 'commit-commands:commit-push-pr', 'pr-review-toolkit:review-pr', 'commit-commands:commit']);
const docFiles = ['README.md', 'Quickstart.md', 'modules/house-rules/CLAUDE.md', ...walk(path.join(TK, 'docs')).map((f) => `docs/${f}`)].filter((f) => exists(path.join(TK, f)));
const badRefs = docFiles.flatMap((f) => [...new Set([...readIf(path.join(TK, f)).matchAll(/(?<=^|[\s`(])\/([a-z][\w:-]*)(?=$|[\s`),.;:])/gm)].map((m) => m[1]))].filter((c) => !CMDS.has(c)).map((c) => `${f}: /${c}`));
ok('A18', 'every /command in README.md, docs/ and the house rules is a skill, a workflow or a known command', !badRefs.length, badRefs.slice(0, 10).join(', '));
const GENERIC = new RegExp(`\\b(${['inter' + 'view\\w*', 'pan' + 'el\\w*', 'candi' + 'date\\w*', 'recruit\\w*', 'hiring', 'customer\\.?io', 'quin' + 'dar'].join('|')})\\b`, 'i'); // split so A13 never matches this line
const payload = walk(MOD);
const leaks = payload.filter((f) => GENERIC.test(readIf(path.join(MOD, f)))).map((f) => `${f}: "${GENERIC.exec(readIf(path.join(MOD, f)))[0]}"`);
ok('A19', `payload wording is generic (${payload.length} files under modules/)`, !leaks.length, leaks.join(', '));

// B: hook contracts (run from the staged hooks dir, the layout they are installed in)
let cases = []; try { cases = JSON.parse(read(path.join(TK, 'setup/tests/hook-cases.json'))); } catch { /* reported in A1 */ }
const hookHome = path.join(TMP, 'hook-home'); fs.mkdirSync(hookHome); const henv = { HOME: hookHome, USERPROFILE: hookHome };
const times = []; const gBad = [];
for (const c of cases.filter((x) => x.hook === 'guard')) {
  const t = process.hrtime.bigint(); const r = sh('node', [path.join(HK, 'guard.mjs')], { input: typeof c.stdin === 'string' ? c.stdin : JSON.stringify(c.stdin), env: henv, timeout: 10000 });
  const ms = Number(process.hrtime.bigint() - t) / 1e6; times.push(ms); const { d, why } = decisionOf(r.out);
  if (r.code !== c.expect.exit || d !== c.expect.decision || (c.expect.reasonIncludes && !why.includes(c.expect.reasonIncludes))) gBad.push(`${c.id} (exit ${r.code}, got ${d})`);
}
times.sort((a, b) => a - b); const p50 = times[Math.floor(times.length / 2)] || 0; const mx = times[times.length - 1] || 0;
ok('B1', `guard contract cases (${times.length})`, times.length >= 40 && !gBad.length, gBad.join('; ') || `only ${times.length} cases`);
res('B2', 'guard latency (node spawn included)', mx > 3000 ? 'FAIL' : p50 > 500 ? 'WARN' : 'PASS', `p50 ${p50.toFixed(0)} ms, max ${mx.toFixed(0)} ms`);
const gateBad = []; const gcases = cases.filter((x) => x.hook === 'gate');
for (const c of gcases) {
  const repo = mkRepo(`gate-${c.id}`, scenarioA); const non = path.join(TMP, `nogit-${c.id}`); const tmp = path.join(TMP, `gtmp-${c.id}`); fs.mkdirSync(non); fs.mkdirSync(tmp);
  const env = { ...henv, TMP: tmp, TEMP: tmp, TMPDIR: tmp, TK_GATE: '' };
  const fill = (v) => (typeof v === 'string' ? v.replace('__REPO__', repo).replace('__NONREPO__', non) : Array.isArray(v) ? v.map(fill) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, fill(x)])) : v);
  const setup = () => {
    if (['edit-src', 'gate-off'].includes(c.setup)) fs.appendFileSync(path.join(repo, 'src/calc.py'), '\n# edited\n');
    if (c.setup === 'edit-docs') fs.appendFileSync(path.join(repo, 'README.md'), '\nMore notes.\n');
    if (c.setup === 'gate-off') fs.writeFileSync(gitPath(repo, 'dev-toolkit-gate-off'), '');
  };
  c.steps.forEach((st, i) => {
    if (i === (c.setupBeforeStep ?? 0)) setup();
    const r = sh('node', [path.join(HK, 'gate.mjs')], { input: typeof st.stdin === 'string' ? st.stdin : JSON.stringify(fill(st.stdin)), env, timeout: 10000 });
    let block = false; try { block = JSON.parse(r.out.trim().split('\n').pop()).decision === 'block'; } catch { /* plain text or empty */ }
    if (r.code !== st.expect.exit || block !== st.expect.block || (st.expect.stdoutIncludes && !r.out.includes(st.expect.stdoutIncludes))) gateBad.push(`${c.id}#${i} (exit ${r.code}, block ${block})`);
  });
}
ok('B3', `gate sequence cases (${gcases.length})`, gcases.length >= 8 && !gateBad.length, gateBad.join('; ') || `only ${gcases.length} cases`);
const trailIn = { hook_event_name: 'UserPromptSubmit', session_id: 'selftest', cwd: TMP, prompt: 'fix the bug; token ghp_abcdefghijklmnopqrstuvwxyz0123456789, password=hunter2hunter2, {"password": "hunter2hunter2"}, https://u:pw12345@h/x, sha 0123456789abcdef0123456789abcdef01234567, path /c/Users/someone/AppData/Local/Temp/a-very-long-directory-name-for-the-test' };
const tr = sh('node', [path.join(HK, 'trail.mjs')], { input: JSON.stringify(trailIn), env: henv, timeout: 10000 }); const trailLog = readIf(path.join(hookHome, '.claude/logs/trail.jsonl'));
const tr2 = sh('node', [path.join(HK, 'trail.mjs')], { input: JSON.stringify({ ...trailIn, hook_event_name: 'PreToolUse' }), env: henv, timeout: 10000 });
let logged = null; try { logged = JSON.parse(trailLog.trim().split('\n')[0]).prompt; } catch { /* checked below */ }
const want = 'fix the bug; token ***, password=***, {"password": ***"}, https://u:***@h/x, sha 0123456789abcdef0123456789abcdef01234567, path /c/Users/someone/AppData/Local/Temp/a-very-long-directory-name-for-the-test';
ok('B4', 'trail hook: logs a redacted prompt line (tokens, passwords, quoted keys, URL credentials; SHAs and paths kept), prints nothing, ignores other events', tr.code === 0 && !tr.out.trim() && logged === want && tr2.code === 0 && readIf(path.join(hookHome, '.claude/logs/trail.jsonl')) === trailLog, `exit ${tr.code}; out ${JSON.stringify(tr.out.slice(0, 60))}; logged ${JSON.stringify(logged)}`);

// E1: the kit install into a temp HOME (runs before C, which uses it as DEV_TOOLKIT_HOME)
const GW = path.join(TMP, 'whatif-home'); fs.mkdirSync(GW);
if (WIN) { const gw = psFile(path.join(TK, 'install-global.ps1'), ['-Home', GW, '-Plugins', 'none', '-WhatIf']); ok('E1.0', 'install-global.ps1 -WhatIf is a dry run (writes nothing)', gw.code === 0 && /dry run/.test(gw.out) && !walk(GW).length, `${tail(gw, 1)}; files ${walk(GW).length}`); }
const GH = path.join(TMP, 'home'); const seed = { theme: 'dark', model: 'seed-model', effortLevel: 'xhigh', enabledPlugins: { 'example-plugin@example-market': true }, permissions: { allow: ['Bash(make:*)'] }, custom: { keep: [1, 2] } };
const seedText = JSON.stringify(seed, null, 2) + '\n'; write(GH, { '.claude/settings.json': seedText }); const GS = path.join(GH, '.claude/settings.json');
const g1 = sh('node', [INST, 'global', '--plugins', 'none', '--home', GH]); ok('E1.1', 'global install into temp HOME exits 0', g1.code === 0, tail(g1));
let gs = {}; try { gs = JSON.parse(read(GS)); } catch { /* checked below */ }
ok('E1.2', 'unrelated settings keys preserved', gs.theme === 'dark' && JSON.stringify(gs.enabledPlugins) === JSON.stringify(seed.enabledPlugins) && JSON.stringify(gs.custom) === JSON.stringify(seed.custom) && gs.permissions?.allow?.[0] === 'Bash(make:*)', JSON.stringify(gs).slice(0, 200));
const userHooks = hookSrc.filter(([n]) => !INDEX[n].optIn).map(([, f]) => f);
const placed = [...skills.map((s) => `skills/${s}/SKILL.md`), ...agents.map((a) => `agents/${a}.md`), ...userHooks.map((h) => `hooks/${h}`), ...wfs.map((f) => `workflows/${path.basename(f)}`), 'dev-toolkit/install.ps1', 'dev-toolkit/dropin.mjs', 'dev-toolkit/setup/lib/install.mjs', 'CLAUDE.md'];
const gMiss = placed.filter((p) => !exists(path.join(GH, '.claude', p))); ok('E1.3', 'skills, agents, hooks, dev-toolkit mirror, CLAUDE.md block present', !gMiss.length && readIf(path.join(GH, '.claude/CLAUDE.md')).includes('<!-- dev-toolkit:begin -->'), `missing: ${gMiss.join(', ')}`);
const gcmd = settingsCmds(gs).find(([ev, c]) => ev === 'PreToolUse' && /guard\.mjs/.test(c))?.[1] || '';
ok('E1.4', 'guard hook rendered with an absolute path that exists', gcmd && !gcmd.includes('__HOOKS_DIR__') && exists(scriptOf(gcmd) || ''), gcmd || 'no guard entry');
ok('E1.5', 'gate hooks are not registered globally; no rules in ~/.claude', !settingsCmds(gs).some(([, c]) => /gate\.mjs/.test(c)) && !exists(path.join(GH, '.claude/rules')), 'gate.mjs in ~/.claude/settings.json, or ~/.claude/rules exists');
const h1 = treeHash(path.join(GH, '.claude')); const g2 = sh('node', [INST, 'global', '--plugins', 'none', '--home', GH]);
ok('E1.6', 'second global install is idempotent', g2.code === 0 && treeHash(path.join(GH, '.claude')) === h1, tail(g2));

// C: the repo set into sample repos (Python + Node + Go) through install.ps1 / install.sh, with the temp HOME as the user layer
const A = mkRepo('A', scenarioA); const B = mkRepo('B', scenarioB, untrackedB); const sA = porc(A); const sB = porc(B);
const env = { DEV_TOOLKIT_HOME: GH };
const map = { '': ['add', 'repo'], '-Gate': ['add', 'repo', 'gate'], '-Uninstall': ['remove', 'all'], '-DryRun': ['add', 'repo', '--dry-run'] };
const insA = (...x) => (WIN ? psFile(path.join(TK, 'install.ps1'), ['-Target', A, ...x], env) : drop([...map[x[0] || ''], '--repo', A], env));
const insB = (...x) => (BASH ? sh(BASH, [fwd(path.join(TK, 'install.sh')), '--target', fwd(B), ...x], { env }) : null);
const hA0 = treeHash(A); const dr = insA('-DryRun');
ok('C0', 'install -DryRun writes nothing', dr.code === 0 && treeHash(A) === hA0 && porc(A) === sA && !exists(gitPath(A, 'dev-toolkit.json')), tail(dr));
if (WIN) {
  const pristine = () => treeHash(A) === hA0 && porc(A) === sA && !exists(gitPath(A, 'dev-toolkit.json'));
  const wi = insA('-WhatIf'); ok('C0.1', 'install.ps1 -WhatIf is a dry run (writes nothing)', wi.code === 0 && /dry run/.test(wi.out) && pristine(), tail(wi));
  const ty = insA('-Unistall'); ok('C0.2', 'install.ps1 rejects a misspelled flag (-Unistall), writes nothing', ty.code !== 0 && pristine(), tail(ty));
}
const a1 = insA(); ok('C1', `${WIN ? 'install.ps1 -Target <A>' : 'dropin add repo --repo <A>'} exits 0`, a1.code === 0, tail(a1));
const b1 = insB(); if (!b1) res('C2', 'install.sh --target <B> exits 0', 'WARN', 'Git Bash not found: skipped'); else ok('C2', 'install.sh --target <B> (Git Bash) exits 0', b1.code === 0, tail(b1));
const la = readIf(path.join(A, 'CLAUDE.local.md')); const lb = readIf(path.join(B, 'CLAUDE.local.md'));
ok('C3', "A's CLAUDE.local.md lists uv run --frozen pytest, npm test, go test ./...", expected.A.test.every((c) => la.includes(`\`${c}\``)), la.slice(0, 200));
ok('C4', "B's CLAUDE.local.md: make test first, @AGENTS.md", (/\| test \| `([^`]+)`/.exec(lb) || [])[1] === expected.B.testFirst && lb.includes('@AGENTS.md'), lb.slice(0, 200));
const allowOf = (d) => { try { return JSON.parse(read(path.join(d, '.claude/settings.local.json'))).permissions?.allow || []; } catch { return null; } };
const allows = (d, c) => (allowOf(d) || []).some((r) => { const m = /^Bash\((.+):\*\)$/.exec(r); return m && c.startsWith(m[1]); });
ok('C5', 'settings.local.json parses and allows the detected test commands', allowOf(A) && allowOf(B) && expected.A.test.every((c) => allows(A, c)) && allows(B, expected.B.testFirst), JSON.stringify(allowOf(A)));
ok('C6', "B's tracked CLAUDE.md and .claude/settings.json are byte-identical", readIf(path.join(B, 'CLAUDE.md')) === scenarioB['CLAUDE.md'] && readIf(path.join(B, '.claude/settings.json')) === scenarioB['.claude/settings.json'], 'tracked file changed');
ok('C7', 'git status --porcelain unchanged in A and B; the user layer is not duplicated into the repo', porc(A) === sA && porc(B) === sB && !la.includes('<!-- dev-toolkit:begin -->') && !exists(path.join(A, '.claude/hooks/tk/guard.mjs')), `${porc(A)} | ${porc(B)} | rules block: ${la.includes('<!-- dev-toolkit:begin -->')}`);
const tA = treeHash(A); const tB = treeHash(B); const a2 = insA(); const b2 = insB();
const once = (d) => (readIf(gitPath(d, 'info/exclude')).match(/# >>> dev-toolkit/g) || []).length === 1;
ok('C8', 'second run: identical file hashes; exclude block exactly once', a2.code === 0 && treeHash(A) === tA && (!b2 || (b2.code === 0 && treeHash(B) === tB)) && once(A) && once(B), `${tail(a2, 1)} ${b2 ? tail(b2, 1) : ''}`);
ok('C9', "B's pre-existing CLAUDE.local.md text is preserved", lb.endsWith(`\n${untrackedB['CLAUDE.local.md']}`), JSON.stringify(lb.slice(-40)));
const ag = insA('-Gate'); let ls = {}; try { ls = JSON.parse(read(path.join(A, '.claude/settings.local.json'))); } catch { /* checked below */ }
const gateCmds = settingsCmds(ls).filter(([, c]) => /gate\.mjs/.test(c));
ok('C10', '-Gate adds the 4 gate entries (scripts exist)', ag.code === 0 && gateCmds.length === 4 && gateCmds.every(([, c]) => exists(scriptOf(c) || '')) && porc(A) === sA, `${tail(ag, 1)}; gate entries ${gateCmds.length}`);
const P = mkRepo('P', scenarioA); const sP = porc(P); const empty = path.join(TMP, 'empty-home'); fs.mkdirSync(empty);
const pr = drop(['add', 'all', '--repo', P], { DEV_TOOLKIT_HOME: empty }); let ps = {}; try { ps = JSON.parse(read(path.join(P, '.claude/settings.local.json'))); } catch { /* checked below */ }
const pcmd = settingsCmds(ps).find(([ev, c]) => ev === 'PreToolUse' && /guard\.mjs/.test(c))?.[1] || '';
const pdeny = pcmd && BASH ? decisionOf(sh(BASH, ['-c', pcmd], { input: JSON.stringify({ hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'git push --force' } }), env: henv }).out).d : 'skipped';
ok('C11', 'add all (portable) without a user layer registers the guard locally', pr.code === 0 && fwd(scriptOf(pcmd) || '').startsWith(fwd(P)) && exists(path.join(P, '.claude/skills/check/SKILL.md')) && readIf(path.join(P, 'CLAUDE.local.md')).includes('<!-- dev-toolkit:begin -->') && ['deny', 'skipped'].includes(pdeny) && porc(P) === sP, `${tail(pr, 1)}; guard ${pcmd}; decision ${pdeny}`);
const R = mkRepo('R', { 'README.md': 'x\n' }); fs.cpSync(TK, path.join(R, 'tk'), { recursive: true, filter: (s) => !/[\\/]\.git$/.test(s) });
const rr = sh('node', [path.join(R, 'tk/dropin.mjs'), 'add', 'repo', '--repo', R, '--dry-run'], { env }); ok('C12', 'installing into a repo that contains the toolkit exits 2', rr.code === 2, tail(rr));
const ua = insA('-Uninstall'); const ub = insB('--uninstall'); const up = drop(['remove', 'all', '--repo', P], { DEV_TOOLKIT_HOME: empty });
const clean = (d) => !readIf(gitPath(d, 'info/exclude')).includes('dev-toolkit') && !exists(gitPath(d, 'dev-toolkit.json'));
ok('C13', '--uninstall restores porcelain, B user text, exclude file', ua.code === 0 && up.code === 0 && porc(A) === sA && porc(P) === sP && clean(A) && clean(P) && !exists(path.join(A, 'CLAUDE.local.md')) && !exists(path.join(A, '.claude')) && !exists(path.join(P, '.claude'))
  && (!ub || (ub.code === 0 && porc(B) === sB && read(path.join(B, 'CLAUDE.local.md')) === untrackedB['CLAUDE.local.md'] && clean(B))), `${tail(ua, 1)} ${ub ? tail(ub, 1) : ''} ${tail(up, 1)}`);
const g4 = sh('node', [INST, 'global', '--plugins', 'none', '--home', GH, '--model', 'probe-model', '--effort', 'low']); let g4s = {}; try { g4s = JSON.parse(read(GS)); } catch { /* checked below */ }
ok('E1.7', '--model/--effort replace the existing model and effortLevel', g4.code === 0 && g4s.model === 'probe-model' && g4s.effortLevel === 'low', `${tail(g4, 1)}; model ${g4s.model}, effortLevel ${g4s.effortLevel}`);
const g3 = sh('node', [INST, 'global', '--uninstall', '--home', GH]);
ok('E1.8', 'global --uninstall restores the seed settings bytes (incl. model)', g3.code === 0 && readIf(GS) === seedText && !exists(path.join(GH, '.claude/dev-toolkit')) && !exists(path.join(GH, '.claude/skills/check')) && !exists(path.join(GH, '.claude/CLAUDE.md')), tail(g3));

// E1.9: --home must keep `claude plugin` away from the real profile (a logging claude shim stands in for claude)
const SHIM = path.join(TMP, 'shim'); const CALLS = path.join(SHIM, 'calls.log'); fs.mkdirSync(SHIM);
if (WIN) fs.writeFileSync(path.join(SHIM, 'claude.cmd'), ['@echo off', '>>"%~dp0calls.log" echo(%*', 'exit /b 0', ''].join('\r\n'));
else { fs.writeFileSync(path.join(SHIM, 'claude'), '#!/bin/sh\necho "$*" >> "$(dirname "$0")/calls.log"\n'); fs.chmodSync(path.join(SHIM, 'claude'), 0o755); }
const PK = Object.keys(process.env).find((k) => k.toUpperCase() === 'PATH') || 'PATH'; const GP = path.join(TMP, 'plugin-home');
const g5 = sh('node', [INST, 'global', '--home', GP], { env: { [PK]: `${SHIM}${path.delimiter}${process.env[PK] || ''}` } }); const calls = readIf(CALLS);
ok('E1.9', 'global --home <temp> (default plugins) never calls claude plugin', g5.code === 0 && /skipped \(--home/.test(g5.out) && !/plugin/.test(calls), `${tail(g5, 1)}; shim calls: ${calls.trim().split(/\r?\n/).join(' | ')}`);

// G: one part at a time (the a-la-carte path), repo and user
const Gr = mkRepo('G', scenarioA); const sG = porc(Gr); const hG0 = treeHash(Gr); const genv = { DEV_TOOLKIT_HOME: empty };
const g6 = drop(['add', 'check', 'reviewer', '--repo', Gr], genv); const exG = readIf(gitPath(Gr, 'info/exclude'));
ok('G1', 'add check reviewer: both files, listed in info/exclude, no settings file, porcelain unchanged', g6.code === 0 && exists(path.join(Gr, '.claude/skills/check/SKILL.md')) && exists(path.join(Gr, '.claude/agents/reviewer.md')) && exG.includes('/.claude/skills/check/SKILL.md') && exG.includes('/.claude/agents/reviewer.md') && !exists(path.join(Gr, '.claude/settings.local.json')) && porc(Gr) === sG, tail(g6));
const g7 = drop(['add', 'gate', '--repo', Gr], genv); let gsl = {}; try { gsl = JSON.parse(read(path.join(Gr, '.claude/settings.local.json'))); } catch { /* checked below */ }
ok('G2', 'add gate pulls facts: detect.mjs, facts block, allowlist, 4 gate entries', g7.code === 0 && /facts, gate/.test(g7.out) && exists(path.join(Gr, '.claude/hooks/tk/detect.mjs')) && exists(path.join(Gr, '.claude/hooks/tk/gate.mjs')) && readIf(path.join(Gr, 'CLAUDE.local.md')).includes('<!-- dev-toolkit:facts:begin -->') && settingsCmds(gsl).filter(([, c]) => /gate\.mjs/.test(c)).length === 4 && allows(Gr, 'uv run --frozen pytest') && porc(Gr) === sG, tail(g7));
const g8 = drop(['remove', 'facts', '--repo', Gr], genv); const g9 = drop(['remove', 'gate', '--repo', Gr], genv); let gsl2 = {}; try { gsl2 = JSON.parse(read(path.join(Gr, '.claude/settings.local.json'))); } catch { /* checked below */ }
ok('G3', 'remove facts is refused while gate needs it; remove gate keeps facts', g8.code === 0 && /facts stays/.test(g8.out) && exists(path.join(Gr, '.claude/hooks/tk/detect.mjs')) && g9.code === 0 && !exists(path.join(Gr, '.claude/hooks/tk/gate.mjs')) && !settingsCmds(gsl2).some(([, c]) => /gate\.mjs/.test(c)) && readIf(path.join(Gr, 'CLAUDE.local.md')).includes('facts:begin'), `${tail(g8, 1)} | ${tail(g9, 1)}`);
const g10 = drop(['remove', 'all', '--repo', Gr], genv);
ok('G4', 'remove all returns the repo to its pre-install tree', g10.code === 0 && treeHash(Gr) === hG0 && porc(Gr) === sG && clean(Gr) && !exists(path.join(Gr, '.claude')), tail(g10));
const U = path.join(TMP, 'user-home'); const g11 = drop(['add', 'orient', '--user', '--home', U]); const g12 = drop(['remove', 'orient', '--user', '--home', U]);
ok('G5', 'add/remove one skill --user: file placed, no settings file created, home left empty', g11.code === 0 && /orient/.test(g11.out) && !exists(path.join(U, '.claude/settings.json')) && g12.code === 0 && !walk(path.join(U, '.claude')).length, `${tail(g11, 1)} | ${tail(g12, 1)}; left: ${walk(path.join(U, '.claude')).join(', ')}`);
const g13 = drop(['add', 'nonsense', '--repo', Gr], genv); const g14 = drop(['add', 'check', '--repo', Gr, '--bogus'], genv);
ok('G6', 'unknown part and unknown flag exit 2 and write nothing', g13.code === 2 && g14.code === 2 && treeHash(Gr) === hG0, `${tail(g13, 1)} | ${tail(g14, 1)}`);

// P: this terminal's PATH vs the saved PATH (a terminal opened before bootstrap cannot start tools that claude will need)
let stale = [];
if (WIN) {
  const saved = psCmd(`[Environment]::ExpandEnvironmentVariables([Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User'))`).out.split(';').map((d) => d.trim()).filter(Boolean);
  const inDirs = (dirs, t) => dirs.some((d) => ['.exe', '.cmd'].some((x) => exists(path.join(d, t + x))));
  const here = (process.env.PATH || '').split(path.delimiter).filter(Boolean);
  stale = ['git', 'gh', 'node', 'npm', 'uv', 'go', 'rg', 'jq', 'make', 'claude'].filter((t) => !inDirs(here, t) && inDirs(saved, t));
  ok('P1', "this terminal's PATH reaches every installed tool", !stale.length, `stale terminal PATH: ${stale.join(', ')} installed but not visible here: open a new terminal / restart VS Code`);
}

// D: toolchain smoke (WARN-level; network allowed here for uv)
if (QUICK) res('D', 'toolchain smoke', 'SKIP', '--quick');
else {
  const D = path.join(TMP, 'smoke'); write(D, scenarioA);
  for (const [id, label, c, a, re] of [['D1', 'uv run --frozen pytest', 'uv', ['run', '--frozen', 'pytest'], /1 failed, 1 passed/], ['D2', 'npm test (node --test)', 'npm test', null, /fail 1/], ['D3', 'go test ./...', 'go', ['test', './...'], /FAIL/]]) {
    const r = sh(c, a, { cwd: D, timeout: 180000 }); const out = `${r.out}\n${r.err}`;
    if (r.code === null || /not recognized|not found|ENOENT/.test(r.err) && r.code !== 1) res(id, `${label}: one pass, one fail`, 'WARN', stale.includes(c.split(' ')[0]) ? 'stale terminal PATH (see P1)' : `tool missing or failed to start: ${tail(r, 1)}`);
    else ok(id, `${label}: one pass, one fail`, r.code !== 0 && re.test(out), tail(r), 'WARN');
  }
}

// E2: the real ~/.claude (read-only)
const RC = path.join(os.homedir(), '.claude'); let real = null; try { real = JSON.parse(read(path.join(RC, 'settings.json'))); } catch { /* reported below */ }
const rcmd = settingsCmds(real).find(([ev, c]) => ev === 'PreToolUse' && /[\\/]\.claude[\\/]hooks[\\/]guard\.mjs/.test(c))?.[1];
const denyIn = JSON.stringify({ hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'echo toolkit-selftest-deny' }, session_id: 'selftest', cwd: TMP });
if (!rcmd) res('E2', 'real ~/.claude has the user layer', 'WARN', real ? 'guard not registered: run install-global.ps1' : '~/.claude/settings.json missing or invalid');
else {
  ok('E2.1', 'real settings.json parses; guard script exists', exists(scriptOf(rcmd) || ''), rcmd);
  if (BASH) ok('E2.2', 'installed guard command denies via Git Bash', decisionOf(sh(BASH, ['-c', rcmd], { input: denyIn, env: henv }).out).d === 'deny', rcmd);
  if (WIN) ok('E2.3', 'installed guard command denies via PowerShell', decisionOf(psCmd(`'${denyIn}' | ${rcmd}`, { env: henv }).out).d === 'deny', rcmd);
  const pairs = [...walk(SK).map((f) => [path.join(SK, f), path.join(RC, 'skills', f)]), ...agents.map((a) => [path.join(AG, `${a}.md`), path.join(RC, 'agents', `${a}.md`)]), ...hookSrc.map(([, f, s]) => [s, path.join(RC, 'hooks', f)]).filter(([, d]) => exists(d) || !d.endsWith('gate.mjs'))];
  const drift = pairs.filter(([s, d]) => lf(read(s)) !== readIf(d)).map(([, d]) => fwd(path.relative(RC, d)));
  ok('E2.4', 'installed files match the toolkit source', !drift.length, `drift: re-run install-global (${drift.join(', ')})`, 'WARN');
}
const cv = sh('claude --version', null); ok('E2.5', 'claude --version', cv.code === 0, tail(cv, 1), 'WARN');
const pl = sh('claude plugin list', null, { timeout: 60000 }).out; ok('E2.6', 'plugins commit-commands and pr-review-toolkit installed', /commit-commands@/.test(pl) && /pr-review-toolkit@/.test(pl), 'run install-global.ps1 (plugins)', 'WARN');

// F: live headless probes (costs a few cents)
if (!LIVE) res('F', 'live headless Claude probes', 'SKIP', 'pass -Live');
else if (!rcmd || cv.code !== 0) res('F', 'live headless Claude probes', 'FAIL', 'needs claude on PATH and install-global.ps1 run first');
else {
  const L = mkRepo('live', scenarioA); const logs = [...new Set([os.homedir(), process.env.HOME].filter(Boolean).map((h) => path.join(h, '.claude/logs/guard.jsonl')))];
  const marks = () => logs.reduce((n, p) => n + (readIf(p).match(/selftest-marker/g) || []).length, 0);
  const q = (a) => a.map((x) => (/[\s"()*,&|<>^]/.test(x) ? `"${x}"` : x)).join(' ');
  const live = (a) => { const r = sh(`claude ${q(a)}`, null, { cwd: L, timeout: 180000, env: { DEV_TOOLKIT_HOME: '' } }); let j = {}; try { j = JSON.parse(r.out); } catch { /* not JSON */ } return { r, j }; };
  drop(['add', 'repo', '--repo', L], { DEV_TOOLKIT_HOME: '' }); const m0 = marks();
  const f1 = live(['-p', 'Use your shell tool to run exactly: echo toolkit-selftest-deny. Then reply DONE.', '--max-turns', '3', '--output-format', 'json']);
  ok('F1', 'live: the global guard denied the marker command', marks() > m0, `${tail(f1.r, 2)}`);
  drop(['add', 'gate', '--repo', L], { DEV_TOOLKIT_HOME: '' });
  const a2 = ['-p', "Append the comment '# probe' to src/calc.py, then finish. Do not run tests.", '--max-turns', '8', '--output-format', 'json', '--allowedTools', 'Read,Edit,Bash(uv run pytest:*),Bash(npm test:*),Bash(go test:*)'];
  let f2 = live([...a2.slice(0, 2), '--model', 'haiku', ...a2.slice(2)]); if (/model/i.test(f2.r.err) && !f2.j.session_id) f2 = live(a2);
  const ledger = path.join(os.tmpdir(), 'dev-toolkit-gate'); const sid = f2.j.session_id || 'none';
  const blocked = exists(ledger) && fs.readdirSync(ledger).some((f) => readIf(path.join(ledger, f)).split('\n').some((l) => l.includes(sid) && /"ev":"stop"/.test(l) && /block/.test(l)));
  ok('F2', 'live: the gate blocked Stop once after an unverified edit', blocked, `session ${sid}; ${tail(f2.r, 1)}`, 'WARN');
  console.log(`      live: ${cv.out.trim()}; cost $${((f1.j.total_cost_usd || 0) + (f2.j.total_cost_usd || 0)).toFixed(4)}`);
  drop(['remove', 'all', '--repo', L], { DEV_TOOLKIT_HOME: '' });
}

const n = (r) => rows.filter((x) => x === r).length;
console.log(`\n${n('PASS')} PASS, ${n('WARN')} WARN, ${n('FAIL')} FAIL, ${n('SKIP')} SKIP in ${((Date.now() - T0) / 1000).toFixed(0)} s`);
if (KEEP) console.log(`Kept temp dirs under ${fwd(TMP)}\n  fixture A (Python, Node, Go; one failing test each; use it to try the workflow): ${fwd(A)}\n  fixture B (Makefile, AGENTS.md, tracked CLAUDE.md): ${fwd(B)}`);
else try { fs.rmSync(TMP, { recursive: true, force: true, maxRetries: 3 }); } catch { console.log(`could not remove ${fwd(TMP)} (a process may still hold it)`); }
process.exit(n('FAIL') ? 1 : 0);
