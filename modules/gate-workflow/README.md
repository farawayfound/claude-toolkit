# gate-workflow

> Run the commands here in a terminal, inside your project's folder, unless a line says otherwise. `~/claude-toolkit` is where you cloned the toolkit; `[square brackets]` are yours to replace.

`/gate [base]`: eight review passes over the current change in parallel (checks, tests, scope, bypasses, security, reliability, concision, edges), then one independent agent per high or medium finding that tries to refute it. Verdict `SHIP`, `FIX FIRST` or `INCOMPLETE`. The `checks` pass is the verifier; `edges` is the breaker (inputs mutated, real entrypoints run); every other pass and every refuter is the reviewer with one lens.

Lands in `~/.claude/workflows/gate.js` (or `[path to your project]/.claude/workflows/`) and sets `enableWorkflows: true` when the key is absent. Budget: 8 agents plus one refuter per high or medium finding. Check the workflow parses after an edit: the self-test does (`A16`).
