// Opt-in verification gate (SessionStart, PostToolUse[Bash], PostToolUseFailure[Bash], Stop): Stop blocks once when non-doc code changed since the last passing check. Fail-open; ledger in the OS temp dir.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const EVENTS = ['SessionStart', 'PostToolUse', 'PostToolUseFailure', 'Stop'], KINDS = ['test', 'typecheck', 'lint', 'format'], NOTICE = 'Verification gate on';
// A check counts only when a shell segment starts with it (optionally after VAR=x), so `rg pytest` or `cat jest.config.js` do not.
const VERIFY_RE = new RegExp(String.raw`^(?:\w+=\S*\s+)*(?:(?:npx (?:--no-install )?|(?:uv|poetry) run (?:--?\S+ )*|\S*python3?(?:\.exe)? -m )?`
  + String.raw`(?:pytest|vitest|jest|tsc|mypy|pyright|ruff|eslint|prettier --check|golangci-lint)|go (?:test|vet)|gofmt -l|node --test`
  + String.raw`|(?:npm|pnpm|yarn|bun) (?:run )?(?:test|lint|typecheck|type-check|check)|make (?:test|lint|check|typecheck|fmt-check|format-check))\b`);
const KIND_RE = [['test', /pytest|go test|\btest\b|vitest|jest/], ['typecheck', /tsc|mypy|pyright|type-?check|check-types/], ['format', /prettier|gofmt|format|fmt/], ['lint', /./]];
const sha1 = (s) => crypto.createHash('sha1').update(s).digest('hex');
const git = (cwd, args, timeout) => {
  const r = spawnSync('git', args, { cwd, timeout, windowsHide: true, encoding: 'utf8', maxBuffer: 1 << 26 });
  if (r.error || r.status !== 0) throw new Error(`git ${args[0]} failed`);
  return r.stdout;
};
function fp(root) { // fingerprint of non-doc changes vs HEAD; null means unknown (fail open)
  try {
    const diff = git(root, ['diff', 'HEAD', '--no-ext-diff', '--', '.', ':(exclude)*.md', ':(exclude)docs/**'], 2000);
    const tracked = [...diff.matchAll(/^diff --git a\/(.+?) b\//gm)].map((m) => m[1]);
    const untracked = git(root, ['ls-files', '-o', '--exclude-standard', '-z'], 2000).split('\0').filter((f) => f && !/\.md$/i.test(f) && !f.startsWith('docs/'));
    const stats = untracked.map((f) => { try { const s = fs.statSync(path.join(root, f)); return `${f}\t${s.size}\t${s.mtimeMs}`; } catch { return f; } });
    return { hash: sha1(`${diff}\0${stats.join('\n')}`), files: [...tracked, ...untracked] };
  } catch { return null; }
}
try {
  const input = JSON.parse(fs.readFileSync(0, 'utf8').replace(/^\uFEFF/, '')); // PowerShell pipes may add a BOM
  const ev = input?.hook_event_name, cwd = input?.cwd || process.cwd();
  if (!EVENTS.includes(ev) || process.env.TK_GATE === 'off') process.exit(0);
  if (ev.startsWith('PostToolUse') && input.tool_name !== 'Bash') process.exit(0);
  const [root, offFile] = git(cwd, ['rev-parse', '--show-toplevel', '--git-path', 'dev-toolkit-gate-off'], 1500).trim().split(/\r?\n/);
  if (!root || fs.existsSync(path.resolve(cwd, offFile))) process.exit(0);
  const { detect } = await import('./detect.mjs');
  const d = detect(root), testCmd = d.commands.test[0]?.cmd, run = testCmd || "the repository's test command";
  const dir = path.join(os.tmpdir(), 'dev-toolkit-gate'), ledger = path.join(dir, `${sha1(root).slice(0, 12)}.jsonl`);
  const recs = fs.existsSync(ledger) ? fs.readFileSync(ledger, 'utf8').split('\n').flatMap((l) => { try { return [JSON.parse(l)]; } catch { return []; } }) : [];
  const add = (rec) => { fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(ledger, JSON.stringify({ ts: new Date().toISOString(), ev: rec.ev, session_id: input.session_id, ...rec }) + '\n'); };
  const mine = recs.filter((r) => r.session_id === input.session_id), start = mine.find((r) => r.ev === 'start'); // never trust other sessions
  if (ev === 'SessionStart') {
    if (!start) add({ ev: 'start', fp: fp(root)?.hash ?? null });
    let local = ''; try { local = fs.readFileSync(path.join(root, 'CLAUDE.local.md'), 'utf8'); } catch { /* no generated facts */ }
    if (!local.includes(NOTICE)) process.stdout.write(`${NOTICE}: after code changes run ${run} and show its exit code and output before finishing.\n`);
  } else if (ev === 'Stop') {
    if (input.stop_hook_active === true || !start || start.fp == null) process.exit(0);
    const now = fp(root);
    if (!now || now.hash === start.fp) process.exit(0);
    if (mine.some((r) => r.ev === 'check' && r.ok === true && (!testCmd || r.kind === 'test') && r.fp === now.hash)) process.exit(0);
    const list = now.files.slice(0, 3).join(', ') + (now.files.length > 3 ? ', ...' : '');
    const reason = `Code changed since the last passing check (${now.files.length} files: ${list}). Run ${run} as the command's last step `
      + `(only && may follow it; to trim: set -o pipefail; <cmd> 2>&1 | tail -15) and show the output. If it cannot run here, say 'not verified' and why.`;
    process.stdout.write(JSON.stringify({ decision: 'block', reason }));
    add({ ev: 'stop', decision: 'block', fp: now.hash });
  } else {
    const cmd = String(input.tool_input?.command || '').replace(/[;\s]+$/, ''), parts = cmd.split(/(\|\||&&|[;|\n])/); // even: segment; odd: separator
    const pipefail = /\bpipefail\b/.test(cmd), code = String(input.error || '').match(/Exit code (\d+)/)?.[1], now = fp(root)?.hash ?? null;
    for (let i = 0; i < parts.length; i += 2) {
      const seg = parts[i].trim();
      if (!VERIFY_RE.test(seg) && !d.allow.some((p) => seg.startsWith(p))) continue;
      const kind = KINDS.find((k) => d.commands[k].some((c) => seg.includes(c.allow))) || KIND_RE.find(([, rx]) => rx.test(seg))[0];
      // The command's exit code is this check's only when everything after it is joined by && (or a pipe under pipefail).
      const masked = parts.some((p, j) => j > i && j % 2 === 1 && p !== '&&' && !(p === '|' && pipefail));
      const unseen = masked || input.tool_input?.run_in_background || input.tool_response?.backgroundTaskId || input.tool_response?.interrupted; // result not observed: counts for nothing
      add({ ev: 'check', kind, ok: ev === 'PostToolUse' && (unseen ? null : true), exit: code ? +code : null, cmd: seg.slice(0, 200), fp: now });
    }
  }
} catch { /* fail open: never block on our own error */ }
