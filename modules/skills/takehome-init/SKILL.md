---
name: takehome-init
description: "Use when a take-home or coding challenge arrives: a clean repository from the brief (no starter-kit history), the ignore file, docs skeleton, AGENTS.md and decision ledger, the fence around the prompt and the time plan; hands off to /scope."
argument-hint: "<brief path or pasted brief> [--dir path]"
---

# Take-home init: $ARGUMENTS

A reviewer reads the first commit as carefully as the last. Start clean, from the brief, with nothing of yours in the tree.

1. **Read the brief** in full. Extract: deliverables, must-nots, allowed tools and libraries, the time limit, how to submit, what the reviewer will run. Ask with AskUserQuestion only what the brief leaves open and the user can answer (language, submission channel, whether installs are allowed, the time budget); record each answer with /decide.
2. **Repository**: a new directory named after the task (`--dir`, else next to the current one); `git init`; the provided materials under `provided/`, byte for byte; `.gitignore` from `${CLAUDE_SKILL_DIR}/gitignore.txt`; `docs/decisions.md` from the decide skill's `ledger.md`; `AGENTS.md` from the tighten-docs `agents-skeleton.md`, filled as far as the brief allows; `README.md` with the skeleton headings and nothing else. No personal starter kit, no copied helpers: anything brought in later is one named file with a ledger row saying where it came from.
3. **First commit** only when the user says so: `chore: add the brief and provided materials`. Every later commit is one slice with a subject that tells the story; no WIP, no scaffold, no removal commits.
4. **Fence**: in-the-prompt deliverables on one side, the temptations on the other (a UI, extra adapters, exports, a live model, a GUI). The second list is written down and not built; see the slip rule.
5. **Time plan** as a table, checkpoints at 10, 35, 60, 75, 90 and 100 percent of the budget: plan locked (/scope approved), thin slice green, /break run and its findings fixed, feature freeze, /tighten-docs and /ship, submitted. Slip rule: cut beyond-the-prompt items first, then scope, never verification; a beyond-the-prompt item is built only after /break reports HELD with time left, capped at about 100 lines, and logged as the user's call.
6. **Hand off**: `/scope <brief path>`. After approval: thin slice first, then /break, then the rest, then /deslop, /tighten-docs and /ship.

## Output
```
Repo: <path>; created: <files>
Fence: in the prompt: ... | beyond the prompt: ...
| checkpoint | by | cut first if slipping |
Open questions -> ledger rows: D1 ...
Next: /scope <brief>
```
