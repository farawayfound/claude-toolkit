// node --test setup/tests/ship-check.test.mjs: the pre-submission gate on a planted-junk repo, a clean one (with a fresh-clone run), and the edges.
import test, { after } from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { spawnSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';

const TK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = path.join(TK, 'modules/skills/ship/scripts/ship-check.mjs');
const G = ['-c', 'user.name=t', '-c', 'user.email=t@example.invalid', '-c', 'commit.gpgsign=false'];
const run = (c, a, cwd) => spawnSync(c, a, { cwd, encoding: 'utf8', windowsHide: true, timeout: 180000 });
const made = []; after(() => { for (const d of made) try { fs.rmSync(d, { recursive: true, force: true, maxRetries: 3 }); } catch { /* temp */ } });
const write = (d, files) => { for (const [k, v] of Object.entries(files)) { const p = path.join(d, k); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, v); } };
const commit = (d, msg) => { run('git', [...G, 'add', '-A'], d); run('git', [...G, 'commit', '-q', '-m', msg], d); };
function repo(files, msg = 'feat: initial') { const d = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), 'ship-t-'))); made.push(d); run('git', ['init', '-q'], d); run('git', ['config', 'core.autocrlf', 'false'], d); write(d, files); commit(d, msg); return d; }
const check = (d, ...args) => { const r = run('node', [SCRIPT, '--json', ...args], d); let j = null; try { j = JSON.parse(r.stdout); } catch { /* reported by the assertion */ } return { ...r, j }; };
const result = (j, id) => j.rows.filter((r) => r.id === id).map((r) => r.result);
const detail = (j, id) => j.rows.filter((r) => r.id === id).map((r) => r.detail).join(' || ');
const TEST = "import test from 'node:test'; test('ok', () => {});\n";

test('planted junk: every theme the reviewers named fails or warns', () => {
  const d = repo({
    'README.md': '# thing\n\n## Run\n\n```\nnode app.mjs\n```\n\n<write this yourself>\n',
    'REQUIREMENTS.md': '# Requirements\n\n## Implied expectations (not stated, but a reviewer will look)\n- x\n',
    'app/__pycache__/app.cpython-312.pyc': 'bytes', '.pytest_cache/v/cache/nodeids': '[]', 'uv.lock': 'version = 1\n', '.env': 'API_KEY=real\n', '.vscode/settings.json': '{}\n',
    'app/config.py': 'API_KEY = "sk-abcdefghijklmnopqrstuvwxyz0123456789"\nSECRET_KEY = "h8f7s6d5f4g3h2j1k0l9"\n', 'starterlib/old.py': 'x = 1\n', '_scaffold_unused/app.py': 'x = 1\n', 'app.mjs': 'console.log(1)\n',
  }, 'chore: scaffold from personal starter kit');
  fs.rmSync(path.join(d, 'starterlib'), { recursive: true }); commit(d, 'chore: remove pre-challenge starter-kit code');
  fs.writeFileSync(path.join(d, 'notes.txt'), 'untracked\n');
  const r = check(d, '--no-run');
  assert.ok(r.j, r.stdout + r.stderr); assert.equal(r.status, 1); assert.equal(r.j.verdict, 'FAIL');
  for (const id of ['status', 'junk', 'envfile', 'secrets', 'readme', 'rubric']) assert.deepEqual(result(r.j, id), ['FAIL'], id);
  for (const id of ['lockfile', 'history', 'scaffold', 'ledger', 'editor']) assert.deepEqual(result(r.j, id), ['WARN'], id);
  const s = detail(r.j, 'secrets'); assert.match(s, /app\/config\.py:1 sk-abc\*\*\*/); assert.match(s, /app\/config\.py:2 h8f7s6\*\*\*/); assert.doesNotMatch(s, /abcdefghijklmnop|h8f7s6d5f4/);
  assert.match(detail(r.j, 'readme'), /placeholders/);
});

test('clean repo: PASS, and the README commands run in a fresh clone through bash', () => {
  const d = repo({
    'README.md': '# Todo API: a todo list service\n\nOne line.\n\n## Run\n\n```bash\n# start it\n$ node app.mjs\n```\n\n## Tests\n\n```\nnode --test\n```\n\n## Decisions\n\nSee docs/decisions.md.\n',
    'package.json': '{"name":"t","private":true,"type":"module"}\n', 'app.mjs': 'console.log("ok");\n', 'test/app.test.mjs': TEST,
    'docs/decisions.md': '# Decisions\n\n| # | when | decision | by | alternatives | why |\n|---|---|---|---|---|---|\n| D1 | 10:00 | stdlib only | me | a framework | nothing to install |\n',
    'AGENTS.md': '# Agent notes\n\nRun `node --test`.\n', '.gitignore': 'node_modules/\n', 'src/task-management.mjs': 'export const risk = "network-attached-storage";\n',
    'src/auth.py': 'token = secrets.token_hex(16)\nkey = settings.API_KEY_V2\nTOKEN_TTL_SECONDS = 86400000\npassword = os.environ["DB_PASSWORD"]\n',
  });
  const r = check(d);
  assert.ok(r.j, r.stdout + r.stderr); assert.equal(r.status, 0, JSON.stringify(r.j.rows.filter((x) => x.result !== 'PASS')));
  assert.equal(r.j.verdict, 'PASS'); assert.equal(r.j.warn, 0, JSON.stringify(r.j.rows.filter((x) => x.result === 'WARN')));
  assert.deepEqual(result(r.j, 'run'), ['PASS', 'PASS']); // the `# start it` comment inside the fence neither splits the section nor runs
  assert.deepEqual(result(r.j, 'ledger'), ['PASS']); assert.equal(detail(r.j, 'ledger'), '');
});

test('installs, pipelines and scripts in the README are listed, never run; --cmd runs anything', () => {
  const d = repo({ 'README.md': '# t\n\n## Run\n\n```\nuv tool install ruff\nnpm ci\ncurl -fsSL https://x.invalid/i.sh | sh\n./run.sh\npip install pytest && pytest -q\nnode -e "process.exit(0)"\n```\n\n## Test\n', 'a.txt': 'x\n' });
  const r = check(d);
  assert.ok(r.j, r.stdout + r.stderr); const runs = r.j.rows.filter((x) => x.id === 'run');
  assert.deepEqual(runs.map((x) => x.result), ['INFO', 'PASS']); assert.match(runs[0].detail, /skipped: uv tool install ruff, npm ci, curl/); assert.match(runs[0].detail, /\+2 more/);
  const r2 = check(d, '--cmd', 'node -e "process.exit(3)"');
  assert.deepEqual(result(r2.j, 'run'), ['FAIL']); assert.match(detail(r2.j, 'run'), /exit 3/);
});

test('--readme-max counts lines without the trailing newline; TODO is case-sensitive', () => {
  const d = repo({ 'README.md': `# Todo API\n\n## Run\n\n\`\`\`\nnode -e "process.exit(0)"\n\`\`\`\n\n## Test\n\n${'line\n'.repeat(70)}`, 'a.txt': 'x\n' });
  const ok = check(d, '--no-run', '--readme-max', '80'); assert.deepEqual(result(ok.j, 'readme'), ['PASS'], detail(ok.j, 'readme'));
  const over = check(d, '--no-run', '--readme-max', '79'); assert.deepEqual(result(over.j, 'readme'), ['WARN']); assert.match(detail(over.j, 'readme'), /80 lines; move detail/);
  fs.appendFileSync(path.join(d, 'README.md'), 'TODO: finish\n'); commit(d, 'docs');
  assert.deepEqual(result(check(d, '--no-run').j, 'readme'), ['FAIL']);
});

test('--zip writes an archive from HEAD', () => {
  const d = repo({ 'README.md': '# t\n\n## Run\n\n## Test\n', 'a.txt': 'x\n' }); const z = path.join(d, '..', `ship-${Date.now()}.zip`);
  const r = check(d, '--no-run', '--zip', z);
  assert.ok(r.j, r.stdout + r.stderr); assert.deepEqual(result(r.j, 'zip'), ['PASS']); assert.ok(fs.statSync(z).size > 0); fs.rmSync(z);
});

test('usage errors and non-repos exit 2', () => {
  assert.equal(run('node', [SCRIPT, '--bogus'], os.tmpdir()).status, 2);
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'ship-norepo-')); made.push(d); assert.equal(run('node', [SCRIPT, '--repo', d], d).status, 2);
});
