---
paths:
  - "**/*.py"
  - "**/pyproject.toml"
  - "**/requirements*.txt"
---
# Python guidance

- Tools run through the repo's runner (`uv run`, `poetry run` or the `.venv` interpreter), as listed in CLAUDE.local.md.
- `pip install` and creating a virtual environment wait for the user's go-ahead.
- Code targets the `requires-python` version; new public functions carry type hints.
- mypy or pyright run only when the repo configures them.
- No bare `except:`. Re-raise with `raise NewError(...) from e`; an error never returns an empty success value.
- `subprocess` calls use list args, never `shell=True`, and always pass `timeout=`.
- `requests` and `httpx` calls always pass `timeout=`.
- Paths use `pathlib`; files open with `encoding="utf-8"`.
- Library code logs through `logging`, not `print`.
- pytest: `@pytest.mark.parametrize` for tables of cases; `tmp_path` and `monkeypatch` for files and env; no real network.
- Comprehensions and built-ins (`sum`, `any`, `zip`, `enumerate`) over manual index loops.
- Data models follow the repo's existing choice of `dataclasses` or pydantic.
