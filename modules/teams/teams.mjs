// Agent-teams hook for TaskCreated, TaskCompleted and TeammateIdle: one JSON line per event in dev-toolkit-logs/teams.jsonl in the repo's
// git dir (user layer: ~/.claude/logs), so the write-up can say which teammate did what; and the evidence rule as code: a teammate's task is
// marked complete only when its subject or description carries evidence (a command with its exit code, a file:line, or `not verified: <reason>`).
// The lead's own tasks, TaskCreated and TeammateIdle are logged only. A refusal exits 2 with the reason on stderr, which Claude Code hands back
// to the teammate; it adds the evidence (TaskUpdate) and completes the task again. One refusal per task and teammate: Claude Code completes a
// teammate's task again each time its turn ends, so the second attempt goes through, logged as allow-after-refusal (a teammate without the
// TaskUpdate tool cannot edit the task; it reports the evidence to the lead instead). TK_TEAMS_GATE=off logs without refusing.
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
const refusedBefore = (file, input) => fs.existsSync(file) && fs.readFileSync(file, 'utf8').split('\n').some((l) => { // this task was refused once already
  try { const r = JSON.parse(l); return r.decision === 'refuse' && r.team === input.team_name && r.teammate === input.teammate_name && String(r.task_id) === String(input.task_id); } catch { return false; }
});
try {
  const input = JSON.parse(fs.readFileSync(0, 'utf8').replace(/^\uFEFF/, '')); // PowerShell pipes may add a BOM
  const ev = input?.hook_event_name; if (!EVENTS.includes(ev)) process.exit(0);
  const subject = String(input.task_subject || '').slice(0, 200); const text = `${input.task_subject || ''}\n${input.task_description || ''}`;
  const gated = ev === 'TaskCompleted' && !!input.teammate_name && process.env.TK_TEAMS_GATE !== 'off';
  const dir = logDir(), file = path.join(dir, 'teams.jsonl');
  const decision = !gated ? 'log' : EVIDENCE.some((re) => re.test(text)) ? 'allow' : refusedBefore(file, input) ? 'allow-after-refusal' : 'refuse';
  const rec = { ts: new Date().toISOString(), ev, session_id: input.session_id, team: input.team_name, teammate: input.teammate_name, agent_id: input.agent_id,
    task_id: input.task_id, subject, decision };
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  fs.appendFileSync(file, JSON.stringify(rec) + '\n', { mode: 0o600 });
  if (decision === 'refuse') {
    process.stderr.write(`dev-toolkit: the task "${subject}" is not complete without evidence. Add to its description (TaskUpdate) the decisive command with its exit code, a file:line, or \`not verified: <reason>\`, then complete it again. Without a TaskUpdate tool: send that evidence to the lead (SendMessage) or put it in your final report; the next completion goes through.\n`);
    process.exit(2);
  }
} catch { /* fail open */ }
