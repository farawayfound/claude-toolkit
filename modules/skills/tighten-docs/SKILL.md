---
name: tighten-docs
description: "Use before handing a repository to readers: README to a capped skeleton, detail into docs/, an AGENTS.md under 40 lines, rubric-guessing sections deleted, AI-writing patterns flagged; the Decisions and AI-use sections are left for the user."
argument-hint: "[readme cap in lines, default 80]"
---

# Tighten docs: $ARGUMENTS

Shorter and denser, never shorter and vaguer. The reader is a reviewer with ten minutes and a terminal.

1. **Inventory**: every tracked `.md` with its line count, what it is for, and which sections repeat another doc. Print it before changing anything.
2. **README** follows `${CLAUDE_SKILL_DIR}/readme-skeleton.md`, cap 80 lines unless the argument says otherwise: what it does (3 lines), run, test (the real count and result line), results or behaviour (a table when the brief ships inputs), design in five bullets, decisions, limits and next steps, AI use, time. Everything else moves into `docs/`: `design.md` (flow, statuses, data shapes), `decisions.md` (the ledger), `testing.md` (requirement to test table, edge families covered).
3. **Delete**: sections that anticipate reviewers ("implied expectations", "evaluation guesses", "what you will look for"), time logs longer than a table, adjectives that sell, duplicate quickstarts, badges, and any file that only repeats the README.
4. **AGENTS.md** from `${CLAUDE_SKILL_DIR}/agents-skeleton.md`, at most 40 lines: commands, layout, conventions, do and do not. When a CLAUDE.md exists too, one of them is a one-line pointer to the other.
5. **Voice**: run `${CLAUDE_SKILL_DIR}/ai-writing-patterns.md` over every doc; list each hit with its line and rewrite it as a plain statement. The Decisions and AI use sections get the placeholder `<write this yourself>` plus two prompts for the user; this skill never drafts them, and /ship refuses the placeholder.
6. **Check**: every command in the README runs from a fresh clone (/ship does this), every link resolves, and no doc names a file that does not exist.

## Output
```
| doc | lines before | after | moved to |
Deleted: <sections>; Patterns flagged: <n> (file:line ...); Left for the user: Decisions, AI use
```
