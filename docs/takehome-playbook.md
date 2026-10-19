# Playbook · the take-home

**Thesis:** the reviewer opens the repository, not the demo. They read the README first, the tests second, the history third, and run the two commands the README gives. The prompt is the product; everything beyond it is a cost until the prompt is done and hardened. Three things cost submissions most often: clutter and docs that are not the clearest, no visible line between the author's calls and generated text, and edge cases other submissions caught.

## 1 · The budget

Slash commands are typed at the Claude Code prompt in the project's folder; `[square brackets]` are yours to replace.

For a 90-minute brief; scale the percentages for a longer one.

| At | Checkpoint | Do | If it slips, cut first |
|---|---|---|---|
| 0 | Brief read | `/takehome-init [path to the brief file]`: clean repo, provided files untouched, ignore file, ledger, AGENTS.md skeleton, the fence | |
| 10% | Plan locked | `/scope [path to the brief file]`: requirements verbatim, options with tradeoffs, questions answered, cases, files, time plan; approve | beyond-the-prompt list |
| 35% | Thin slice green | test-writer writes RED for the brief's own tests first; the smallest path from input to the output file; `/check` | options that did not make the slice |
| 60% | Hardened | `/break`: breakers on the real entrypoints, the hidden-test list, the mutation score; fix every CONFIRMED finding with a test | extras, never verification |
| 75% | Feature freeze | nothing new; `/deslop` on the diff; ledger up to date | |
| 90% | Docs and gate | `/tighten-docs`; write Decisions and AI use yourself; `/ship` until no FAIL | |
| 100% | Submitted | the note from `/ship`; the repo link or `git archive` zip (never a zip of the folder itself: its `.git/dev-toolkit-logs/` holds your prompts and the guard's decisions) | |

Slip rule: cut beyond-the-prompt items first, then scope, never verification. A beyond-the-prompt item is built only after `/break` says HELD with time left, capped at about 100 lines, and logged with `/decide` as your call. A half-done extra is worse than none; a listed, unbuilt extra reads as judgment.

## 2 · First ten minutes

1. Read the brief twice. Quote every requirement; the plan carries them as `R1`, `R2`, ... and the tests cite them.
2. Answer the open questions the brief leaves (language, installs allowed, submission channel) with `/decide` rows by `me`.
3. `/scope`: when it offers options, choose; when it asks a question, answer or take the recommended default and say so. The ledger is being written now.
4. Draw the fence out loud: "In the prompt: workflow, output file, two tests, README. Beyond: a GUI, a live model, export." Then do not look at the second list until 60%.

## 3 · Building

- RED first, always: the two tests the brief names, verbatim, before any implementation. If a test already passes, the gap is elsewhere.
- One slice end to end before any breadth: input file to output file with the happy path only, then the gates, then the error paths.
- Commits tell the story: one per slice, imperative subject, no WIP, no "scaffold", no "remove old code". Nothing of yours is in the first commit except the brief and the provided files.
- No starter kit, no copied helpers, no framework the brief did not ask for. When you bring one file in, it gets a ledger row naming where it came from.
- Every decision as it happens: `/decide "a failed client call marks the row failed and the batch continues" by: me`. Agent defaults you accept are `agent (accepted)`; the ones you overrule are `agent (changed)`. These rows are the proof later.

## 4 · Hardening (the step the last submission skipped)

`/break` does three things: breakers mutate the inputs and run the real entrypoints (wrong shape, blank values, case, duplicates, a malformed record that is also controlled, a `Mock()` adapter, reruns, a missing output directory); the hidden-test list checks what a reviewer's own test would assert (the adapter's call list after a full run, each provided record's status, the output shape, exit codes); the mutation script grades the suite (a survivor is a test the suite lacks). Every CONFIRMED finding becomes a failing test, then a fix. What you defer goes into the README's limits with its reproducer.

## 5 · Docs that read as yours

- README at most 80 lines, in the skeleton order: what, run, test (with the real count), results table, five design bullets, decisions, limits and next steps, AI use, time. Detail goes to `docs/design.md` and `docs/testing.md`; the ledger is `docs/decisions.md`.
- Two sections you write by hand, in plain first person: **Decisions** (three to five calls, each with the alternative you rejected and why, drawn from the ledger) and **AI use** (what the tool wrote, what you verified, what you changed; `.git/dev-toolkit-logs/trail.jsonl` holds every prompt you typed, redacted, and `teams.jsonl` every task a teammate completed). `/tighten-docs` leaves placeholders; `/ship` refuses them.
- Never commit guesses about the rubric. "Implied expectations", "evaluation guesses" and "what a reviewer will look for" read as gaming the review and as machine text. A requirement-to-test table says the same thing honestly.
- No lockfile in a stdlib-only project, no four launcher scripts, no generated output except the one example the brief asks for, no badges, no emoji.

## 6 · Shipping

`/ship` prints the inventory and the rows: dirty tree, junk, env files, lockfiles, big files, scaffold paths, history noise, secrets, README placeholders and length, rubric sections, the ledger, AGENTS.md, and a fresh-clone run of the README's own commands. Fix FAIL rows, accept or fix WARN rows, run again. The note it drafts is the submission email: what, run and test, one decision, one limit, next steps, time, your AI-use sentence. A zip, when required, comes from `git archive`, so caches never travel.

## 7 · After

Within a day: a short note to the recruiter if the channel allows it. Keep the repo as is; do not push fixes after submission. When feedback arrives, add the misses to a fixture under `practice/` (or your own notes), and run the rehearsal again before the next one.
