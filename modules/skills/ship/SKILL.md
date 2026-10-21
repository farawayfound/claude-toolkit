---
name: ship
description: "Use when a take-home or challenge repo is about to be handed over: the pre-submission gate (tracked files, junk and secrets, history noise, README caps and placeholders, the decision ledger, a fresh-clone run of the README commands), the smallest fixes, and the submission note. Pushes nothing."
disable-model-invocation: true
argument-hint: "[--zip path] [--no-run] [--cmd \"<command>\"]"
---

# Ship: $ARGUMENTS

What the reviewer opens is the product. Run the gate, fix what fails, then write the note.

1. **Gate.** From the repo root: `node ${CLAUDE_SKILL_DIR}/scripts/ship-check.mjs $ARGUMENTS`. Show the table verbatim. It modifies nothing; the fresh clone runs the README's own commands in the OS temp dir, and only runner-shaped ones (python, node, pytest, npm test, go test, make test and the like). Installs, pipelines, scripts and servers are listed, not run; `--cmd "<command>"` runs one on request.
2. **FAIL rows**, smallest fix first, applied only after the user agrees:
   - `status`: commit or discard; nothing uncommitted ships.
   - `junk`, `envfile`: `git rm --cached <path>` and a `.gitignore` line; never `rm -rf`.
   - `secrets`: remove the value, rotate the credential, and say so in the README if a demo key was ever committed.
   - `readme` placeholders: the Decisions and AI use sections are the user's own words. Ask for them; never draft them.
   - `rubric`: delete reviewer-guess sections; what stays is a requirement-to-test table.
   - `run`: fix the README or the code, never the check.
3. **WARN rows**: `lockfile` stays only when the install step needs it; `history` noise means one squash (`git reset --soft <first commit>` then one commit, with the user's go-ahead) or a clean repo from `/takehome-init`; `readme` over the cap means `/tighten-docs`; `ledger` empty means adding the calls the user made as rows by `me`.
4. Re-run until no FAIL. Leave WARN rows the user has accepted, and list them in the note.
5. **Submission note**, at most 12 lines, printed and not sent:
```
What it does: <one sentence>
Run: <copied from README>      Test: <copied from README; the count and the real result line>
Decisions worth a look: <one the user made, with the alternative rejected>
Known limits: <one or two, with the reproducer>
Next steps: <two>
Time spent: <from the ledger or git log>
AI use: <the user's own sentence from the README>
```
6. `--zip <path>` only when asked: `git archive` from HEAD, so caches, ignored and untracked files never travel.

## Output
The table, the fixes applied (file and command), the accepted WARN rows, then the note.
