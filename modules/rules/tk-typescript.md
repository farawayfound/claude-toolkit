---
paths:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
  - "**/package.json"
  - "**/tsconfig*.json"
---
# TypeScript and JavaScript guidance

- Use the package manager the lockfile implies (CLAUDE.local.md names it); never edit the lockfile by hand; new dependencies wait for the user's go-ahead.
- The module system follows package.json `type` (ESM or CommonJS); exports follow the repo's existing named or default style.
- No `any` and no non-null `!` to silence the compiler; narrow the type instead.
- External input (request bodies, env, files, tool arguments) is validated at the boundary with the repo's validator (e.g. zod) if one exists.
- Every promise is awaited or returned; no floating promises.
- `fetch` calls pass `signal: AbortSignal.timeout(ms)`.
- Errors are typed (an Error subclass or tagged union) and carry a stable `code`.
- Tests use `it.each` / `test.each` for case tables, fake timers for time, and no real network.
- Local binaries run via `npx --no-install <bin>`, never ad-hoc downloads.
- `tsc --noEmit` stays clean.
