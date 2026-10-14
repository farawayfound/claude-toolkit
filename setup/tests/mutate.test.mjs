// node --test setup/tests/mutate.test.mjs: the mutation grader on throwaway Node repos (strong suite, weak suite, masking, links, failing baseline).
import test, { after } from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { spawnSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';

const TK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = path.join(TK, 'modules/skills/break/scripts/mutate.mjs');
const G = ['-c', 'user.name=t', '-c', 'user.email=t@example.invalid', '-c', 'commit.gpgsign=false'];
const run = (c, a, cwd) => spawnSync(c, a, { cwd, encoding: 'utf8', windowsHide: true, timeout: 180000 });
const made = []; after(() => { for (const d of made) try { fs.rmSync(d, { recursive: true, force: true, maxRetries: 3 }); } catch { /* temp */ } });
function repo(files) {
  const d = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), 'mutate-t-'))); made.push(d);
  for (const [k, v] of Object.entries(files)) { const p = path.join(d, k); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, v); }
  run('git', ['init', '-q'], d); run('git', ['config', 'core.autocrlf', 'false'], d); run('git', [...G, 'add', '-A'], d); run('git', [...G, 'commit', '-q', '-m', 'fixture'], d);
  return d;
}
const mutate = (d, ...args) => run('node', [SCRIPT, '--test', 'node --test', ...args, 'src/clamp.mjs'], d);
const SRC = { 'package.json': JSON.stringify({ name: 'f', private: true, type: 'module' }) + '\n',
  'src/clamp.mjs': 'export const clamp = (n, lo, hi) => (n < lo ? lo : n > hi ? hi : n);\nexport const isAdult = (age) => age >= 18;\n' };
const HEAD = "import test from 'node:test'; import assert from 'node:assert/strict'; import { clamp, isAdult } from '../src/clamp.mjs';\n";
const STRONG = { ...SRC, 'test/clamp.test.mjs': `${HEAD}test('clamp', () => { assert.equal(clamp(-1, 0, 10), 0); assert.equal(clamp(11, 0, 10), 10); assert.equal(clamp(5, 0, 10), 5); });\ntest('isAdult', () => { assert.equal(isAdult(18), true); assert.equal(isAdult(17), false); });\n` };
const WEAK = { ...SRC, 'test/clamp.test.mjs': `${HEAD}test('clamp mid', () => assert.equal(clamp(5, 0, 10), 5));\n` };
const FAILING = { ...SRC, 'test/clamp.test.mjs': `${HEAD}test('wrong', () => assert.equal(clamp(5, 0, 10), 6));\n` };
const tempCopies = () => fs.readdirSync(os.tmpdir()).filter((n) => /^mutate-(?!t-)/.test(n));

test('strong suite: mutants are killed, the checkout is untouched and the copy is removed', () => {
  const d = repo(STRONG); const before = fs.readFileSync(path.join(d, 'src/clamp.mjs')); const copies = tempCopies().length;
  const r = mutate(d, '--max', '20', '--seed', '3');
  assert.equal(r.status, 0, r.stderr);
  const m = /Mutation score: (\d+)\/(\d+) killed/.exec(r.stdout); assert.ok(m, r.stdout);
  assert.ok(+m[1] >= 1 && +m[2] >= 3, r.stdout);
  assert.ok(fs.readFileSync(path.join(d, 'src/clamp.mjs')).equals(before), 'source changed');
  assert.equal(run('git', ['status', '--porcelain'], d).stdout.trim(), '');
  assert.equal(tempCopies().length, copies, 'temporary copy left behind');
});

test('weak suite: survivors are listed as test gaps', () => {
  const r = mutate(repo(WEAK), '--max', '20', '--seed', '3');
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /Survivors \(each is a test gap\):\n\s+src\/clamp\.mjs:\d+ /);
});

test('--json prints one object with a result per mutant', () => {
  const r = mutate(repo(STRONG), '--max', '4', '--json');
  assert.equal(r.status, 0, r.stderr);
  const j = JSON.parse(r.stdout);
  assert.equal(j.results.length, 4); assert.ok(j.results.every((x) => ['killed', 'survived', 'timeout'].includes(x.status)));
  assert.equal(j.killed + j.survived + j.timeout, 4);
});

test('an uncommitted edit is mutated as it is on disk; comments, strings and templates are not', () => {
  const d = repo(STRONG);
  fs.writeFileSync(path.join(d, 'src/clamp.mjs'), `${SRC['src/clamp.mjs']}export const note = 'a == b'; // c == d\nexport const tpl = \`x\n== y\n\`;\nexport const z = (a) => a == 1;\n`);
  const r = mutate(d, '--max', '50', '--json');
  assert.equal(r.status, 0, r.stderr);
  const j = JSON.parse(r.stdout); const lines = new Set(j.results.map((x) => x.line));
  assert.ok(lines.has(7), 'the real comparison on line 7 was not mutated'); // export const z
  for (const l of [3, 4, 5, 6]) assert.ok(!lines.has(l), `line ${l} (comment, string or template) was mutated`);
  assert.match(fs.readFileSync(path.join(d, 'src/clamp.mjs'), 'utf8'), /a == b/); // the checkout keeps the edit
});

test('ignored directories are linked into the copy and survive its removal', () => {
  const d = repo({ ...STRONG, '.gitignore': 'node_modules/\n', 'node_modules/dep/index.mjs': 'export const dep = 1;\n' });
  const r = mutate(d, '--max', '2');
  assert.equal(r.status, 0, r.stderr);
  assert.ok(fs.existsSync(path.join(d, 'node_modules/dep/index.mjs')), 'the real node_modules was deleted with the copy');
});

test('chained returns, strings holding /*, CRLF sources and a subdirectory cwd', () => {
  const d = repo({ ...STRONG, 'src/clamp.mjs': "export const route = '/api/*';\r\nexport const clamp = (n, lo, hi) => (n < lo ? lo : n > hi ? hi : n);\r\nexport const isAdult = (age) => age >= 18;\r\nexport const pick = (xs) => {\r\n  return xs\r\n    .filter((x) => x > 1);\r\n};\r\n" });
  const r = run('node', [SCRIPT, '--test', 'node --test ../test/clamp.test.mjs', '--max', '50', '--json', 'clamp.mjs'], path.join(d, 'src')); // from src/, the suite is a path away
  assert.equal(r.status, 0, r.stderr); const j = JSON.parse(r.stdout);
  assert.ok(j.results.some((x) => x.line === 2), 'the code after a string holding /* was not mutated'); // not a block comment
  assert.ok(!j.results.some((x) => x.op === 'return-undefined'), 'a return continued by a chained call was mutated');
  assert.ok(fs.readFileSync(path.join(d, 'src/clamp.mjs'), 'utf8').includes('\r\n'), 'the checkout lost its CRLF');
});

test('a suite that never loads the file is refused by the canary run', () => {
  const d = repo({ ...STRONG, 'src/other.mjs': 'export const unused = (a) => a > 1;\n' });
  const r = run('node', [SCRIPT, '--test', 'node --test', 'src/other.mjs'], d);
  assert.equal(r.status, 2); assert.match(r.stderr, /do not load it from the copy/);
});

test('a mutant that loops forever times out and its process tree is killed', () => {
  const d = repo({ ...SRC, 'src/clamp.mjs': 'export const wait = (n) => { let done = n > 0; while (!done) { done = n > 0; } return n; };\n',
    'test/clamp.test.mjs': "import test from 'node:test'; import assert from 'node:assert/strict'; import { wait } from '../src/clamp.mjs';\ntest('wait', () => assert.equal(wait(1), 1));\n" });
  const copies = tempCopies().length;
  const r = run('node', [SCRIPT, '--test', 'node --test', '--timeout', '2', '--max', '20', '--json', 'src/clamp.mjs'], d);
  assert.equal(r.status, 0, r.stderr); const j = JSON.parse(r.stdout);
  assert.ok(j.timeout >= 1, 'no mutant timed out: ' + JSON.stringify(j.results));
  assert.equal(tempCopies().length, copies, 'the copy could not be removed: a killed tree left a process holding it');
});

test('a failing baseline is refused and usage errors exit 2', () => {
  const r = mutate(repo(FAILING)); assert.equal(r.status, 2); assert.match(r.stderr, /fails before any mutation/);
  const u = run('node', [SCRIPT, '--bogus'], repo(STRONG)); assert.equal(u.status, 2); assert.match(u.stderr, /unknown flag/);
  const o = run('node', [SCRIPT, '--test', 'node --test', '../outside.mjs'], repo(STRONG)); assert.equal(o.status, 2); assert.match(o.stderr, /not a file inside/);
});
