// PreToolUse guard: deny destructive, secret-revealing and supply-chain actions; ask before shared writes. Rules: guard-rules.mjs.
// Fail-open: unreadable input or any error exits 0 silently. No match: no output. Every path exits 0.
// settings.json denies only Read/Edit of *.env; this guard also covers .env.* variants for Read, Edit, Write, Bash and Grep (path and glob).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// A repo install (.claude/hooks/tk/) logs in that repo's git dir, so nothing is written outside the checkout; the user layer logs to ~/.claude/logs.
function logDir() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  if (path.basename(here) !== 'tk') return path.join(process.env.HOME || os.homedir(), '.claude', 'logs');
  const dotgit = path.resolve(here, '../../../.git'); // a linked worktree or submodule has a .git file pointing at its git dir
  return path.join(fs.statSync(dotgit).isFile() ? path.resolve(path.dirname(dotgit), /^gitdir:\s*(.+)$/m.exec(fs.readFileSync(dotgit, 'utf8'))[1].trim()) : dotgit, 'dev-toolkit-logs');
}

const SEARCH = /^\s*(?:rg|grep|egrep|fgrep|git\s+(?:-C\s+\S+\s+)*(?:log|grep))\b/; // read-only searches; command rules outside WHOLE skip these segments
const SEGMENTS = /\|\||&&|[;|\n]/;
// A Grep glob becomes concrete names for the secret-file rule: braces expand, `**/` drops, each `*` or `?` is tried as "" and "x".
function globNames(g) {
  const m = /\{([^{}]*)\}/.exec(g);
  if (m) return m[1].split(',').flatMap((alt) => globNames(g.replace(m[0], alt)));
  return ['', 'x'].map((w) => g.replace(/\*\*\//g, '').replace(/[*?]/g, w));
}
const redact = (s) => s.replace(/(Bearer\s+)\S+/gi, '$1***')
  .replace(/\b(?:ghp_|gho_|github_pat_|sk-|xox[abprs]-|AKIA)[\w-]*|\beyJ[\w.-]+|[A-Za-z0-9_-]{32,}/g, '***').slice(0, 160);

let input;
try { input = JSON.parse(fs.readFileSync(0, 'utf8').replace(/^\uFEFF/, '')); } catch { process.exit(0); } // PowerShell pipes may add a BOM
try {
  const { RULES, FILE_RULES, WHOLE } = await import('./guard-rules.mjs');
  const tool = String(input?.tool_name || ''), ti = input?.tool_input || {};
  const isCmd = tool === 'Bash' || tool === 'PowerShell';
  const fileOf = { Read: ti.file_path, Edit: ti.file_path, Write: ti.file_path, MultiEdit: ti.file_path, NotebookEdit: ti.notebook_path };
  const raw = isCmd ? [ti.command] : tool === 'Grep' ? [ti.path, ...(typeof ti.glob === 'string' ? globNames(ti.glob) : [])] : [fileOf[tool]];
  const subjects = raw.filter((s) => typeof s === 'string' && s).map((s) => s.replace(/\\/g, '/'));
  const rules = isCmd ? RULES : tool === 'Read' || tool === 'Grep' ? FILE_RULES.slice(0, 1) : FILE_RULES;
  // Separators inside quotes do not split segments (a regex alternation in a search pattern stays part of the search).
  const unquote = (s) => s.replace(/"(?:[^"\\]|\\.)*"|'[^']*'/g, (q) => q.replace(/[|;&]/g, ' '));
  // A search segment counts again when it runs a command substitution.
  const noSearch = (s) => unquote(s).split(SEGMENTS).filter((seg) => !SEARCH.test(seg) || /\$\(|`/.test(seg)).join(' ; ');
  const matches = (s) => rules.find(([id, , rx]) => rx.test(isCmd && !WHOLE.has(id) ? noSearch(s) : s)); // `rg "git push --force" docs/` is a search, not a push
  const [subject, hit] = subjects.map((s) => [s, matches(s)]).find(([, h]) => h) || [];
  if (hit) {
    const [rule, decision, , why] = hit;
    const reason = decision === 'deny'
      ? `Blocked by local safety guard (${rule}): ${why}. If intended, ask the user to run it manually.`
      : `Confirm (${rule}): ${why}.`;
    const hookSpecificOutput = { hookEventName: 'PreToolUse', permissionDecision: decision, permissionDecisionReason: reason };
    process.stdout.write(JSON.stringify({ hookSpecificOutput }));
    try {
      const dir = logDir();
      fs.mkdirSync(dir, { recursive: true });
      const rec = { ts: new Date().toISOString(), session_id: input.session_id, cwd: input.cwd, tool, decision, rule, subject: redact(subject) };
      fs.appendFileSync(path.join(dir, 'guard.jsonl'), JSON.stringify(rec) + '\n');
    } catch { /* logging is best effort */ }
  }
} catch { /* fail open */ }
