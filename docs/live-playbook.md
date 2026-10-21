# Playbook · the 60-minute live session

**Thesis:** directed, verified, small-diff engineering on *their* code, with the work visibly parallel. Read first, agree the plan, failing test first, one PR-quality change, real check output, independent review passes, PR text with a measurement line. One change done well beats three half-done. Prep material stays on the desk or a second screen, never in the shared window.

## 1 · The hour

| Min | Phase | Do | Say (15 words or fewer) | Checkpoint |
|---|---|---|---|---|
| 0-3 | Ground rules | The four questions (§2); clone; branch; `claude` | "A few quick questions, then I read before I touch anything." | Their answers |
| 3-10 | `/recon [topic]` | Four agents fan out; meanwhile skim the README and ask §2b | "Four read-only agents: baseline, the path to the write, bypasses, conventions." | "Is this the chokepoint you'd expect?" |
| 10-15 | `/scope [task]` | Cases, at most 5 files, non-goals, measurement, rollback, tracks | "Here's what done means and what I'm not touching." | **Agreement before any edit** |
| 15-38 | Build | test-writer writes RED while you direct the fix; verifier in the background; `/check` | "Tests fail for the right reason; now the smallest fix." | Show RED (about minute 24) |
| 38-48 | Review | `/team review main`: three reviewer teammates, one lens each, each refuting the others; or the reviewer agent per lens; fix CONFIRMED; re-verify | "Independent reviewers, each finding attacked before I trust it." | Anything they want probed |
| 48-55 | `/pr-brief` | Walk the diff top-down; follow-ups; "push, or keep it local?" | "Problem, change, evidence, measurement, risk, rollback, next." | |
| 55-60 | Buffer | Questions (§9) | | |
| **40** | **Slip rule** | Not green? Stop adding. Keep what is proven; write `not verified: [reason]` for the rest | "Here's what's proven, here's what isn't, and why." | |

Four checkpoints only: after recon, after scope, at RED, before the PR. Between them, talk for at most two minutes, then invite a probe.

## 2 · Minute 0

Ask first, before any command:
1. "Before I start: what would each of you most like to see in the next hour?" (reveals each person's lens: user impact, red/green and diff size, deny by default and audit)
2. "Am I proposing PRs or writing them, and what does done look like at minute 60?"
3. "OK to use my own Claude Code setup and account on this code? Local config only; nothing touches your git."
4. "Fixtures and mocks only, or credentials to assume? OK to run `npm ci` / `uv sync` / `go mod download`?"

Run in: Terminal, any folder; the last line starts Claude Code.

```bash
cd ~/dev
gh repo clone [owner]/[repo]
cd [repo]                                                   # an archive instead: unzip it, cd into it, add --init to the next line
node "$HOME/claude-toolkit/install.mjs" --set live          # the live set, this checkout only; git status stays the same
git switch -c fix/[slug]                                    # one issue; several: see §4, one worktree per issue
claude                                                      # accept trust, then type /recon [topic] at the Claude Code prompt
```
Permission mode: default for recon; **Shift+Tab to acceptEdits** after the plan is approved; auto only if prompts stack up (the guard's denies still apply; push and PR still ask). Share one window.

**2b · During recon** (ask while the agents run): Can I run it locally; which test command; does a service need to be up? Where does the acting user's identity come from today: session, header, env var, or a shared integration user? What defines "team": owner field, manager field, hierarchy, IdP group; direct reports or the subtree? Writes only, or reads too? Pushed branch and draft PR, or local branch plus PR text?

## 3 · The loop, with the exact prompts

Everything with a slash, and every quoted prompt, is typed at the Claude Code prompt in the project's folder; `[square brackets]` are yours to replace.

**Recon** · `/recon update [record]` (or plain `/recon` before the task is known): four agents in one message; the brief lands in `.claude/plan/recon.md` and ends with three questions (issues, constraints, rules) plus the `/scope` line to type. Read the chokepoint line aloud and ask the room to confirm it.

**Scope** ·
```
/scope issues: [the task in one sentence, or the issue paths]; constraints: smallest diff, the repo's own patterns, no new deps, fixtures only, nothing touches shared systems; rules: done means [tests + checks], commits only when asked, one branch per issue.
```
It writes one plan file per issue under `.claude/plan/` and stops with "Approve these plans, or tell me what to change." Say what to cut. One issue: `Approved. Build plan 01 here: test-writer on its cases now; I will direct the fix.` Several: `Approved. /team build` (a builder per plan in its own worktree and branch, plus qa).

**Build** · steer it:
- `Fix at [file:line] only; use the existing [helper]; no new module.`
- `Root cause first, one sentence, before you edit.`
- `Run just the new tests and show the exit code.` then `/check`.

**Review** · `/team review main`: three reviewer teammates, one lens each, visible in the agent list under the prompt, each trying to refute the others' findings; the lead re-runs every high. Without a team: `Use the reviewer agent on the diff against main, one lens: bypasses.` With `break` and `gate-workflow` added for a 90-minute slot, `/break [feature]` then `/gate main` come first. Then: `Fix the CONFIRMED findings only; list PLAUSIBLE ones as PR follow-ups. Re-run the verifier.` Optional extras: `/code-review high`, `/simplify`, `/security-review` (needs `origin`).

**PR** · `/pr-brief` prints title and body; it creates nothing. `Push the branch and open a draft PR` only if they said so (the guard asks; never force).

## 4 · Parallel patterns

| Pattern | How | Use |
|---|---|---|
| Fan-out reads | Several Explore or verifier agents in **one** message, each with a 15-line return format | Unknown codebase; any "where does X happen?" |
| Tests alongside the fix | test-writer writes RED while you read the edit site and state the fix | Every change; never edit source before RED is shown |
| One issue per worktree | `/parallel plan [issues]`; in a terminal `wt-new [N]:[slug] ...`, then `wtc [N]` in one pane per issue (`wt-workspace` once makes the VS Code workspace whose terminals have the scripts on PATH) | Several issues: each window passes the same gates; commit before review or stacking; `/parallel check` (`wt-conflicts`) before the PRs |
| Isolated track, one-off | A second terminal: `claude -w [name]` (worktree under `.claude/worktrees/`, branch `worktree-[name]`) | Disjoint files only; integrate with `git -C [wt] diff` then `git apply` |
| Background checks | `verifier` agent in the background; `/tasks` shows and stops it | After each GREEN, while you move on |
| Agent team | `/team build`, `/team review`, `/team hunt`: named teammates (Agent calls with a `name`) with a shared task list; arrow keys and Enter in the agent list open one to talk to it; inside a tmux or psmux session with `teammateMode: "auto"` each teammate is a pane (`setup/tmux.sh`; Windows: `tmux.cmd` installs psmux, tmux for Windows); the TaskCompleted hook refuses a task without evidence | A builder per plan plus qa, review lenses, competing hypotheses; each teammate is a session, so the skill says how many first |
| Review passes | `/team review`, the reviewer agent per lens, `/code-review high`, `/simplify`; `/break` and `/gate` when installed | Before the PR |
| Side question | `/btw [question]` | Answer the room without derailing the main thread |
| Side investigation | Second terminal, same repo, read-only: "list every other write path to [system] not covered by [fn]; file:line" | The found-while-here list |

Rules that keep parallel work honest: every brief is self-contained; parallel writers only on disjoint files or in separate worktrees; a subagent's report is a claim until you re-run its decisive command; one `/compact` between phases if `/context` is heavy. With a window per issue, the agents work in parallel and you review in series: launch the long important issue first and the smallest second, go to whichever window is at a gate, and stop launching when three wait on you.

## 5 · Prompt structure

```
Goal: [one sentence]
Context: [files, commands, what is already known]
Constraints: read-only | test files only | no new deps | fixtures only | no commits
Done when: [observable result]
Return: at most 15 lines, file:line evidence, exit codes quoted
```

## 6 · When Claude is wrong on screen

This is the "review the output critically" demo, not a crisis. Name it ("that's wrong: X"), show the evidence (output, file:line), constrain the redirect ("change only Y, keep Z"), demand the failing test that proves it. Own your misses the same way.

| Situation | Move |
|---|---|
| Guard blocked a legitimate command | "That's my local guard", then run it yourself in the terminal |
| "hook error" on every call | `"disableAllHooks": true` in `.claude/settings.local.json`, restart; or `claude --safe-mode` |
| Prompts piling up | Shift+Tab to acceptEdits or auto; `/permissions` adds an allow rule |
| Wrong edit, wrong direction | `/rewind` to the checkpoint before it; restate the constraint in one line |
| Context long, looping | `/compact`; Esc, one-line restatement; `/context` to see why |
| Agent stuck or runaway | `/tasks`, stop it; a teammate: select it in the agent list and press `x`; re-brief smaller; `/workflows` for `/gate` |
| "No team tool" when you asked for teammates | Start `claude` in the folder that holds `.claude/settings.local.json` (a subfolder does not read it); teammates are Agent calls with a `name`, not a separate tool; with `-p` there are none |
| Teammates where you wanted subagents, or a team misbehaving | `"CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "0"` under `env` in `.claude/settings.local.json`; no restart needed |
| Tests need a DB or service | Ask; `docker compose up -d [svc]`; else `not verified: [reason]` |
| Rate limit or slow model | `/model sonnet`; fewer agents; continue by hand, narrating |
| Asked to drop my config | Worktrees first (`git worktree remove [path]`), then `node "$HOME/claude-toolkit/install.mjs" --uninstall` in the repo, restart `claude` (time it the day before) |
| Asked to use their seat | `/logout` then `/login`; say plainly that hooks and agents may differ there |
| Five minutes stuck on environment | Ask for help, or switch to reading and planning aloud |

## 7 · Honest lines and the don't list

- **Don't know:** "I haven't done that in production. The closest is ___; here's how I'd find out."
- **AI to prepare?** "Yes: Claude, to organise and pressure-test my prep; the incidents and numbers are mine."
- **This setup:** "My house rules for unfamiliar repos: a guard, three agents, seven skills and a prompt log. Claude helped write it; a self-test proves the wiring."
- **Reviewer:** "An independent reviewer agent, fresh context, attacks the diff; I trust only findings it reproduced." Say "second model" only when `/model` differs from the reviewer's `opus` (the verifier *is* a different model: sonnet).
- **Don't:** critique before asking · trash the prototype (its builders are in the room: "help me understand why X was the right call") · propose rewrites for a tiny request rate · enforce permissions in a prompt · sell speed · show env, `.env`, tokens or prep docs on screen · paste their code into other tools.

## 8 · Predicted shapes (generic)

| # | Shape | Say | First failing test | First search |
|---|---|---|---|---|
| 1 | Permissions on a record-writing tool | "Authorization lives in code at the one place every write passes, keyed to who is really asking." | peer updates owner's record: deny, 0 writes, 1 audit line | `rg -n -i '(update\|upsert\|patch\|delete)\w*\('` |
| 2 | Queue, latency, feel | "People feel the p95, not the average; I split queue wait from work time and fix whichever dominates." | user A bursts 10, user B sends 1: B's wait is about 0 | `rg -n -i 'queue\|semaphore\|concurren\|timeout'` |
| 3 | CLI hardening | "The caller is a model, so the contract is the interface: data on stdout, typed errors, stable exit codes, a dry run." | bad flag: exit 2, JSON envelope on stderr; `--dry-run`: 0 writes | `rg -n 'argparse\|click\.\|yargs\|sys\.exit\|process\.exit'` |
| 4 | File prune or redact | "Every rewrite is redacted, deduped, reversible and idempotent." | `prune(prune(x)) == prune(x)`; a fake key is redacted | `rg -n -i 'prune\|redact\|\.jsonl'` |
| 5 | Activity monitor | "A broken connector produces silence, not errors; alert on missing activity per user." | usual user silent: ticket; weekend or new user: none | `rg -n -i 'last_?seen\|heartbeat\|cron'` |
| 6 | Golden-set evals | "Every incident becomes a case; grade the end state; pass^k says it will work, not that it can." | the reported failure as case 1, k=3 | `rg --files \| rg -i 'test\|eval\|fixture\|golden'` |
| 7 | Bug hunt in a connector | "A failing test that reproduces it first, so the fix is proven and can't come back." | fake API with 3 pages and one 429: every record, 1 write each | `rg -n 'except Exception\|\|\| true\|next_?page\|retry\|429'` |
| 8 | Logging and trace ids | "When someone says the agent was wrong on Tuesday, I want the answer in five minutes." | one JSON line, required keys, trace id propagated | `rg -n -i 'logger\|console\.(log\|error)\|subprocess\|spawn'` |

Access matrix for shape 1: owner allow · peer deny · manager of owner's team allow · other manager deny · no identity deny · unknown action deny · mixed bulk per record, reported. Audit line: `{ts, trace_id, actor, on_behalf_of, action, target, decision, reason, outcome, latency_ms}`.

## 9 · Close (pick two or three)

- "Would you roll a change like this out behind a flag, to a few users first, or straight to everyone?"
- "When a CLI writes today, whose identity does it use: the user's own credential or a shared integration user?"
- "What did the review passes catch on the last PR you rejected?"
- "What would make a change like this easy for you to approve?"
- "Anything about how I worked today you'd want done differently on the team?"

## 10 · Before the day

**T-1:** in a terminal, any folder: `claude update`, `node "$HOME/claude-toolkit/setup/lib/selftest.mjs" --quick` with no FAIL, then the same self-test with `--live` instead of `--quick` once, and in each repo you will use (the rehearsal copy included) `node "$HOME/claude-toolkit/install.mjs" --set live` · one full timed rehearsal on a copy of `practice/live-cli` (clone, branch, then at the Claude Code prompt `/recon [update deals]`, `/scope [the change]`, build, `/check`, `/team review main`, `/pr-brief [main]`), including one team so you have seen the agent list and the shutdown before the day, then a 15-minute `/recon` drill on a small public repo in a different language · decide permission mode (acceptEdits vs auto) and the reviewer line (`/model` vs `opus`) · usage headroom checked; model training off for the account · the recruiter's answers on format, tooling, account, repo · one-window screen share tested · backup network.
**T-30:** reboot; Do Not Disturb; only the editor and the meeting app open; `node "$HOME/claude-toolkit/setup/lib/selftest.mjs" --quick` in an unshared terminal (never `--live` on the day); `gh auth status`; a fresh terminal in `~/dev`; clipboard cleared; no `.env` or tokens anywhere on screen.
**After:** a thank-you note within 24 hours (what changed, how it was verified, the one follow-up); if asked, `git worktree remove` each worktree, then `node "$HOME/claude-toolkit/install.mjs" --uninstall` in the repo; delete the clone and its folder under `~/.claude/projects/` if the NDA requires it.

## 11 · Advice

- Spend the first ten minutes reading and asking. The room remembers the question that found the chokepoint longer than any code.
- Narrate decisions, not output: accept or reject each proposal aloud with a reason ("no new dependency; use the existing helper").
- Parallel is the point, and your attention is the limit. In one window: tests, your fix, a background check. Across windows: one per independent issue, each at the same gates, and no more windows than PRs you can review.
- Every claim gets its command. "Tests pass" means an exit code they saw.
- When time slips, cut scope, not verification. A verified half with a written "not verified" list beats an unverified whole.
- Leave with a measurement line and a follow-up list: that is what ownership looks like in 60 minutes.
