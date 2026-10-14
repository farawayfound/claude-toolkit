// Throwaway multi-stack sample repos for lib/selftest.mjs and for trying the workflow (`selftest.ps1 -Keep`): one passing and one failing test per stack.
const T = '\t';
const L = (...lines) => lines.join('\n') + '\n';

// Real lockfile for scenario A (generated with `uv lock`), so the detected runner is `uv run --frozen pytest` and no lockfile is written.
const UV_LOCK = `version = 1
revision = 5
requires-python = ">=3.12"

[[package]]
name = "colorama"
version = "0.4.6"
source = { registry = "https://pypi.org/simple" }
sdist = { url = "https://files.pythonhosted.org/packages/d8/53/6f443c9a4a8358a93a6792e2acffb9d9d5cb0a5cfd8802644b7b1c9a02e4/colorama-0.4.6.tar.gz", hash = "sha256:08695f5cb7ed6e0531a20572697297273c47b8cae5a63ffc6d6ed5c201be6e44", size = 27697, upload-time = "2022-10-25T02:36:22.414Z" }
wheels = [
    { url = "https://files.pythonhosted.org/packages/d1/d6/3965ed04c63042e047cb6a3e6ed1a63a35087b6a609aa3a15ed8ac56c221/colorama-0.4.6-py2.py3-none-any.whl", hash = "sha256:4f1d9991f5acc0ca119f9d443620b77f9d6b33703e51011c16baf57afb285fc6", size = 25335, upload-time = "2022-10-25T02:36:20.889Z" },
]

[[package]]
name = "fixture"
version = "0.1.0"
source = { virtual = "." }

[package.dev-dependencies]
dev = [
    { name = "pytest" },
]

[package.metadata]

[package.metadata.requires-dev]
dev = [{ name = "pytest" }]

[[package]]
name = "iniconfig"
version = "2.3.1"
source = { registry = "https://pypi.org/simple" }
sdist = { url = "https://files.pythonhosted.org/packages/01/e1/2069291243c926a2ff1cd706c7f3eeb9b62144bf60f77c9fb9ff2fb26bd3/iniconfig-2.3.1.tar.gz", hash = "sha256:67f4b9c50da0dedf52af349e7749a80a9057a5031199791b906c3bb3ae878960", size = 21209, upload-time = "2026-10-06T22:48:38.076Z" }
wheels = [
    { url = "https://files.pythonhosted.org/packages/56/43/4ca9e49d27a1fcf6bece6f6aec0ea46bb9112489b93d4b688fb415457bdb/iniconfig-2.3.1-py3-none-any.whl", hash = "sha256:9121e2c1fdb355232495be3194c8dfe87ccc2d5dee45947b78e68f499790d7a7", size = 7552, upload-time = "2026-10-06T22:48:36.959Z" },
]

[[package]]
name = "packaging"
version = "26.3"
source = { registry = "https://pypi.org/simple" }
sdist = { url = "https://files.pythonhosted.org/packages/7d/fa/3944b40b07da9ce895c0e6303a5ab7d53da063554f534556b134a54d6093/packaging-26.3.tar.gz", hash = "sha256:94edc256424af38762eb31306eed28beb9f0efc50a8837492c9d6fd6004aed79", size = 313412, upload-time = "2026-08-04T18:15:28.737Z" }
wheels = [
    { url = "https://files.pythonhosted.org/packages/63/34/ba1c580383c9eada3711951fef0795c80b829a078d72188184bcab9dd527/packaging-26.3-py3-none-any.whl", hash = "sha256:d7193f7c8e4e93f444fde0262bf90af30e16fa0ad0ad44cb553c87339b23cd1c", size = 129956, upload-time = "2026-08-04T18:15:27.159Z" },
]

[[package]]
name = "pluggy"
version = "1.6.0"
source = { registry = "https://pypi.org/simple" }
sdist = { url = "https://files.pythonhosted.org/packages/f9/e2/3e91f31a7d2b083fe6ef3fa267035b518369d9511ffab804f839851d2779/pluggy-1.6.0.tar.gz", hash = "sha256:7dcc130b76258d33b90f61b658791dede3486c3e6bfb003ee5c9bfb396dd22f3", size = 69412, upload-time = "2025-05-15T12:30:07.975Z" }
wheels = [
    { url = "https://files.pythonhosted.org/packages/54/20/4d324d65cc6d9205fabedc306948156824eb9f0ee1633355a8f7ec5c66bf/pluggy-1.6.0-py3-none-any.whl", hash = "sha256:e920276dd6813095e9377c0bc5566d94c932c33b27a3e3945d8389c374dd4746", size = 20538, upload-time = "2025-05-15T12:30:06.134Z" },
]

[[package]]
name = "pygments"
version = "2.21.0"
source = { registry = "https://pypi.org/simple" }
sdist = { url = "https://files.pythonhosted.org/packages/49/2e/ced460408999b33da6b31b0021b0f37d329e202d4169aeb164493778f25b/pygments-2.21.0.tar.gz", hash = "sha256:610ca751c9bc2492b38eb9a38a7fbc93edbbb2d7182edaf34e66ae493dee5c8c", size = 5005329, upload-time = "2026-08-17T08:02:48.824Z" }
wheels = [
    { url = "https://files.pythonhosted.org/packages/71/46/17f022dd3e953bf20a04a028a21ec746d942f8d2af30fa0f124fa0e6a684/pygments-2.21.0-py3-none-any.whl", hash = "sha256:2363c69b61c4a97c838da3b130dcd6468f4848992b21a82f2a63ec34377137d9", size = 1250147, upload-time = "2026-08-17T08:02:44.912Z" },
]

[[package]]
name = "pytest"
version = "9.1.1"
source = { registry = "https://pypi.org/simple" }
dependencies = [
    { name = "colorama", marker = "sys_platform == 'win32'" },
    { name = "iniconfig" },
    { name = "packaging" },
    { name = "pluggy" },
    { name = "pygments" },
]
sdist = { url = "https://files.pythonhosted.org/packages/e4/47/b9efed96c114afcfa3c9d3fe98a76a1d14c74a9e266d397cf6eb64be5e01/pytest-9.1.1.tar.gz", hash = "sha256:1088fbde8f2b49d95a549a195707afa7a76a3ce9bcadc26b6d71f0ffda5fe313", size = 1636369, upload-time = "2026-06-19T10:58:32.857Z" }
wheels = [
    { url = "https://files.pythonhosted.org/packages/24/25/1de2678b631f5a49215c6c96fff41ba892b0a34df68d6d80292b1b48aa7f/pytest-9.1.1-py3-none-any.whl", hash = "sha256:37a86b45efb9a47a61a36449063e8e18d0cab3161329fc099eb21783169c4f0c", size = 386536, upload-time = "2026-06-19T10:58:31.347Z" },
]
`;

export const scenarioA = {
  'uv.lock': UV_LOCK,
  'pyproject.toml': L('[project]', 'name = "fixture"', 'version = "0.1.0"', 'requires-python = ">=3.12"', '',
    '[dependency-groups]', 'dev = ["pytest"]', '',
    '[tool.pytest.ini_options]', 'pythonpath = ["src"]', 'testpaths = ["tests"]', '',
    '[tool.ruff]', 'line-length = 100'),
  'src/calc.py': L('def add(a, b):', '    return a + b', '', '', 'def mean(values):', '    return sum(values) / len(values)'),
  'tests/test_calc.py': L('from calc import add, mean', '', '',
    'def test_add():', '    assert add(2, 3) == 5', '', '',
    'def test_mean_of_empty_list_is_zero():', '    assert mean([]) == 0'),
  'package.json': JSON.stringify({ name: 'fixture', private: true, type: 'module', scripts: { test: 'node --test' } }, null, 2) + '\n',
  'src/sum.mjs': L('export const sum = (xs) => xs.reduce((a, b) => a + b, 0);', '', 'export const last = (xs) => xs[xs.length];'),
  'test/sum.test.mjs': L("import test from 'node:test';", "import assert from 'node:assert/strict';", "import { sum, last } from '../src/sum.mjs';", '',
    "test('sum adds all numbers', () => assert.equal(sum([1, 2, 3]), 6));",
    "test('last returns the final element', () => assert.equal(last([1, 2, 3]), 3));"),
  'go.mod': L('module example.com/fixture', '', 'go 1.22'),
  'calc.go': L('package fixture', '',
    '// Abs returns the absolute value of n.', 'func Abs(n int) int {', `${T}if n < 0 {`, `${T}${T}return -n`, `${T}}`, `${T}return n`, '}', '',
    '// Clamp limits n to the closed range [lo, hi].', 'func Clamp(n, lo, hi int) int {',
    `${T}if n < lo {`, `${T}${T}return hi`, `${T}}`, `${T}if n > hi {`, `${T}${T}return lo`, `${T}}`, `${T}return n`, '}'),
  'calc_test.go': L('package fixture', '', 'import "testing"', '',
    'func TestCalc(t *testing.T) {', `${T}cases := []struct {`, `${T}${T}name      string`, `${T}${T}got, want int`, `${T}}{`,
    `${T}${T}{"abs of a negative number", Abs(-3), 3},`, `${T}${T}{"clamp below the range", Clamp(-5, 0, 10), 0},`, `${T}}`,
    `${T}for _, c := range cases {`, `${T}${T}t.Run(c.name, func(t *testing.T) {`,
    `${T}${T}${T}if c.got != c.want {`, `${T}${T}${T}${T}t.Errorf("got %d, want %d", c.got, c.want)`, `${T}${T}${T}}`,
    `${T}${T}})`, `${T}}`, '}'),
  '.github/workflows/ci.yml': L('name: ci', 'on: [push, pull_request]', 'jobs:', '  test:', '    runs-on: ubuntu-latest', '    steps:',
    '      - uses: actions/checkout@v4', '      - uses: astral-sh/setup-uv@v6',
    '      - run: uv run --frozen pytest', '      - run: npm test', '      - run: go test ./...'),
  '.env.example': L('API_KEY=', 'DATABASE_URL='),
  'README.md': L('# fixture', '', 'Small sample service: calc (Python), sum (Node) and clamp (Go). CI runs the three test suites.'),
  '.gitignore': L('.venv/', 'node_modules/', '__pycache__/', '.pytest_cache/'),
};

export const scenarioB = {
  ...scenarioA,
  'CLAUDE.md': L('# Project rules', '', 'Use the make targets; keep changes small.'),
  'AGENTS.md': L('# Agent notes', '', 'Run `make test` before proposing a change.'),
  '.claude/settings.json': JSON.stringify({ permissions: { allow: ['Bash(make test:*)'] } }, null, 2) + '\n',
  'Makefile': L('.PHONY: test lint', '', 'test:', `${T}uv run --frozen pytest`, `${T}npm test`, `${T}go test ./...`, '', 'lint:', `${T}go vet ./...`),
};

export const untrackedB = { 'CLAUDE.local.md': 'MY NOTES\n' };

export const expected = { A: { test: ['uv run --frozen pytest', 'npm test', 'go test ./...'] }, B: { testFirst: 'make test' } };
