---
name: scope
description: "Use before any change beyond one file, and at the start of a take-home: verbatim requirements, options with one recommendation, questions only where readings differ, acceptance cases, a file plan with a diff budget, a fence around the prompt, ledger rows; then waits for approval."
argument-hint: "[task or brief path]"
---

# Scope: $ARGUMENTS

Plan in the conversation. The only file this skill writes is `docs/decisions.md`, and only after approval. If the code involved has not been read in this session, run /recon first.

## 1. Brief
- Quote every requirement verbatim with an id (`R1`, `R2`, ...), then the constraints (time, language, allowed tools, must-nots) and the deliverables, each as one line a reviewer could tick.
- Draw the fence: **in the prompt** (the deliverables and what they need) and **beyond the prompt** (whatever tempts: a UI, extra adapters, exports, a live model). Beyond-the-prompt items are listed, not planned; see step 7.
- Guesses about what reviewers will look for stay in the conversation. They never go into the repo.

## 2. Options
For each decision that changes the shape of the work (data model, status mapping, gate order, error strategy, storage, interface), give 2-3 options as `option | costs | buys | wrong when`, then one recommendation and the reason. Delegate a long comparison to the Plan agent in the background and keep only its table.

## 3. Questions
Ask with AskUserQuestion only where two readings lead to materially different work: at most 4 per round, the recommended answer first and marked. An answer is a ledger row by `me`; a default the user approves with the plan is `agent (accepted)`. Everything else is an assumption, stated under **Assumptions**.

## 4. Acceptance cases
`case | input | expected | proves`. The happy path, every test the brief names (verbatim), then the families from the break skill's `edge-matrix.md` that apply: denied, error, empty, missing identity, malformed, duplicate, gate order, leakage, rerun. Domain rules when relevant:
- *Who may change what*: owner, peer, manager of the owner's team, other manager, no identity, unknown action, mixed bulk. Every deny asserts zero downstream writes; one audit line per decision; the record's owner is read at write time.
- *Slowness*: measure first (20 runs or more; p50, p95, max; queue wait split from work time); no fix without before and after numbers from the same harness.
- *Bug*: `Expected / Actual`, then 2-3 ranked hypotheses, each with the cheapest check that tells them apart.

## 5. Files, budget, non-goals
`file | change | reason`, only files already read, at most 5, the pattern to copy cited as `like <file:line>`. Diff budget about 200 lines; above it, stacked parts and which ships first. Non-goals: refactors, renames, adjacent bugs, config and dependency changes, and the beyond-the-prompt list.

## 6. Measurement, risks, rollback, tracks
The test, log field or metric that proves it works, and how it behaves at 10x; top risks with mitigations; rollback by revert or flag, say which; parallel tracks: test-writer on the case table, a worktree per disjoint piece, verifier in the background.

## 7. Time plan (take-home only)
`checkpoint | by | cut first if slipping`: plan locked, thin slice green, /break run, feature freeze, docs and /ship, submitted. Slip rule: cut beyond-the-prompt items first, then scope, never verification. A beyond-the-prompt item is built only after /break reports HELD with time left, capped at about 100 lines, and recorded in the ledger as the user's call.

## 8. Ledger
After approval, append one row per decision to `docs/decisions.md` in the decide skill's format: answers as `me`, accepted recommendations as `agent (accepted)`, changed ones as `agent (changed)`, the rejected options in the alternatives column, so the README's decisions section can cite them.

## Output
```
**Goal**: <one sentence>   Done means: <observable result>
**Requirements**: R1 "<verbatim>" ...   **Constraints**: ...   **Deliverables**: ...
**Fence**: in the prompt: ... | beyond the prompt (listed, not planned): ...
**Options**: <decision>: | option | costs | buys | wrong when | -> recommended <x>: <why>
**Questions**: 1. <q> (recommended: <a>) ...   **Assumptions**: 1. ...
**Acceptance cases**: | case | input | expected | proves |
**Files**: | file | change | reason |   **Diff budget**: ~<n> lines; <single | stacked: part 1 ... >
**Non-goals**: ...   **Measurement**: ...; at 10x: ...   **Risks / rollback**: ...   **Parallel tracks**: ...
**Time plan**: | checkpoint | by | cut first |   (take-home only)
**Ledger rows (written after approval)**: D1 <decision> | by | alternatives | why ...
```
End with `Approve this plan, or tell me what to change.` No edits before approval; when the scope changes, re-issue only the changed sections.
