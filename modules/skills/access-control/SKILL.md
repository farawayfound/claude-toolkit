---
name: access-control
description: "Use when a change touches who may read or change which records (ownership, hierarchy, roles, scopes): the single chokepoint and every bypass, identity from the authenticated context, a deny-by-default test matrix, one audit line per decision."
argument-hint: "[resource or action]"
---

# Access control: $ARGUMENTS

Harden authorization for: $ARGUMENTS

## Principles
- Enforce in code at the narrowest chokepoint every write passes through; never in prompts, UI or docs.
- Identity comes from the authenticated context (session, verified token claims, per-user credentials), never from caller- or model-supplied arguments.
- Default deny, deciding on the record's current owner or team, fetched from the source of truth at decision time.

## Steps
1. **Map write paths.** Run `rg -n "(update|upsert|patch|delete|insert|create)\w*\("` plus an `rg -n` for the imports of each downstream client (SDK, HTTP client, ORM). Name the chokepoint as `file:line`. List every bypass that reaches the same side effect: bulk operations, delete paths, raw API passthrough, background jobs, admin scripts.
2. **Identity source.** Trace where the acting user comes from, request to chokepoint. Flag shared service identities (one credential acting for everyone) and arguments a caller or model fills in (`user_id`, `owner`, `as_user`, `on_behalf_of`).
3. **Hierarchy.** Find where team and manager relations come from (directory, synced table, config). Ask the user: "Does a manager act on direct reports only, or on the whole subtree?" State the default used until answered.
4. **Tests first.** Write the matrix as tests (or delegate to the test-writer agent if installed) and show them RED before implementing:

   | actor | relation | action | expected | downstream calls |
   |---|---|---|---|---|
   | user | owns the record | update | allow | 1 |
   | user | peer, same team | update | deny | 0 |
   | manager | manages the owner's team | update | allow | 1 |
   | manager | manages another team | update | deny | 0 |
   | none | missing identity | update | deny | 0 |
   | user | owns the record | unknown action | deny | 0 |
   | user | bulk: some owned, some not | bulk update | per-record decisions reported, no silent partial write | allowed records only |
   | user | owns the record | delete | allow | 1 |
   | user | peer, same team | delete | deny | 0 |

   Assert zero downstream calls on every deny and exactly one audit line per decision.
5. **Decision function.** One pure function `authorize(actor, action, resource) -> {allow, reason}` with no I/O inside. Fetch relations and the record's current owner outside it, cached per request, and call it at the chokepoint before the side effect.
6. **Deny response.** Return forbidden (HTTP 403, or exit code 4 for a CLI) with an actionable reason that says who can act, e.g. `forbidden: owned by team T; its owner or T's manager can update it`.
7. **Audit.** One structured line per decision: `{ts, correlation_id, actor, on_behalf_of, action, target, decision, reason, policy_version}`. Ids only: no names, emails or record contents.
8. **Rollout.** An `enforce|shadow` mode flag: shadow logs the decision and allows, enforce denies. Tests run in enforce; propose shadow first for risky paths.
9. **Review.** Run the reviewer agent focused on bypasses (every other route to the same side effect), then /check; without those parts, do both passes yourself and say so.

## PR notes
List assumptions (hierarchy depth, identity source), paths not covered, and follow-ups: per-user credentials instead of shared service accounts; an approval tier for bulk or irreversible writes.

## Output
Chokepoint `file:line`; bypasses (covered | not covered); identity source; the matrix with RED then GREEN results; the /check table; open questions.
