---
name: recon
description: "Use first in any repository you have not read, with or without a task: read-only reconnaissance by four parallel agents (baseline, map of entrypoints and side effects, conventions, risk hotspots), written to .claude/plan/recon.md so /scope and the builder teammates read it instead of re-reading the code; ends by asking for the issues, constraints and ground rules."
argument-hint: "[topic or issue, optional]"
---

# Recon: $ARGUMENTS

Read-only on the code: no edits, installs, commits or branch switches; never open .env or other secret files. The one file this skill writes is `.claude/plan/recon.md` (step 3).

## 1. Four agents in ONE message
Each brief is self-contained and asks for at most 20 lines with file:line evidence. Without subagents (no Agent tool, or a budget that forbids them), do the same four passes yourself in this order. With agent teams on, launch these WITHOUT a `name`, so they stay subagents.
1. **verifier** agent, background. Baseline at HEAD: resolve the install, format, lint, typecheck and test commands (each `confirmed-by-CI` or `unverified`), run every check once, report the table and any pre-existing failures verbatim.
2. **Explore** agent. Map: every entrypoint (route, CLI command, job, handler) to its side effect (API call, DB write, file write) as `entry file:line -> step -> side effect file:line`; the modules and what imports what; external dependencies and the services or credentials they need (names only, never values). With a topic, trace it first and name the single chokepoint where a check or fix belongs.
3. **Explore** agent. Conventions: the closest tests to mirror (framework, fixtures, mocks, layout), error and logging style, `git log --oneline -15` commit style, and any README, CONTRIBUTING, AGENTS.md or CI rule that binds a change.
4. **Explore** agent. Hotspots: paths that reach a side effect without passing the usual check (bulk, delete, raw passthrough, background jobs, scripts); fail-open defaults, swallowed exceptions, missing timeouts, unbounded loops, TODO and FIXME, code with no test; where identity, config and credentials are loaded (file and variable name only).

While they run, skim the top-level README yourself; do not wait idle. Re-check any surprising claim with one command before writing it down.

## 2. Condense
At most 40 lines, every claim with file:line, nothing the README already says. Facts a builder needs, not prose.

## 3. Write `.claude/plan/recon.md`
`mkdir -p .claude/plan`; if `git check-ignore -q .claude/plan` fails, append `.claude/plan/` to the file `git rev-parse --git-path info/exclude` names. First line: `# Recon <repo> @ <git rev-parse --short HEAD> <date>`. Re-running replaces the file. Teammates never see this conversation: the file is what they read.

## Output: the file, then the questions
```
**Stack & commands**: <languages, frameworks, package manager, how it runs>
  install `<cmd>`; test `<cmd>` (confirmed-by-CI|unverified); lint `<cmd>`; typecheck `<cmd>`; format `<cmd>`
**Baseline**: `<cmd>` exit <n>, <counts>; pre-existing failures: <verbatim | none | not verified: reason>
**Map**: <entry file:line> -> <step> -> <side effect file:line>   (one line per entrypoint; the topic first)
**Modules & dependencies**: <module: role, imported by>; external: <lib or service, used at file:line, needs <credential name>>
**Conventions**: tests like <file>; errors <style>; logs <style>; commits <style>; binding rules <file: rule>
**Hotspots**: <file:line, what and why it matters>   (bypasses, fail-open, no timeout, untested)
**Chokepoint** (topic given): <file:line>; bypasses: <file:line list | none found>
**Unknowns**: <services, data or identity sources needed before building>
```
Then, in the conversation, these three questions and the line after them; no AskUserQuestion, the answers travel with the next command:
1. Which issues or tasks are to be worked (paths such as `issues/*.md`, `#123`, or pasted text)? 2. Constraints (time, rates, must-nots, allowed dependencies)? 3. Ground rules (branching, commits, review, what done means)?
A filled `.claude/worksheet.md` already answers these (TASKS, ACCEPTANCE CRITERIA, CONSTRAINTS, GUARDRAILS): read it, ask only for what is blank, and name it in the `/scope` line.
`Next: /scope issues: <paths or text>; constraints: <...>; rules: <...>`   (map: `.claude/plan/recon.md`)
