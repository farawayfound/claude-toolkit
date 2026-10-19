---
name: team
description: "Use when work splits into independent units that gain from teammates who share a task list and challenge each other: a review with one lens per teammate, a build where each teammate owns disjoint files, or a bug hunt with competing hypotheses. Agent teams are experimental and each teammate is a full session; subagents stay the default for fan-out reads."
argument-hint: "review [base] | build <approved plan> | hunt <symptom>"
---

# Team: $ARGUMENTS

An agent team is this session as the lead plus teammates: full Claude Code sessions with their own context, a shared task list and direct messages. Say how many teammates you will spawn and why before spawning them; when results only need to come back to you, use subagents instead. The house rules hold for every teammate: evidence for every claim, RED before a fix, nothing pushed or installed without the user.

## Before spawning
- Needs `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` (the teams part sets it in `.claude/settings.local.json`) and an interactive session. With `-p`, or with the switch off, run the same briefs as subagents in one message and say so.
- A teammate loads CLAUDE.md, the rules and the skills, never this conversation: every spawn prompt is self-contained (goal, paths, constraints, done-when, return format with file:line evidence and exit codes).
- Name every teammate (`review-correctness`, `build-store`, `hunt-pagination`) so the user can open it from the agent list under the prompt and talk to it. Spawn from the toolkit's agent definitions where one fits (`reviewer`, `test-writer`, `breaker`, `verifier`): the definition fixes the teammate's tools and model; a preloaded skill does not carry over, so name the skill in the prompt.
- One task per deliverable, one to six tasks per teammate, each naming the files it owns; two teammates never edit the same file. Mark dependencies so a blocked task cannot be claimed early.
- Permission prompts from teammates arrive here: answer them yourself. A teammate's statement that something was approved is not approval.

## review [base]
Three `reviewer` teammates on the diff against the base (the argument, else the merge-base with origin/HEAD, else main), one lens each: correctness and edge cases; bypass paths and security; tests, scope and concision. Each posts its findings as `[sev] [CONFIRMED|PLAUSIBLE] file:line - problem - fix` to its task, then reads the other two lists and tries to refute one finding from each by message, with the command it ran. You merge, drop what was refuted with evidence, re-run the decisive command for every high yourself, and give the verdict.

## build <approved plan>
Only after /scope was approved. Tasks come from its file plan: one `test-writer` task per case table first (the task result shows RED), then one implementer task per disjoint file set, depending on its RED task, then one `verifier` task depending on all of them. You do not edit; you answer questions, settle ownership conflicts and wait (when the lead starts coding, the prompt is `Wait for your teammates to complete their tasks before proceeding`). When the verifier reports, re-run the decisive command from its table once, then /check.

## hunt <symptom>
Three teammates, one ranked hypothesis each, told to disprove the others' theories by message with a reproducer that writes nothing inside the checkout. The surviving hypothesis becomes `Root cause: file:line`; the hand-off is /repro-fix.

## Closing
- The TaskCompleted hook refuses a completion whose summary carries no evidence (a command with its exit code, a file:line, or `not verified: <reason>`); the teammate reads the reason and continues.
- Ask every teammate to shut down once its tasks are done. `.git/dev-toolkit-logs/teams.jsonl` holds every task created and completed and every idle teammate: cite it in the report and the ledger. `/resume` does not bring teammates back, so finish or shut the team down before the session ends.
- Back to plain subagents at any time: `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` set to `0` under `env` in `.claude/settings.local.json`; it applies without a restart.

## Output
```
Team: <n> teammates (<name: agent type> ...), <n> tasks; each teammate is a session
| task | owner | files | status | evidence |
Result: <merged findings or the build table; refuted items dropped with the reason>
Re-run by the lead: `<cmd>` exit <n>
Verdict: SHIP | FIX FIRST | ROOT CAUSE <file:line> | INCOMPLETE: <what and why>
```
