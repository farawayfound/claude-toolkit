# Examples · sample prompts

Each example is a situation and the prompt to type. Skills take arguments after the slash; agents are named in plain prose. A brief for any agent follows one shape: goal, context, constraints, done when, return format.

## Take-home

**The brief just arrived (a PDF, an email or a repo).**
```
/takehome-init ~/Downloads/brief.md --dir ~/dev/importer
```
Answer its questions (language, installs allowed, how to submit); each answer lands in `docs/decisions.md` as yours.

**Plan against the brief, with options.**
```
/scope BRIEF.md. Time budget 90 minutes. Constraints: stdlib only, fixtures only, the provided fake client unchanged. Done means: the two named tests pass, report.json has one row per input record, README has run and test commands.
```
When it offers options (for example "status for a client exception: failed | retry_later | abort the batch"), pick one and say why in a line; it becomes a ledger row by `me`.

**Record a call you made mid-build.**
```
/decide "Validation runs before any client call; a rejected row never reaches the client" by: me. Alternatives: validate lazily at call time. Why: a bad row must not cost a call or leak through a later step.
```

**Record an agent default you accepted.**
```
/decide "report.json is an object {source, counts, rows[]}, not a bare list" by: agent (accepted)
```

**Harden after the thin slice is green.**
```
/break the importer. Entrypoint: python -m app run --input provided/records.json --out <tmp>. The client is the provided fake; also try a plain Mock(). Hidden tests: client.calls after a full run; each record's status; no call at all for a rejected record.
```

**Grade the suite alone.**
```
node ~/.claude/skills/break/scripts/mutate.mjs --test "uv run --frozen pytest -q" --max 15 app/gate.py app/validate.py
```
Then: `Write a failing test for each survivor, then make it pass.`

**Trim the change before docs.**
```
/deslop main
```
It prints lines before and after per file and the bulk inside versus beyond the prompt; it never touches a beyond-the-prompt file without asking.

**Docs, then your own words.**
```
/tighten-docs 80
```
Then write the Decisions and AI use sections yourself. Prompts it leaves: "Name three calls you made against the agent's suggestion and why." and "What did the tool write, what did you verify by hand, what did you change?"

**The gate before sending.**
```
/ship
```
Fix FAIL rows, re-run. With a server command in the README: `/ship --cmd "python -m pytest -q" --cmd "python -m app run"`. For a zip: `/ship --zip ../submission.zip`.

## Live session

**Minute 3, after the ground rules.**
```
/recon update deals
```

**Minute 10.**
```
/scope enforce owner-or-manager authorization on deals update and close. Constraints: smallest diff, existing helpers, no new deps, fixtures only. Done means: deny cases assert zero writes and one audit line; both write paths go through one authorize() call. Tracks: test-writer on the case table.
```

**After approval.**
```
Approved. test-writer: the case table from the plan, RED first, mirror tests/test_cli.py. I will direct the fix; do not edit deals/cli.py until RED is shown.
```

**Directing the fix.**
```
Fix at deals/cli.py cmd_update and cmd_close only: read the actor from DEALS_ACTOR, call authorize(actor, action, deal) before the write, return exit 4 with a JSON error on deny. No new module.
```

**Verification and review.**
```
/check
/break deals update
/gate main
Fix the CONFIRMED findings only; list PLAUSIBLE ones as PR follow-ups. Re-run the verifier.
/pr-brief main
```

**When it is wrong on screen.**
```
That's wrong: the test passes because the stub returns {} and never reaches authorize(). Change only the stub so it returns the fixture deal; keep the assertion. Show RED again.
```

**A probe the room asks for.**
```
Use the reviewer agent on one lens: is there any other path to DealStore.update that skips authorize()? Read-only; file:line; confirmed or refuted.
```

## Everyday work

**A bug report.**
```
/repro-fix list returns 5 of 7 deals: pagination stops at the first page
```

**Something is slow.**
```
/perf-baseline 20 concurrent users each sending one request; p95 and queue wait split from work time
```

**A permissions change.**
```
/access-control bulk update of deals by a manager
```

**A colleague's branch.**
```
Use the reviewer agent on the diff between main and feature/export: correctness, bypasses, tests, security, concision. At most 8 findings, CONFIRMED needs a reproducer, verdict SHIP or FIX FIRST.
```

**An inherited repo with no agent docs.**
```
/tighten-docs 80
```
Then: `Write AGENTS.md from the skeleton: commands from CI, layout from the tree, conventions from the three most-edited files.`

**A long test suite while you keep working.**
```
Run the verifier agent in the background on the whole suite; tell me the PASS/FAIL table when it finishes. I will continue on the export command meanwhile.
```

**Writing up a week of work.**
```
From docs/decisions.md and git log since Monday, draft the PR body with /pr-brief main; the Decisions paragraph comes from rows marked me.
```

## The kit itself

**Install a set, or one part, for every repo.**
```bash
node dropin.mjs add takehome --user          # or live, safety, all
node dropin.mjs add break breaker --user     # two parts and their needs
```

**One checkout only, nothing in ~/.claude.**
```bash
node ~/.claude/dev-toolkit/dropin.mjs add check reviewer --repo .
```

**Prove the wiring, then take it all out.**
```bash
node setup/lib/selftest.mjs --quick
node --test "setup/tests/*.test.mjs"
node dropin.mjs remove all --user
```

**Dry-run anything first.** Add `--dry-run` to any `add` or `remove`; it prints the plan and writes nothing.
