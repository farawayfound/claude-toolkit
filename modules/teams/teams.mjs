// Agent-teams hook for TaskCreated, TaskCompleted and TeammateIdle: one JSON line per event in dev-toolkit-logs/teams.jsonl in the repo's
// git dir (user layer: ~/.claude/logs), so the write-up can say which teammate did what; and the evidence rule as code: a teammate's task is
// marked complete only when its subject or description carries evidence (a command with its exit code, a file:line, or `not verified: <reason>`).
// The lead's own tasks, TaskCreated and TeammateIdle are logged only. A refusal exits 2 with the reason on stderr, which Claude Code hands back
// to the teammate; it adds the evidence (TaskUpdate) and completes the task again. TK_TEAMS_GATE=off logs without refusing.
// Prints nothing on stdout. Fail-open: unreadable input or an internal error exits 0 silently, so a broken hook never blocks work.
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

function logDir() { // a repo install (.claude/hooks/tk/) logs in that repo's git dir, so nothing is written outside the checkout
  const here = path.dirname(fileURLToPath(import.meta.url));
  if (path.basename(here) !== 'tk') return path.join(process.env.HOME || os.homedir(), '.claude', 'logs');
  const dotgit = path.resolve(here, '../../../.git'); // a linked worktree or submodule has a .git file pointing at its git dir
  return path.join(fs.statSync(dotgit).isFile() ? path.resolve(path.dirname(dotgit), /^gitdir:\s*(.+)$/m.exec(fs.readFileSync(dotgit, 'utf8'))[1].trim()) : dotgit, 'dev-toolkit-logs');
}
const EVIDENCE = [/\bexit(?: code)?[ :=]+\d+\b/i, /(?:^|[\s`'"(])[\w./-]+\.[A-Za-z]\w{0,5}:\d+\b/, /\bnot verified:/i];
const EVENTS = ['TaskCreated', 'TaskCompleted', 'TeammateIdle'];
try {
  const input = JSON.parse(fs.readFileSync(0, 'utf8').replace(/^﻿/, '')); // PowerShell pipes may add a BOM
  const ev = input?.hook_event_name; if (!EVENTS.includes(ev)) process.exit(0);
  const subject = String(input.task_subject || '').slice(0, 200); const text = `${input.task_subject || ''}\n${input.task_description || ''}`;
  const gated = ev === 'TaskCompleted' && !!input.teammate_name && process.env.TK_TEAMS_GATE !== 'off';
  const allowed = !gated || EVIDENCE.some((re) => re.test(text));
  const rec = { ts: new Date().toISOString(), ev, session_id: input.session_id, team: input.team_name, teammate: input.teammate_name, agent_id: input.agent_id,
    task_id: input.task_id, subject, decision: gated ? (allowed ? 'allow' : 'refuse') : 'log' };
  const dir = logDir(); fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  fs.appendFileSync(path.join(dir, 'teams.jsonl'), JSON.stringify(rec) + '\n', { mode: 0o600 });
  if (!allowed) {
    process.stderr.write(`dev-toolkit: the task "${subject}" is not complete without evidence. Add to its description (TaskUpdate) the decisive command with its exit code, a file:line, or \`not verified: <reason>\`, then complete it again.\n`);
    process.exit(2);
  }
} catch { /* fail open */ }
