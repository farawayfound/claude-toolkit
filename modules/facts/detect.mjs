// Stack and command detection for a checkout. Reads files only: never spawns, installs or opens secrets.
// Module: import { detect } from './detect.mjs'.  CLI: node detect.mjs [root]  (prints JSON)
import fs from 'node:fs';
import path from 'node:path';
const SKIP = new Set(['node_modules', '.git', 'vendor', 'dist', 'build', '.venv']);
const MAKE ={ test: 'test', lint: 'lint', check: 'lint', typecheck: 'typecheck', 'fmt-check': 'format', 'format-check': 'format', 'check-format': 'format' };
const MAKE_RE = new RegExp(`^(${Object.keys(MAKE).join('|')})[ \\t]*:(?!=)`, 'gm');
const CONVENTIONS = ['AGENTS.md', 'CONTRIBUTING.md', '.cursor/rules', '.cursorrules', '.editorconfig', '.pre-commit-config.yaml'];
export function detect(root) {
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
    let pkg = {};
    try { pkg = JSON.parse(read('package.json')) || {}; } catch { /* unparseable: no scripts */ }
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
    const py = read('pyproject.toml');
    const cfg = (re) => re.test(py);
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
  if (has('go.mod')) {
    stacks.push('go');
    pm ||= 'go';
    add('test', 'go test ./...', 'go test', 'stack default');
    add('lint', 'go vet ./...', 'go vet', 'stack default');
    if (anyFile(/^\.golangci\./)) add('lint', 'golangci-lint run', 'golangci-lint run', 'stack default');
    add('format', 'gofmt -l .', 'gofmt -l', 'stack default');
  }
  return {
    stacks, pm, pythonEnv, commands,
    allow: [...new Set(Object.values(commands).flat().map((c) => c.allow))],
    ci: ls('.github/workflows').filter((e) => /\.ya?ml$/.test(e.name)).map((e) => `.github/workflows/${e.name}`),
    services: ls().filter((e) => /^(docker-)?compose[\w.-]*\.ya?ml$/.test(e.name)).map((e) => e.name),
    envExample: has('.env.example'),
    conventions: CONVENTIONS.filter(has),
    subprojects: ls().filter((e) => e.isDirectory() && !SKIP.has(e.name) && ['package.json', 'pyproject.toml', 'go.mod'].some((f) => has(path.join(e.name, f)))).map((e) => e.name),
  };
}

if (/detect\.mjs$/.test(process.argv[1] || '')) console.log(JSON.stringify(detect(path.resolve(process.argv[2] || process.cwd())), null, 2));
