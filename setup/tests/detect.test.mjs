// node --test setup/tests/detect.test.mjs: command detection for nested packages (one or two folders down) and for a plain single-package repo.
import test, { after } from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { detect } from '../../modules/facts/detect.mjs';
import { renderFacts } from '../../modules/facts/facts.mjs';

const made = []; after(() => { for (const d of made) try { fs.rmSync(d, { recursive: true, force: true, maxRetries: 3 }); } catch { /* temp */ } });
function repo(files) {
  const d = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), 'detect-t-'))); made.push(d);
  for (const [k, v] of Object.entries(files)) { const p = path.join(d, k); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, v); }
  return d;
}
const pkg = (scripts, extra = {}) => JSON.stringify({ name: 'x', private: true, scripts, ...extra });
const cmds = (det) => Object.values(det.commands).flat().map((c) => c.cmd);

test('nested packages: root-runnable commands, allow-listed; vendor and node_modules stay out', () => {
  const d = repo({
    'package.json': pkg({ start: 'node app.mjs' }),
    'plugins/sf/package.json': pkg({ test: 'vitest run', lint: 'eslint .' }, { devDependencies: { typescript: '^5' } }),
    'plugins/sf/package-lock.json': '{}', 'plugins/sf/tsconfig.json': '{}',
    'apps/svc/go.mod': 'module example.com/svc\n\ngo 1.22\n',
    'tools/py/pyproject.toml': '[tool.pytest.ini_options]\ntestpaths = ["tests"]\n',
    'vendor/lib/package.json': pkg({ test: 'node --test' }),
    'node_modules/dep/package.json': pkg({ test: 'node --test' }),
    'plugins/sf/node_modules/inner/package.json': pkg({ test: 'node --test' }),
  });
  const det = detect(d); const all = cmds(det);
  for (const c of ['npm --prefix plugins/sf test', 'npm --prefix plugins/sf run lint', 'npm --prefix plugins/sf exec --no -- tsc -p plugins/sf/tsconfig.json --noEmit',
    'go -C apps/svc test ./...', 'go -C apps/svc vet ./...', 'gofmt -l apps/svc', 'cd tools/py && python -m pytest']) assert.ok(all.includes(c), `missing ${c} in ${all.join(' | ')}`);
  assert.ok(!all.some((c) => /vendor|node_modules|inner/.test(c)), all.join(' | '));
  assert.equal(det.commands.test.find((c) => c.cmd === 'npm --prefix plugins/sf test').source, 'plugins/sf: package.json');
  for (const a of ['npm --prefix plugins/sf test', 'npm --prefix plugins/sf exec --no -- tsc', 'go -C apps/svc test', 'gofmt -l']) assert.ok(det.allow.includes(a), `allow lacks ${a}`);
  assert.ok(!det.allow.some((a) => a.startsWith('cd ')), det.allow.join(' | '));
  assert.deepEqual([...det.subprojects].sort(), ['apps/svc', 'plugins/sf', 'tools/py']);
  assert.deepEqual(det.stacks, ['node']);
  const facts = renderFacts(d, det);
  assert.match(facts, /\| test \| `npm --prefix plugins\/sf test` \| plugins\/sf: package\.json \|/);
  assert.match(facts, /Nested packages .*: apps\/svc, plugins\/sf, tools\/py/);
});

test('a single-package repo is unchanged: its own commands, no nested entries', () => {
  const d = repo({ 'package.json': pkg({ test: 'node --test' }), 'tsconfig.json': '{}', 'src/a.mjs': '' });
  const det = detect(d);
  assert.deepEqual(cmds(det), ['npx --no-install tsc --noEmit', 'npm test']);
  assert.deepEqual(det.allow, ['npx --no-install tsc', 'npm test']);
  assert.deepEqual(det.subprojects, []);
});

test('a root with no manifest and only nested packages still reports them', () => {
  const d = repo({ 'README.md': '# mono\n', 'services/api/package.json': pkg({ test: 'jest' }), 'services/api/yarn.lock': '' });
  const det = detect(d);
  assert.deepEqual(cmds(det), ['yarn --cwd services/api test']);
  assert.deepEqual(det.stacks, []); assert.deepEqual(det.subprojects, ['services/api']);
});
