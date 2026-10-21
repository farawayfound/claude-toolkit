# worksheet

> Run the commands here in a terminal, inside your project's folder, unless a line says otherwise. `"$HOME/claude-toolkit"` is where you cloned the toolkit; `[square brackets]` are yours to replace.

One file, `worksheet.md`, placed at `.claude/worksheet.md`: a sheet for you to fill in by hand while the brief is read out. Five sections, pre-formatted so you only type after the colons and copy a line to add another: **OVERVIEW**, **TASKS** (numbered primary tasks, sub-tasks as indented checkboxes), **ACCEPTANCE CRITERIA** (one line per task, keyed `Task 1:`), **CONSTRAINTS** (what the brief imposes: stack, time, dependencies, performance, data) and **GUARDRAILS** (what must never be done or must be asked first). It is plain text in a `.md` file, so it reads the same in an editor and rendered.

- Into a checkout: `node "$HOME/claude-toolkit/dropin.mjs" add worksheet --repo .`. Every set the installer places includes it; `safety` and `--user` do not (it belongs to one project).
- It is yours. It is placed once; a re-run or `--update` never rewrites a worksheet you have edited and does not warn about it. `--uninstall` removes it only while it is still the blank sheet; one you filled in is kept, with a warning. `--force` puts the blank sheet back.
- Like every placed file it is listed in `.git/info/exclude`, so it never shows in `git status` and nothing is committed.
- `/recon` reads it when it has filled lines: they answer its three closing questions (issues, constraints, ground rules), and `/scope` can be pointed at the file.
