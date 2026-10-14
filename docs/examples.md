# Examples · sample prompts

Each example is a situation and what to type. `[square brackets]` are yours to replace, and the text inside them shows the kind of value that fits; do not type the brackets. Everything else is copy-paste as written.

Every block says where to run it. **Claude Code** means the prompt of a running `claude` session (start one with `claude` from your project's folder). **Terminal** is Git Bash on Windows or any shell elsewhere. Skills take their arguments after the slash command; agents are named in plain prose. A brief for any agent follows one shape: goal, context, constraints, done when, return format.

## Take-home

**The brief just arrived (a PDF, an email or a repo).** Run in: Claude Code, started in an empty folder or your projects folder.
```
/takehome-init [path to the brief file, for example ~/Downloads/brief.md] --dir [new project folder, for example ~/dev/importer]
```
Answer its questions (language, installs allowed, how to submit); each answer lands in `docs/decisions.md` as yours.

**Plan against the brief, with options.** Run in: Claude Code.
```
/scope [path to the brief file, for example BRIEF.md]. Time budget [90 minutes]. Constraints: [stdlib only, fixtures only, the provided fake client unchanged]. Done means: [the two named tests pass, report.json has one row per input record, README has run and test commands].
```
When it offers options (for example "status for a client exception: failed | retry_later | abort the batch"), pick one and say why in a line; it becomes a ledger row by `me`.

**Record a call you made mid-build.** Run in: Claude Code.
```
/decide "[Validation runs before any client call; a rejected row never reaches the client]" by: me. Alternatives: [validate lazily at call time]. Why: [a bad row must not cost a call or leak through a later step].
```

**Record an agent default you accepted.** Run in: Claude Code.
```
/decide "[report.json is an object {source, counts, rows[]}, not a bare list]" by: agent (accepted)
```

**Harden after the thin slice is green.** Run in: Claude Code.
```
/break [the importer]. Entrypoint: [python -m app run --input provided/records.json --out a temp folder]. The client is [the provided fake]; also try a plain Mock(). Hidden tests: [client.calls after a full run; each record's status; no call at all for a rejected record].
```

**Grade the suite alone.** Run in: Terminal, in your project's folder.
```bash
node ~/claude-toolkit/modules/skills/break/scripts/mutate.mjs --test "[your test command, for example uv run --frozen pytest -q]" --max 15 [path of a file to mutate] [path of another file]
```
Then, in Claude Code: `Write a failing test for each survivor, then make it pass.`

**Trim the change before docs.** Run in: Claude Code.
```
/deslop [base branch, for example main]
```
It prints lines before and after per file and the bulk inside versus beyond the prompt; it never touches a beyond-the-prompt file without asking.

**Docs, then your own words.** Run in: Claude Code.
```
/tighten-docs 80
```
Then write the Decisions and AI use sections yourself. Prompts it leaves: "Name three calls you made against the agent's suggestion and why." and "What did the tool write, what did you verify by hand, what did you change?"

**The gate before sending.** Run in: Claude Code.
```
/ship
```
Fix FAIL rows, re-run. To run commands the README lists but the gate skips (installs, servers), name them: `/ship --cmd "[command to run in a fresh clone]"`. For a zip: `/ship --zip [path of the zip to write, for example ../submission.zip]`.

## Live session

These use a small deals CLI as the project; in your own repo replace the bracketed parts. Run in: Claude Code, in the project's folder.

**Minute 3, after the ground rules.**
```
/recon [update deals]
```

**Minute 10.**
```
/scope [enforce owner-or-manager authorization on deals update and close]. Constraints: smallest diff, existing helpers, no new deps, fixtures only. Done means: [deny cases assert zero writes and one audit line; both write paths go through one authorize() call]. Tracks: test-writer on the case table.
```

**After approval.**
```
Approved. test-writer: the case table from the plan, RED first, mirror [tests/test_cli.py]. I will direct the fix; do not edit [deals/cli.py] until RED is shown.
```

**Directing the fix.**
```
Fix at [deals/cli.py cmd_update and cmd_close] only: [read the actor from DEALS_ACTOR, call authorize(actor, action, deal) before the write, return exit 4 with a JSON error on deny]. No new module.
```

**Verification and review.** Type one line at a time.
```
/check
/break [deals update]
/gate [main]
Fix the CONFIRMED findings only; list PLAUSIBLE ones as PR follow-ups. Re-run the verifier.
/pr-brief [main]
```

**When it is wrong on screen.**
```
That's wrong: [the test passes because the stub returns {} and never reaches authorize()]. Change only [the stub so it returns the fixture deal]; keep the assertion. Show RED again.
```

**A probe the room asks for.**
```
Use the reviewer agent on one lens: [is there any other path to DealStore.update that skips authorize()?] Read-only; file:line; confirmed or refuted.
```

## Everyday work

Run in: Claude Code, in the project's folder.

**A bug report.**
```
/repro-fix [list returns 5 of 7 deals: pagination stops at the first page]
```

**Something is slow.**
```
/perf-baseline [20 concurrent users each sending one request; p95 and queue wait split from work time]
```

**A permissions change.**
```
/access-control [bulk update of deals by a manager]
```

**A colleague's branch.**
```
Use the reviewer agent on the diff between [main] and [feature/export]: correctness, bypasses, tests, security, concision. At most 8 findings, CONFIRMED needs a reproducer, verdict SHIP or FIX FIRST.
```

**An inherited repo with no agent docs.** Type one line at a time.
```
/tighten-docs 80
Write AGENTS.md from the skeleton: commands from CI, layout from the tree, conventions from the three most-edited files.
```

**A long test suite while you keep working.**
```
Run the verifier agent in the background on the whole suite; tell me the PASS/FAIL table when it finishes. I will continue on [the export command] meanwhile.
```

**Writing up a week of work.**
```
From docs/decisions.md and git log since [Monday], draft the PR body with /pr-brief [main]; the Decisions paragraph comes from rows marked me.
```

## The kit itself

`~/claude-toolkit` is where you cloned it ([Quickstart](../Quickstart.md), step 1).

**Install a set for every repo on this machine.** Run in: Terminal, any folder. Sets are `takehome`, `live`, `safety` and `all`.
```bash
node ~/claude-toolkit/dropin.mjs add takehome --user
```

**Install one or two parts for every repo.** Run in: Terminal, any folder.
```bash
node ~/claude-toolkit/dropin.mjs add [part] [another part] --user
```

**One project only, nothing in `~/.claude`.** Run in: Terminal, in your project's folder.
```bash
node ~/claude-toolkit/dropin.mjs add [part] [another part] --repo .
```

**Prove the wiring.** Run in: Terminal, any folder.
```bash
node ~/claude-toolkit/setup/lib/selftest.mjs --quick
```

**Run the unit tests of the two scripts.** Run in: Terminal, in the `~/claude-toolkit` folder.
```bash
cd ~/claude-toolkit
node --test "setup/tests/*.test.mjs"
```

**Take it all out of `~/.claude`.** Run in: Terminal, any folder.
```bash
node ~/claude-toolkit/dropin.mjs remove all --user
```

**Dry-run anything first.** Add ` --dry-run` to the end of any `add` or `remove` command; it prints the plan and writes nothing.
