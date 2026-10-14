#!/usr/bin/env node
// mutate.mjs: grade a test suite by mutation, on a temporary copy of the working tree. One operator at a time: write the mutant into the
// copy, run the test command there, record killed (tests fail) or survived (tests pass). The checkout itself is never written.
//   node mutate.mjs --test "<test command>" [--max 15] [--timeout 120] [--seed 1] [--json] <file>...
// The copy holds the tracked and untracked (not ignored) files; node_modules, .venv, venv, vendor, target and .tox are linked into it, not
// copied. A canary run first breaks each file in the copy: a suite that still passes does not test that file (an editable install or an
// unused module), and the run stops. Comments, strings, docstrings and template literals are never mutated; a mutant that no longer
// parses counts as killed. Exit: 0 report printed (survivors are findings, not errors), 2 usage, failing baseline or a blind suite, 3 git missing.
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

let COPY = null; const LINKS = [];
function cleanup() { // links first, so the real node_modules or .venv is never walked by rmSync
  if (!COPY) return; for (const l of LINKS) { try { (process.platform === 'win32' ? fs.rmdirSync : fs.unlinkSync)(l); } catch { /* gone */ } }
  try { fs.rmSync(COPY, { recursive: true, force: true, maxRetries: 3 }); } catch { console.error(`could not remove ${COPY}`); } COPY = null;
}
process.on('exit', cleanup); process.on('SIGINT', () => process.exit(130));
const die = (code, msg) => { console.error(`ERROR: ${msg}`); process.exit(code); };
const argv = process.argv.slice(2); const F = { max: 15, timeout: 120, seed: 1, json: false }; const files = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (['--test', '--max', '--timeout', '--seed'].includes(a)) { if (argv[i + 1] === undefined) die(2, `${a} needs a value`); F[a.slice(2)] = argv[++i]; }
  else if (a === '--json') F.json = true;
  else if (a.startsWith('--')) die(2, `unknown flag ${a}`);
  else files.push(a);
}
if (!F.test || !files.length) die(2, 'usage: node mutate.mjs --test "<cmd>" [--max N] [--timeout S] [--seed N] [--json] <file>...');
const MAX = +F.max, TIMEOUT = +F.timeout * 1000, SEED = +F.seed;
if (!(MAX > 0) || !(TIMEOUT > 0) || Number.isNaN(SEED)) die(2, '--max and --timeout must be positive numbers, --seed an integer');
const git = (args, cwd) => spawnSync('git', args, { cwd, encoding: 'utf8', windowsHide: true, maxBuffer: 1 << 26 });
if (git(['--version']).status !== 0) die(3, 'git not found');
const top = git(['rev-parse', '--show-toplevel']); if (top.status !== 0) die(2, 'not inside a git repository');
const ROOT = path.resolve(top.stdout.trim()); const fwd = (p) => p.replace(/\\/g, '/');
const REL = files.map((f) => fwd(path.relative(ROOT, path.resolve(f))));
REL.forEach((r, i) => { if (r.startsWith('..') || path.isAbsolute(r) || !fs.statSync(path.join(ROOT, r), { throwIfNoEntry: false })?.isFile()) die(2, `${files[i]}: not a file inside ${fwd(ROOT)}`); });

const EXT = { '.py': 'py', '.js': 'js', '.mjs': 'js', '.cjs': 'js', '.jsx': 'js', '.ts': 'ts', '.tsx': 'ts', '.go': 'go' };
const lang = (f) => EXT[path.extname(f)] || 'any';
const CMP = ['py', 'js', 'go']; // <, > and ! are left alone in TypeScript (generics, non-null assertions) and in unknown languages
const OPS = [ // [name, first match per line, replacement, languages, wholeStatement]
  ['==>!=', /(?<![=!<>])==(?!=)/, '!='], ['!=>==', /(?<![=!<>])!=(?!=)/, '=='],
  ['===>!==', /===/, '!==', ['js', 'ts']], ['!==>===', /!==/, '===', ['js', 'ts']],
  ['<><=', /(?<![<>=!-])<(?![<=-])/, '<=', CMP], ['<=><', /(?<![<>])<=/, '<', CMP],
  ['>>>=', /(?<![<>=!-])>(?![>=])/, '>=', CMP], ['>=>>', /(?<![<>=])>=/, '>', CMP],
  ['and>or', /\band\b/, 'or', ['py']], ['or>and', /\bor\b/, 'and', ['py']],
  ['&&>||', /&&/, '||', ['js', 'ts', 'go']], ['||>&&', /\|\|/, '&&', ['js', 'ts', 'go']],
  ['True>False', /\bTrue\b/, 'False', ['py']], ['False>True', /\bFalse\b/, 'True', ['py']],
  ['true>false', /\btrue\b/, 'false', ['js', 'ts', 'go', 'any']], ['false>true', /\bfalse\b/, 'true', ['js', 'ts', 'go', 'any']],
  ['drop-not', /\bnot\s+(?=\S)/, '', ['py']], ['drop-bang', /(?<![=!])!(?![=])/, '', ['js', 'go']],
  ['return-None', /^(\s*)return\s+(?!None\b)\S.*$/, '$1return None', ['py'], true],
  ['return-undefined', /^(\s*)return\s+(?!undefined\b)\S.*$/, '$1return undefined;', ['js', 'ts'], true],
  ['raise-pass', /^(\s*)raise\b.*$/, '$1pass', ['py'], true], ['drop-throw', /^(\s*)throw\b.*$/, '$1;', ['js', 'ts'], true],
  ['n+1', /(?<![\w.])(\d+)(?![\w.])/, (m) => String(Number(m) + 1)],
];
const maskStrings = (l) => l.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`/g, (q) => ' '.repeat(q.length)); // interiors become spaces: columns stay aligned
const stripComment = (m, L) => { const c = L === 'py' ? m.indexOf('#') : L === 'any' ? m.search(/#|\/\//) : m.search(/\/\/|\/\*/); return c >= 0 ? m.slice(0, c) + ' '.repeat(m.length - c) : m; };
const balanced = (m) => (m.match(/[([{]/g) || []).length <= (m.match(/[)\]}]/g) || []).length;
function mutants(rel) {
  const src = fs.readFileSync(path.join(ROOT, rel)); const lines = src.toString('utf8').split('\n'); const L = lang(rel); const out = []; let inDoc = false, inComment = false;
  lines.forEach((raw, i) => {
    const line = raw.replace(/\r$/, '');
    if (inComment) { if (line.includes('*/')) inComment = false; return; }
    const odd = (re) => ((line.match(re) || []).length) % 2 === 1;
    if (L === 'py' && odd(/"""|'''/)) { inDoc = !inDoc; return; } if (['js', 'ts'].includes(L) && odd(/(?<!\\)`/)) { inDoc = !inDoc; return; } if (inDoc) return;
    const sm = maskStrings(line); const bc = ['js', 'ts', 'go'].includes(L) ? sm.indexOf('/*') : -1;
    if (bc >= 0 && !sm.slice(bc).includes('*/')) inComment = true;
    const masked = stripComment(sm, L); const t = masked.trimStart(); if (!t || /^(\*|\/\*)/.test(t)) return;
    const continues = /^[.?:&|+\-*/,]/.test((lines[i + 1] || '').trimStart()); // the statement goes on: a chained call or a ternary
    for (const [op, re, repl, langs, whole] of OPS) {
      if (langs && !langs.includes(L)) continue; if (whole && (!balanced(masked) || continues)) continue; const m = re.exec(masked); if (!m) continue;
      const seg = line.slice(m.index, m.index + m[0].length); const rep = typeof repl === 'function' ? repl(seg) : repl.replace('$1', m[1] ?? '');
      const mutated = line.slice(0, m.index) + rep + line.slice(m.index + m[0].length); if (mutated === line) continue;
      out.push({ rel, line: i + 1, op, before: line.trim(), after: mutated.trim(), text: () => [...lines.slice(0, i), mutated + (raw.endsWith('\r') ? '\r' : ''), ...lines.slice(i + 1)].join('\n') });
    }
  });
  return { src, out };
}
const rng = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const sources = Object.fromEntries(REL.map((r) => [r, mutants(r)])); const all = REL.flatMap((r) => sources[r].out);
const rand = rng(SEED); for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [all[i], all[j]] = [all[j], all[i]]; }
const chosen = all.slice(0, MAX);
if (!chosen.length) die(2, `no mutants found in ${REL.join(', ')} (comments, strings and docstrings are skipped)`);

// the copy: tracked and untracked-not-ignored files; big ignored directories are linked
COPY = fs.mkdtempSync(path.join(os.tmpdir(), 'mutate-'));
for (const f of git(['ls-files', '-z', '-co', '--exclude-standard'], ROOT).stdout.split('\0').filter(Boolean)) {
  const src = path.join(ROOT, f); if (!fs.statSync(src, { throwIfNoEntry: false })?.isFile()) continue;
  const dst = path.join(COPY, f); fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.copyFileSync(src, dst);
}
for (const d of ['node_modules', '.venv', 'venv', 'vendor', 'target', '.tox']) {
  const src = path.join(ROOT, d), dst = path.join(COPY, d); if (!fs.existsSync(src) || fs.existsSync(dst)) continue;
  try { fs.symlinkSync(src, dst, 'junction'); LINKS.push(dst); } catch (e) { die(2, `cannot link ${d} into the copy (${e.code}): it must be a directory`); }
}
const CWD = path.join(COPY, path.relative(ROOT, process.cwd()));
const { NODE_TEST_CONTEXT, ...env } = process.env; env.PYTHONDONTWRITEBYTECODE = '1'; // a nested `node --test` must not inherit the runner's context; no .pyc may outlive a mutant
const killTree = (pid) => { try { if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { windowsHide: true }); else process.kill(-pid, 'SIGKILL'); } catch { /* gone */ } };
const runTests = () => new Promise((resolve) => { // async, so a timeout can kill the whole process tree while its root is still alive
  const t0 = Date.now(); let out = '', timeout = false;
  const child = spawn(F.test, { shell: true, cwd: CWD, env, windowsHide: true, detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'] });
  const grab = (d) => { if (out.length < 1e6) out += d; }; child.stdout.on('data', grab); child.stderr.on('data', grab);
  const timer = setTimeout(() => { timeout = true; killTree(child.pid); }, TIMEOUT);
  const done = (code, err) => { clearTimeout(timer); resolve({ code, timeout, ms: Date.now() - t0, tail: (err || out).trim().split('\n').slice(-5).join(' | ') }); };
  child.on('error', (e) => done(null, e.message)); child.on('close', (code) => done(code));
});
const base = await runTests();
if (base.timeout) die(2, `the suite did not finish within ${F.timeout} s unmutated; raise --timeout`);
if (base.code !== 0) die(2, `the suite fails before any mutation (exit ${base.code}); fix it first: ${base.tail}`);
for (const r of REL) { // canary: a broken file must break the suite, else the tests never load it from the copy
  const target = path.join(COPY, r); fs.writeFileSync(target, 'this file was broken on purpose by mutate.mjs ((('); const c = await runTests(); fs.writeFileSync(target, sources[r].src);
  if (c.code === 0 && !c.timeout) die(2, `${r}: the suite still passes with the file broken, so the tests do not load it from the copy (an editable install pointing at the real source, or a module nothing imports)`);
}
if (!F.json) console.log(`mutate: ${all.length} mutants in ${REL.join(', ')}; running ${chosen.length} (seed ${SEED}) on a copy at ${fwd(COPY)}; baseline exit 0 in ${base.ms} ms\n${'status'.padEnd(10)}${'file:line'.padEnd(28)}${'op'.padEnd(18)}before -> after`);
const results = [];
for (const c of chosen) {
  const target = path.join(COPY, c.rel); fs.writeFileSync(target, c.text()); const r = await runTests(); fs.writeFileSync(target, sources[c.rel].src);
  const status = r.timeout ? 'timeout' : r.code === 0 ? 'survived' : 'killed';
  results.push({ file: c.rel, line: c.line, op: c.op, before: c.before, after: c.after, status, ms: r.ms });
  if (!F.json) console.log(`${status.padEnd(10)}${`${c.rel}:${c.line}`.padEnd(28)}${c.op.padEnd(18)}${c.before.slice(0, 60)} -> ${c.after.slice(0, 60)}`);
}
const n = (s) => results.filter((r) => r.status === s).length; const killed = n('killed'), survived = n('survived'), timeouts = n('timeout');
if (F.json) console.log(JSON.stringify({ files: REL, seed: SEED, mutants: all.length, baselineMs: base.ms, killed, survived, timeout: timeouts, results }, null, 2));
else {
  console.log(`\nMutation score: ${killed}/${results.length} killed (${Math.round((100 * killed) / results.length)}%); ${survived} survived; ${timeouts} timed out`);
  if (survived) console.log(`Survivors (each is a test gap):\n${results.filter((r) => r.status === 'survived').map((r) => `  ${r.file}:${r.line} ${r.op}  ${r.before.slice(0, 70)} -> ${r.after.slice(0, 70)}`).join('\n')}`);
}
