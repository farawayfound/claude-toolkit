---
name: scope
description: "Use after /recon, with the issues, constraints and ground rules: one Explore agent per issue, overlaps mapped, issues ranked by fix velocity, ONE self-contained plan file per issue in .claude/plan/ for the builder teammates, and an index with the launch order; questions only where readings differ; decisions recorded in the plan; waits for approval. A take-home brief is one issue with a fence and a time plan."
argument-hint: "issues: <paths | #N | text>; constraints: <...>; rules: <...>   |   <brief path> (take-home)"
---

# Scope: $ARGUMENTS

Plan in files a builder can read without this conversation. Writes only under `.claude/plan/` (and `docs/decisions.md` when it exists). If `.claude/plan/recon.md` is missing or older than HEAD, run /recon first, then come back.

## 1. Read
`.claude/plan/recon.md` in full; every issue the argument names (`gh issue view <N>`, the files, or the pasted text); the constraints and rules verbatim. A take-home brief is one issue: quote every requirement with an id (`R1`, `R2`, ...).

## 2. One Explore agent per issue, in ONE message (no `name`: subagents)
Each returns at most 15 lines: the cause or gap in one sentence; the files and functions a fix touches, `file:line` pulled with rg or sed, never retyped; the closest test to mirror; the first failing test in one sentence; size S (one function), M (one module), L (several modules or a rewrite). Open one cited line per agent before trusting the rest.

## 3. Rank and relate
For every pair: **disjoint**, **needs <M>** (branch from M once it has committed), **same lines as <M>** (one owner, or in sequence), or **plan-only** (L, needs credentials, or asks for a rewrite). Rank by fix velocity: the smallest verified fix with the largest effect first, stacks last; plan-only never gets a builder.

## 4. Options and questions
For each decision that changes the shape of a fix (data model, status mapping, gate order, error strategy, interface), 2-3 options as `option | costs | buys | wrong when` and one recommendation. Ask with AskUserQuestion only where two readings lead to materially different work: at most 4 per round, the recommended answer first and marked. Everything else is an assumption, listed as one. Every answer and every accepted default becomes a row in the plan's Decisions table: `me`, `agent (accepted)` or `agent (changed)`, with the alternatives and the why.

## 5. Acceptance cases
Per issue, `case | input | expected | proves`: the happy path, every test the issue or brief names verbatim, then the families that apply: denied, error, empty, missing identity, malformed, duplicate, gate order, leakage, rerun. Who may change what: owner, peer, manager, no identity, unknown action, mixed bulk; every deny asserts zero downstream writes. Slowness: measure first (p50, p95, max; queue wait split from work time). Bug: `Expected / Actual`, then ranked hypotheses, each with the cheapest check that disproves it.

## 6. Write the plans
`mkdir -p .claude/plan` (excluded from git as /recon does it). One file per issue from `${CLAUDE_SKILL_DIR}/plan-template.md`, named `.claude/plan/<rank>-<N>-<slug>.md` (`01-12-authz.md`), every field filled. Files: at most 5, only files an agent cited, the pattern to copy as `like <file:line>`; two plans never own the same file (an overlap means one owner and a `needs` line in the other). Diff budget about 200 lines per plan; above it, two plans with a `needs` line. Take-home: one plan, plus **Fence** (in the prompt | beyond the prompt, listed and not planned) and **Time plan** (`checkpoint | by | cut first if slipping`: plan locked, thin slice green, /break run, feature freeze, docs and /ship, submitted; slip rule: cut beyond-the-prompt items first, then scope, never verification).
Then `.claude/plan/index.md`: first line `# Plans <repo> @ <hash>`, the constraints and rules verbatim, the ranking table from the output below, the launch order, and `Next: /team build`.

## 7. Ledger (when `docs/decisions.md` exists, every take-home)
After approval, append the Decisions rows there as well, in its format. There is no separate command: the plan and the ledger are written as the decisions happen.

## Output
```
Recon: .claude/plan/recon.md @ <hash>
| rank | issue | files | size | relation | branch | plan |
| 1 | #12 <one line> | a.py, tests/test_a.py | S | disjoint | fix/12-authz | .claude/plan/01-12-authz.md |
Questions: 1. <q> (recommended: <a>) ...   Assumptions: 1. ...
Decisions: D1 <decision> | by | alternatives | why ...
Plan-only: <issue>: <why, and the measurement that would justify more>
Index: .claude/plan/index.md
```
End with `Approve these plans, or tell me what to change. Then /team build (one builder per plan in its own worktree and branch, plus qa), or "build plan 01 here".` No code edits before approval; when a plan changes, rewrite only that file.
