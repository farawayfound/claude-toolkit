#!/usr/bin/env node
// ship-check.mjs: the pre-submission gate for a repository that other people will read.
//   node ship-check.mjs [--repo DIR] [--readme-max 80] [--no-run] [--cmd "<command>"]... [--zip PATH] [--json]
// Rows: tracked-file inventory, dirty tree, junk, editor and stray files, generated output, lockfiles, big files, scaffold leftovers, env files,
// history noise, secrets, README (sections, placeholders, length), rubric-anticipation sections, decision ledger, AGENTS.md, and a fresh-clone
// run of the README's own commands. Only runner-shaped commands run on their own (python, node, pytest, npm test, go test, make test, ...);
// installs, pipelines, scripts and anything else are listed and left to --cmd. Nothing in the repo is modified; the clone goes to the OS temp dir.
// Exit: 0 no FAIL, 1 any FAIL, 2 usage or not a git repo, 3 git missing.
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const die = (code, msg) => { console.error(`ERROR: ${msg}`); process.exit(code); };
const argv = process.argv.slice(2); const F = { repo: '.', 'readme-max': 80, cmds: [], run: true, json: false };
for (let i = 0; i < argv.length; i++) {
  const a = argv[i], v = argv[i + 1];
  if (['--repo', '--readme-max', '--zip'].includes(a)) { if (v === undefined) die(2, `${a} needs a value`); F[a.slice(2)] = v; i++; }
  else if (a === '--cmd') { if (v === undefined) die(2, '--cmd needs a command'); F.cmds.push(v); i++; }
  else if (a === '--no-run') F.run = false; else if (a === '--json') F.json = true;
  else die(2, `unknown flag ${a}; usage: node ship-check.mjs [--repo DIR] [--readme-max N] [--no-run] [--cmd "<command>"]... [--zip PATH] [--json]`);
}
const ENV = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/KEY|TOKEN|SECRET|PASSW|CREDENTIAL|NODE_TEST_CONTEXT/i.test(k))); // the clone proves the README works without hidden env
const sh = (c, a, o = {}) => { const r = spawnSync(c, a, { cwd: o.cwd, encoding: 'utf8', windowsHide: true, timeout: o.timeout || 60000, env: ENV, maxBuffer: 1 << 26 });
  return { code: r.error ? null : r.status, out: (r.stdout || '').trim(), err: (r.stderr || '').trim() }; };
const killTree = (pid) => { try { if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { windowsHide: true }); else process.kill(-pid, 'SIGKILL'); } catch { /* gone */ } };
const runCmd = (c, a, cwd, ms) => new Promise((resolve) => { // async, so a timeout kills the whole process tree while its root is still alive
  let out = '', timeout = false; const child = spawn(c, a, { cwd, env: ENV, windowsHide: true, detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'] });
  const grab = (d) => { if (out.length < 1e6) out += d; }; child.stdout.on('data', grab); child.stderr.on('data', grab);
  const timer = setTimeout(() => { timeout = true; killTree(child.pid); }, ms);
  const done = (code, err) => { clearTimeout(timer); resolve({ code, timeout, tail: (err || out).trim().split('\n').slice(-2).join(' | ') }); };
  child.on('error', (e) => done(null, e.message)); child.on('close', (code) => done(code));
});
if (sh('git', ['--version']).code !== 0) die(3, 'git not found');
const top = sh('git', ['rev-parse', '--show-toplevel'], { cwd: path.resolve(F.repo) }); if (top.code !== 0) die(2, `${F.repo} is not inside a git repository`);
const ROOT = path.resolve(top.out); const git = (args) => sh('git', args, { cwd: ROOT });
const rows = []; const row = (id, check, result, detail = '') => rows.push({ id, check, result, detail: String(detail).replace(/\s+/g, ' ').trim().slice(0, 300) });
const fwd = (p) => p.replace(/\\/g, '/'); const list = (xs, n = 6) => xs.slice(0, n).join(', ') + (xs.length > n ? `, +${xs.length - n} more` : '');
const readIf = (p) => (fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null); const nlines = (t) => t.split('\n').length - (t.endsWith('\n') ? 1 : 0);

// 1. inventory and the tree
const tracked = git(['ls-files', '-z']).out.split('\0').filter(Boolean);
const size = Object.fromEntries(tracked.map((f) => [f, fs.statSync(path.join(ROOT, f), { throwIfNoEntry: false })?.size || 0]));
const total = Object.values(size).reduce((a, b) => a + b, 0); const largest = [...tracked].sort((a, b) => size[b] - size[a]).slice(0, 8);
row('tree', `${tracked.length} tracked files, ${Math.round(total / 1024)} KB`, 'INFO', `largest: ${largest.map((f) => `${f} ${Math.round(size[f] / 1024)}K`).join(', ')}`);
const dirty = git(['status', '--porcelain']).out.split('\n').filter(Boolean);
row('status', 'working tree clean (uncommitted work does not ship)', dirty.length ? 'FAIL' : 'PASS', list(dirty.map((l) => l.trim())));

// 2. what should not be tracked
const JUNK = /(^|\/)(__pycache__|\.pytest_cache|\.ruff_cache|\.mypy_cache|\.tox|\.eggs|[^/]+\.egg-info|htmlcov|\.nyc_output|\.venv|venv|node_modules|\.cache|__MACOSX|\.DS_Store|Thumbs\.db|desktop\.ini|\.coverage)(\/|$)|\.(pyc|pyo)$/i;
const EDITOR = /(^|\/)(\.idea|\.vscode|\.vs|\.fleet)(\/|$)/i; const STRAY = /\.(log|tmp|swp|orig|rej|bak|old)$|~$/i;
const GENERATED = /(^|\/)(out|dist|build|coverage|target|\.next|\.nuxt)(\/|$)/i;
const LOCK = /(^|\/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb?|uv\.lock|poetry\.lock|Pipfile\.lock|Cargo\.lock|composer\.lock|Gemfile\.lock)$/;
const SCAFFOLD = /(^|\/)(_?scaffold[^/]*|starter[-_ ]?kit[^/]*|unused[^/]*|backup[^/]*|scratch|wip)(\/|$)/i;
const ENVFILE = /(^|\/)\.env(?!\.(example|sample|template|dist)$)(\.[^/]+)?$/;
const flag = (id, check, re, level, hint = '') => { const hits = tracked.filter((f) => re.test(f)); row(id, check, hits.length ? level : 'PASS', hits.length ? `${list(hits)}${hint ? `; ${hint}` : ''}` : ''); };
flag('junk', 'no caches, virtualenvs, build metadata or OS files tracked', JUNK, 'FAIL');
flag('editor', 'no editor settings tracked', EDITOR, 'WARN', 'personal settings; keep only if the team shares them');
flag('stray', 'no logs, temp or backup files tracked', STRAY, 'WARN');
flag('generated', 'no generated output directories tracked', GENERATED, 'WARN', 'keep only what the brief asks for (examples/ beats out/)');
flag('lockfile', 'lockfiles only when the install step needs them', LOCK, 'WARN', 'a stdlib-only project ships none');
const big = tracked.filter((f) => size[f] > 100 * 1024); row('big', 'no tracked file over 100 KB', big.length ? 'WARN' : 'PASS', list(big.map((f) => `${f} ${Math.round(size[f] / 1024)}K`)));
flag('scaffold', 'no scaffold, starter-kit, unused or backup paths', SCAFFOLD, 'WARN');
flag('envfile', 'no .env files tracked (.env.example is fine)', ENVFILE, 'FAIL');

// 3. history
const subjects = git(['log', '--format=%s']).out.split('\n').filter(Boolean);
const NOISE = /\b(scaffold|starter[- ]?kit|wip|fixup|squash|oops|typo|temp|pre-challenge|unused|cleanup after|remove .*(kit|scaffold|starter))\b/i;
const noisy = subjects.filter((s) => NOISE.test(s)); const gone = [...new Set(git(['log', '--diff-filter=D', '--name-only', '--pretty=format:']).out.split('\n').filter(Boolean))].filter((f) => !tracked.includes(f));
row('history', `${subjects.length} commits read as a story (no scaffold, WIP or removal noise)`, noisy.length || gone.length > 3 ? 'WARN' : 'PASS',
  [noisy.length ? `subjects: ${list(noisy.map((s) => `"${s.slice(0, 50)}"`), 3)}` : '', gone.length ? `${gone.length} paths added then deleted (${list(gone, 3)}); squash or start clean` : ''].filter(Boolean).join('; '));

// 4. secrets: tracked text files, matched text only; the prefix is printed, never the value
const SECRETS = [ // [regex with the value as group 1 or the whole match]
  /(?<![A-Za-z0-9_-])(sk-[A-Za-z0-9_-]{16,})/g, /(?<![A-Za-z0-9_])((?:sk|rk|pk)_(?:live|test)_[A-Za-z0-9]{10,})/g, /(?<![A-Za-z0-9])(AKIA[0-9A-Z]{16})(?![A-Za-z0-9])/g,
  /\b(gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})/g, /\b(xox[abprs]-[A-Za-z0-9-]{10,})/g, /\b(AIza[0-9A-Za-z_-]{35})/g,
  /(-----BEGIN [A-Z ]*PRIVATE KEY-----)/g, /\b(eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,})/g,
  /[a-z][a-z0-9+.-]*:\/\/[^\s/:@'"]+:([^\s@/'"]{3,})@/gi,
];
const ASSIGN = /(?<![A-Za-z0-9_])["']?[A-Za-z0-9_]*(?:password|passwd|pwd|secret|token|api[_-]?key|access[_-]?key|private[_-]?key)[A-Za-z0-9_]*["']?\s*[:=]\s*["']?([^\s"',;]{8,})/gi; // any key naming a secret
const PLACEHOLDER = /example|sample|placeholder|your[_-]?|changeme|dummy|redacted|xxx|\*\*\*|^[<{$%(]|\$\{|process\.env|os\.environ|getenv|^\.{3}$/i;
const CODE = /[()[\]{}]|\.[A-Za-z]/; // a call, an index or a dotted name is code, not a literal secret
const secretValue = (v, generic) => !PLACEHOLDER.test(v) && (!generic || (!CODE.test(v) && /[A-Za-z]/.test(v) && /\d/.test(v)) || (!generic && /[/+=]/.test(v)));
const hits = []; let unreadable = 0;
for (const f of tracked) {
  if (size[f] > 1024 * 1024) continue; let buf; try { buf = fs.readFileSync(path.join(ROOT, f)); } catch { unreadable++; continue; }
  if (buf.subarray(0, 8000).includes(0)) continue;
  buf.toString('utf8').split('\n').forEach((l, i) => { // one hit per line, the first pattern that matches; minified lines are skipped
    if (l.length > 4000) return;
    for (const [re, generic] of [...SECRETS.map((re) => [re, false]), [ASSIGN, true]]) { const v = [...l.matchAll(re)].map((m) => m[1] ?? m[0]).find((x) => secretValue(x, generic)); if (v) { hits.push(`${f}:${i + 1} ${v.slice(0, 6)}***`); return; } }
  });
}
row('secrets', 'no credential-shaped strings in tracked files', hits.length ? 'FAIL' : unreadable ? 'WARN' : 'PASS', hits.length ? list(hits) : unreadable ? `${unreadable} files could not be read` : '');

// 5. docs
const README = ['README.md', 'README', 'readme.md', 'README.rst'].map((f) => path.join(ROOT, f)).find((p) => fs.existsSync(p)); const readme = README ? readIf(README) : null;
if (!readme) row('readme', 'README exists', 'FAIL', 'no README.md at the repo root');
else {
  const lines = nlines(readme); const hasRun = /^#+ .*(quick ?start|run|usage|getting started|how to use|install)/im.test(readme); const hasTest = /^#+ .*test/im.test(readme);
  const ph = [...(readme.match(/<write this yourself>|lorem ipsum|\[your name\]|\[company\]/gi) || []), ...(readme.match(/\bTODO\b|\bTBD\b/g) || [])];
  row('readme', `README has run and test sections, no placeholders, at most ${F['readme-max']} lines`, ph.length ? 'FAIL' : !hasRun || !hasTest || lines > +F['readme-max'] ? 'WARN' : 'PASS',
    [ph.length ? `placeholders: ${list([...new Set(ph)])}` : '', hasRun ? '' : 'no run/usage section', hasTest ? '' : 'no test section', lines > +F['readme-max'] ? `${lines} lines; move detail into docs/` : ''].filter(Boolean).join('; '));
}
const mds = tracked.filter((f) => /\.(md|rst|txt)$/i.test(f)); const RUBRIC = /^#+ .*(implied expectations|evaluation guess|what (the )?reviewers? (will |might )?(look|check)|likely review|review points|hidden requirements|rubric)/im;
const rubric = mds.filter((f) => RUBRIC.test(readIf(path.join(ROOT, f)) || '')); row('rubric', 'no rubric-anticipation sections in tracked docs', rubric.length ? 'FAIL' : 'PASS', rubric.length ? `${list(rubric)}: keep reviewer guesses out of the repo; commit a requirement-to-test table instead` : '');
const ledger = readIf(path.join(ROOT, 'docs/decisions.md')); const mine = ledger ? (ledger.match(/^\|.*\|\s*me\s*\|/gim) || []).length : 0;
row('ledger', 'docs/decisions.md has at least one decision attributed to you', mine ? 'PASS' : 'WARN', mine ? '' : ledger ? 'no row with "| me |"; add the calls you made' : 'no docs/decisions.md; /takehome-init creates it');
row('guide', 'AGENTS.md or CLAUDE.md tells the next reader the commands and layout', ['AGENTS.md', 'CLAUDE.md'].some((f) => fs.existsSync(path.join(ROOT, f))) ? 'PASS' : 'INFO', 'optional; /tighten-docs writes a 40-line AGENTS.md');

// 6. fresh clone: the README's own commands, runner-shaped ones only
function readmeCommands(text) { // fenced blocks under run/test/usage headings; `$ ` prompts stripped; comments, placeholders and cd lines dropped
  const out = []; let heading = '', fence = false, keep = false;
  for (const raw of text.split('\n')) {
    const l = raw.replace(/\r$/, '');
    if (!fence && /^#+\s/.test(l)) { heading = l; continue; }
    if (/^\s*(```|~~~)/.test(l)) { fence = !fence; keep = fence && /(quick ?start|run|usage|getting started|how to use|install|test)/i.test(heading); continue; }
    if (fence && keep) out.push(l.replace(/^\s*(\$|>|PS>)\s+/, '').trim());
  }
  return out.filter((l) => l && !/^(#|\/\/|rem\b)/i.test(l) && !/<[^>]+>/.test(l) && !/^cd\b/.test(l));
}
const RUNNER = /^(?:[A-Za-z_][A-Za-z0-9_]*=\S+\s+)*(?:python3?|py|node|deno|bun|uv run(?: --(?:frozen|locked|no-sync))*|poetry run|pipenv run|npm (?:test|start|run \S+)|pnpm (?:test|start|run \S+)|yarn (?:test|start|run \S+)|npx --no-install \S+|pytest|go (?:test|run|vet|build)|cargo (?:test|run|build|check)|make (?:test|lint|check|build|run|fmt-check|format-check)|dotnet (?:test|run|build)|mvn (?:test|verify|package)|gradlew? (?:test|build|check)|java -jar \S+|ruby \S+|php \S+)(?:\s|$)/;
const UNSAFE = /[|;&<>`]|\$\(|\b(?:sudo|curl|wget|rm|del|git push|docker|ssh|scp|chmod|install|ci|sync|serve|watch|dev)\b/;
function gitBash() {
  if (process.platform !== 'win32') return sh('bash', ['-c', 'true']).code === 0 ? 'bash' : null;
  const c = [process.env.CLAUDE_CODE_GIT_BASH_PATH, 'C:/Program Files/Git/bin/bash.exe', 'C:/Program Files (x86)/Git/bin/bash.exe', process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Programs/Git/bin/bash.exe')];
  return c.find((p) => p && fs.existsSync(p)) || null;
}
if (!F.run) row('run', 'fresh-clone run of the README commands', 'SKIP', '--no-run');
else if (!readme && !F.cmds.length) row('run', 'fresh-clone run of the README commands', 'SKIP', 'no README and no --cmd');
else {
  let cmds = F.cmds, skipped = [];
  if (!cmds.length) { const all = readmeCommands(readme); skipped = all.filter((l) => !RUNNER.test(l) || UNSAFE.test(l)); cmds = all.filter((l) => !skipped.includes(l)).slice(0, 8); }
  if (skipped.length) row('run', 'only runner-shaped commands run unasked (no installs, pipelines, scripts or servers)', 'INFO', `skipped: ${list(skipped, 3)}; pass --cmd "<command>" to run one`);
  if (!cmds.length) row('run', 'fresh-clone run of the README commands', 'WARN', 'no runnable commands found under run/test headings; pass --cmd');
  else {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ship-')); const clone = path.join(dir, 'clone'); const cl = sh('git', ['clone', '--quiet', ROOT, clone], { timeout: 120000 }); const bash = gitBash();
    if (cl.code !== 0) row('run', 'fresh clone', 'FAIL', cl.err.split('\n').pop());
    else for (const c of cmds) {
      const r = bash ? await runCmd(bash, ['-c', `set -o pipefail; ${c}`], clone, 120000) : await runCmd(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', c], clone, 120000);
      row('run', `fresh clone${bash ? '' : ' (cmd.exe; Git Bash not found)'}: ${c}`, r.timeout ? 'WARN' : r.code === 0 ? 'PASS' : 'FAIL', r.timeout ? 'did not exit in 120 s; its process tree was killed (a server? pass --cmd for the rest)' : `exit ${r.code}${r.code ? `: ${r.tail}` : ''}`);
    }
    try { fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3 }); } catch { row('run', 'temporary clone removed', 'WARN', `left at ${fwd(dir)}`); }
  }
}

// 7. archive, only on request: git archive never carries untracked or ignored files
if (F.zip) { const z = git(['archive', '--format=zip', '-o', path.resolve(F.zip), 'HEAD']); row('zip', `git archive -> ${fwd(F.zip)}`, z.code === 0 ? 'PASS' : 'FAIL', z.code === 0 ? `${tracked.length} entries, ${Math.round(fs.statSync(path.resolve(F.zip)).size / 1024)} KB` : z.err); }

const n = (r) => rows.filter((x) => x.result === r).length; const verdict = n('FAIL') ? 'FAIL' : 'PASS';
if (F.json) console.log(JSON.stringify({ root: fwd(ROOT), verdict, fail: n('FAIL'), warn: n('WARN'), rows }, null, 2));
else {
  console.log(`${'ID'.padEnd(10)}${'Check'.padEnd(70)}${'Result'.padEnd(7)}Detail`);
  for (const r of rows) console.log(`${r.id.padEnd(10)}${r.check.slice(0, 68).padEnd(70)}${r.result.padEnd(7)}${r.detail}`);
  console.log(`\nShip: ${verdict} (${n('FAIL')} FAIL, ${n('WARN')} WARN) in ${fwd(ROOT)}`);
}
process.exit(verdict === 'FAIL' ? 1 : 0);
