// Stack and command detection for a checkout. Reads files only: never spawns, installs or opens secrets.
// Module: import { detect } from './detect.mjs'.  CLI: node detect.mjs [root]  (prints JSON)
import fs from 'node:fs';
import path from 'node:path';
const SKIP = new Set(['node_modules', '.git', 'vendor', 'dist', 'build', '.venv']);
const MAKE ={ test: 'test', lint: 'lint', check: 'lint', typecheck: 'typecheck', 'fmt-check': 'format', 'format-check': 'format', 'check-format': 'format' };
const MAKE_RE = new RegExp(`^(${Object.keys(MAKE).join('|')})[ \\t]*:(?!=)`, 'gm');
const CONVENTIONS = ['AGENTS.md', 'CONTRIBUTING.md', '.cursor/rules', '.cursorrules', '.editorconfig', '.pre-commit-config.yaml'];
const MANIFESTS = ['package.json', 'pyproject.toml', 'go.mod'];
// A nested package (one or two folders down: plugins/x, packages/x) reports its commands in a form that runs from the root and can be
// allow-listed; a command without such a form is listed as `cd <dir> && <cmd>` and left off the allowlist.
const NEST = { npm: 'npm --prefix', pnpm: 'pnpm --dir', yarn: 'yarn --cwd', bun: 'bun --cwd' };
function nestedCmd(d, cmd) {
  const m = /^(npm|pnpm|yarn|bun) (test|run \S+)$/.exec(cmd); if (m) return [`${NEST[m[1]]} ${d} ${m[2]}`, `${NEST[m[1]]} ${d} ${m[2]}`];
  if (cmd === 'npx --no-install tsc --noEmit') return [`npm --prefix ${d} exec --no -- tsc -p ${d}/tsconfig.json --noEmit`, `npm --prefix ${d} exec --no -- tsc`];
  const g = /^(go) (test|vet) \.\/\.\.\.$/.exec(cmd) || /^(make) (\S+)$/.exec(cmd); if (g) return [`${g[1]} -C ${d} ${g[2]}${g[1] === 'go' ? ' ./...' : ''}`, `${g[1]} -C ${d} ${g[2]}`];
  return cmd === 'gofmt -l .' ? [`gofmt -l ${d}`, 'gofmt -l'] : [`cd ${d} && ${cmd}`, null];
}
export function detect(root, depth = 0) {
  const has = (f) => fs.existsSync(path.join(root, f));
  const read = (f) => { try { return fs.readFileSync(path.join(root, f), 'utf8'); } catch { return ''; } };
  const ls = (d = '.') => { try { return fs.readdirSync(path.join(root, d), { withFileTypes: true }); } catch { return []; } };
  const anyFile = (re) => ls().some((e) => re.test(e.name));
  const commands = { format: [], lint: [], typecheck: [], test: [] };
  const add = (k, cmd, allow, source) => { if (!commands[k].some((c) => c.cmd === cmd)) commands[k].push({ cmd, allow, source }); };
  let stacks = [], pm = null, pythonEnv = null; // pm: node package manager, else the python or go tool; pythonEnv: venv | uv.lock | poetry.lock | none
  // 1. Makefile check targets win within each purpose. Plain fmt/format targets rewrite files: never listed or allow-listed.
  for (const [, t] of read('Makefile').matchAll(MAKE_RE)) add(MAKE[t], `make ${t}`, `make ${t}`, 'Makefile');
  // 2. Package scripts (Node), with their stack defaults only where no script covers the purpose.
  if (has('package.json')) {
    stacks.push('node');
    let pkg = {}; try { pkg = JSON.parse(read('package.json')) || {}; } catch { /* unparseable: no scripts */ }
    const s = pkg.scripts || {};
    pm = has('pnpm-lock.yaml') ? 'pnpm' : has('yarn.lock') ? 'yarn' : has('bun.lock') || has('bun.lockb') ? 'bun' : 'npm';
    const script = (k, cmd) => add(k, cmd, cmd, 'package.json');
    if (s.test && !/no test specified/.test(s.test)) script('test', `${pm} test`);
    if (s.lint) script('lint', `${pm} run lint`);
    const tc = ['typecheck', 'type-check', 'check-types'].find((k) => s[k]);
    if (tc) script('typecheck', `${pm} run ${tc}`);
    const fc = ['format:check', 'fmt:check'].find((k) => s[k]);
    if (fc) script('format', `${pm} run ${fc}`);
    if (!tc && has('tsconfig.json')) add('typecheck', 'npx --no-install tsc --noEmit', 'npx --no-install tsc', 'stack default');
    if (!fc && (pkg.prettier || anyFile(/^(\.prettierrc|prettier\.config\.)/))) add('format', 'npx --no-install prettier --check .', 'npx --no-install prettier --check', 'stack default');
  }
  // 3. Python stack defaults, run through the repo's runner.
  if (has('pyproject.toml') || has('setup.py') || has('setup.cfg') || anyFile(/^requirements.*\.txt$/)) {
    stacks.push('python');
    const py = read('pyproject.toml'); const cfg = (re) => re.test(py);
    const venv = process.platform === 'win32' ? '.venv/Scripts/python -m' : '.venv/bin/python -m';
    const r = has('.venv') ? venv : has('uv.lock') ? 'uv run --frozen' : has('poetry.lock') ? 'poetry run' : 'python -m'; // .venv installs nothing; uv only with a lock, and --frozen never writes it
    pythonEnv = has('.venv') ? 'venv' : has('uv.lock') ? 'uv.lock' : has('poetry.lock') ? 'poetry.lock' : 'none'; pm ||= has('uv.lock') || cfg(/^\[(tool\.uv|dependency-groups)\]/m) ? 'uv' : has('poetry.lock') ? 'poetry' : 'pip';
    const def = (k, tail) => add(k, `${r} ${tail}`, `${r} ${tail.replace(/ \.$/, '')}`, 'stack default');
    if (cfg(/^\[tool\.pytest/m) || has('pytest.ini') || has('conftest.py') || has('tests')) def('test', 'pytest');
    if (cfg(/^\[tool\.ruff/m) || has('ruff.toml') || has('.ruff.toml')) { def('lint', 'ruff check .'); def('format', 'ruff format --check .'); }
    if (cfg(/^\[tool\.mypy/m) || has('mypy.ini')) def('typecheck', 'mypy .');
    if (cfg(/^\[tool\.pyright/m) || has('pyrightconfig.json')) def('typecheck', 'pyright');
  }
  // 4. Go stack defaults.
  if (has('go.mod')) { stacks.push('go'); pm ||= 'go'; add('test', 'go test ./...', 'go test', 'stack default'); add('lint', 'go vet ./...', 'go vet', 'stack default');
    if (anyFile(/^\.golangci\./)) add('lint', 'golangci-lint run', 'golangci-lint run', 'stack default'); add('format', 'gofmt -l .', 'gofmt -l', 'stack default'); }
  // 5. Nested packages, one or two folders down (never under SKIP): their commands, rewritten to run from this root.
  const dirs = (d) => ls(d).filter((e) => e.isDirectory() && !SKIP.has(e.name) && !e.name.startsWith('.')).map((e) => (d === '.' ? e.name : `${d}/${e.name}`));
  const nested = depth ? [] : dirs('.').flatMap((d) => [d, ...dirs(d)]).filter((d) => MANIFESTS.some((f) => has(path.join(d, f))));
  for (const d of nested) for (const [k, list] of Object.entries(detect(path.join(root, d), 1).commands)) for (const c of list) { const [cmd, allow] = nestedCmd(d, c.cmd); add(k, cmd, allow, `${d}: ${c.source}`); }
  return { stacks, pm, pythonEnv, commands, allow: [...new Set(Object.values(commands).flat().map((c) => c.allow).filter(Boolean))],
    ci: ls('.github/workflows').filter((e) => /\.ya?ml$/.test(e.name)).map((e) => `.github/workflows/${e.name}`), services: ls().filter((e) => /^(docker-)?compose[\w.-]*\.ya?ml$/.test(e.name)).map((e) => e.name),
    envExample: has('.env.example'), conventions: CONVENTIONS.filter(has), subprojects: nested };
}
if (/detect\.mjs$/.test(process.argv[1] || '')) console.log(JSON.stringify(detect(path.resolve(process.argv[2] || process.cwd())), null, 2));
