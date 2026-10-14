# Slop patterns

What generated code adds that a careful engineer would not. Each line: the pattern, then the fix.

## Comments
- A comment that says what the next line does (`# increment the counter`): delete.
- A docstring that restates the signature or the name (`"""Validate the draft."""` on `validate_draft`): delete, or write the one non-obvious fact.
- `Note:`, `Important:`, `TODO: consider` paragraphs: delete, or turn into an issue.
- Section banners (`# ---- helpers ----`) in a file under 200 lines: delete.

## Defensiveness
- `if x is None: return None` on a path where `x` is already validated: delete.
- `try: ... except Exception: pass` or `log and continue`: delete, or catch the one error the brief names and fail loudly.
- `isinstance` checks on every argument of an internal function: delete; validate at the boundary once.
- `cast(Any, ...)`, `as any`, `# type: ignore` added to silence a checker: fix the type instead.

## Structure
- A helper called once: inline it.
- A class with one method and no state: a function.
- A wrapper around one stdlib call (`def read_json(p): return json.loads(Path(p).read_text())`): call the stdlib.
- A base class or interface with one implementation: delete it.
- A parameter no caller passes, a flag the brief did not ask for, a config value with one setting: delete.
- A registry, plugin system or strategy table for two cases: an `if`.
- Re-exports and `__all__` in a package nobody imports from outside: delete.

## Output and logging
- `print` progress in a tool whose stdout is data: stderr or nothing.
- Emoji, banners, boxes and colour in CLI output: plain text.
- A log line per step inside a loop: one line per invocation with counts.

## Tests
- Two tests that assert the same behaviour with different names: keep one.
- A test of the language or the stdlib (`assert json.loads('{}') == {}`): delete.
- Names like `test_works`, `test_basic`, `test_1`: rename to scenario and expectation, or delete.
- A fixture that builds the world for a test that needs one field: inline the one field.

## Docs in code
- A README paragraph that repeats a docstring that repeats a comment: keep the one closest to the reader who needs it.
- Example output pasted into a comment: delete; the test shows it.
