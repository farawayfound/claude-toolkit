---
paths:
  - "**/*.sql"
  - "**/migrations/**"
  - "**/migrate/**"
  - "**/alembic/**"
  - "**/prisma/**"
  - "**/{db,dao,repository,repositories,queries}/**"
  - "**/*{repository,Repository,repositories,dao,Dao,queries,Queries}*.{py,ts,js,go}"
  - "**/{db,models,store}.{py,ts,js,go}"
  - "**/*{_db,-db,_store,-store,_repo,-repo,Repo,_model,_models}.{py,ts,js,go}"
---
# Database and migration safety

- Queries are parameterized; SQL is never built by string concatenation or interpolation.
- Every migration is reversible (up and down) and additive first: add, backfill, switch reads, then remove in a later release.
- DROP, TRUNCATE, and DELETE or UPDATE without WHERE appear only when explicitly requested.
- Postgres indexes on existing tables are created CONCURRENTLY (outside a transaction block).
- Backfills are batched, resumable and idempotent.
- Exploratory reads use LIMIT; a heavy query gets EXPLAIN first; inspection uses a read-only role.
- Multi-statement writes run in one transaction.
- Writes are upserts or carry an idempotency key, so a retry has one effect.
- The current state (e.g. the owner) is checked inside the same transaction as the write, via SELECT ... FOR UPDATE or a conditional UPDATE ... WHERE, to avoid time-of-check vs time-of-use races.
- Tests run against a local or container database (docker compose, or postgres:17), never shared or production data.
- Fixtures are synthetic; no PII in logs or tests.
