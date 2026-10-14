// Opt-in UserPromptSubmit hook: one JSON line per prompt in ~/.claude/logs/trail.jsonl, so "what I asked" and "what the agent did"
// can be told apart later (the decisions ledger cites it). Credential-shaped strings are redacted; prompts are cut at 2000 characters.
// Prints nothing, so nothing enters the model's context. Fail-open: any error exits 0 silently.
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';

const redact = (s) => s
  .replace(/-----BEGIN[^-]*-----[\s\S]*?-----END[^-]*-----/g, '***')
  .replace(/(Bearer\s+)\S+/gi, '$1***')
  .replace(/([a-z][a-z0-9+.-]*:\/\/[^\s/:@]+:)[^\s@/]+@/gi, '$1***@')
  .replace(/((?:password|passwd|pwd|secret|token|api[_-]?key|access[_-]?key|private[_-]?key|client[_-]?secret)["']?\s*[=:]\s*)["']?[^\s"',;]+/gi, '$1***')
  .replace(/\b(?:gh[pousr]_|github_pat_|sk-|sk_live_|sk_test_|rk_live_|xox[abprs]-|AKIA|AIza)[\w-]*/g, '***')
  .replace(/\beyJ[\w.-]+/g, '***')
  .replace(/[A-Za-z0-9+=_-]{40,}/g, (m) => (/^[0-9a-f]{40}$/i.test(m) ? m : '***')); // long tokens go; a git SHA stays; paths (with slashes) stay
try {
  const input = JSON.parse(fs.readFileSync(0, 'utf8').replace(/^﻿/, '')); // PowerShell pipes may add a BOM
  if (input?.hook_event_name !== 'UserPromptSubmit' || typeof input.prompt !== 'string') process.exit(0);
  const dir = path.join(process.env.HOME || os.homedir(), '.claude', 'logs'); fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const rec = { ts: new Date().toISOString(), session_id: input.session_id, cwd: input.cwd, prompt: redact(input.prompt).slice(0, 2000) };
  fs.appendFileSync(path.join(dir, 'trail.jsonl'), JSON.stringify(rec) + '\n', { mode: 0o600 });
} catch { /* fail open */ }
