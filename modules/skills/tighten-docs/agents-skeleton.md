# <name>

<One line: what this repository is.>

## Commands
- test: `<cmd>`
- lint: `<cmd>` (omit if none)
- run: `<cmd>`

## Layout
- `<dir>/`: <what lives there>
- `provided/`: given materials, never edited (omit if none)
- `docs/`: design, decisions, testing

## Conventions
- <error handling: what is raised, what exits non-zero, with which codes>
- <data on stdout, logs on stderr>
- <what is validated at the boundary, what is trusted inside>

## Do
- Add a failing test before a fix.
- Keep provided files unchanged.

## Do not
- Add dependencies.
- Write outside `out/`.
- Publish, push or call external services.
