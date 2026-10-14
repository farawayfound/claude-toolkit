---
name: decide
description: "Use whenever a decision is made during the work, by the user or by the agent: appends one attributed row to docs/decisions.md (what, who decided, alternatives, why) so the README can separate the user's own calls from the agent's defaults."
argument-hint: "<decision> [by: me | agent (accepted) | agent (changed)]"
---

# Decide: $ARGUMENTS

One row per decision, written when it happens. The ledger feeds the README's decisions section and the submission note; it is the evidence that the user, not the agent, made the calls.

1. If `docs/decisions.md` is missing, create it from `${CLAUDE_SKILL_DIR}/ledger.md`.
2. Fill the row:
   - `#`: the next `D<n>`.
   - `when`: local `HH:MM` (take-home) or the date (longer work).
   - `decision`: one line, plain statement, no adjectives.
   - `by`: `me`, `agent (accepted)` or `agent (changed)`. When neither the argument nor the conversation shows who decided, ask one question; never guess.
   - `alternatives`: the options rejected, comma separated; `none` when there were none.
   - `why`: one clause naming the constraint or evidence that settled it.
3. Append the row at the end of the table. Earlier rows are never edited; a reversal is a new row that names the row it supersedes.
4. Print the row.

Attribution: `me` means the user chose or answered a question; `agent (accepted)` means the agent recommended a default and the user approved the plan that carried it; `agent (changed)` means the agent proposed and the user changed it.
