# Edge matrix

Pick the families that match the inputs and rules of the program. For each, write one-line mutants, run them through the real entrypoint, and stop a family after three mutants find nothing. The bracketed examples are real misses found by auditing a 90-minute take-home.

## 1. Shape
Wrong container (an object where a list is expected, a list of one); empty list; missing key (does the default fail open? [a missing `open_questions` key meant eligible]); null; wrong type (dict for a list, int for a string); extra keys; BOM; CRLF; trailing whitespace; unicode variants (dotless i passes `.upper()` as INTERNAL, fullwidth letters, NFC vs NFD); very long values (100k characters); duplicate records; the same id with two versions (which wins, and is the version used at all?).

## 2. Strings and enums
Case (`Approved`, `internal`); surrounding whitespace; empty and whitespace-only; the literals `None`, `null`, `none`, `N/A`; booleans as strings (`"false"` is truthy); numbers as strings (`"2"`); negative, zero and leading zeros; a string where a list was expected (`open_questions: "none"` iterated as four letters).

## 3. Identifiers
Case (`r1` vs `R1`); whitespace; order; duplicates; a subset or superset of the valid set; unknown ids; ids that carry a marker (`CUI-R1`); ids as integers; reserved names on Windows (`CON`, `NUL`) when ids become file names; collisions across records.

## 4. Rules and order
A malformed record that is also controlled: which gate speaks first? [a malformed CUI record got "needs clarification", not "blocked"]; a record failing two gates (which reason wins, are both listed?); fail-open defaults (`getattr(obj, "flag", False)` is truthy on a Mock); regex word boundaries (`\b` does not fire next to `_`, so `CUI_DATA` passes; `EAR` inside `YEAR`); substring false positives ("restricted to administrators", "temperature-controlled"); negations ("must not retain" vs "must retain"); reworded conflicts; drift that passes id checks (right ids, wrong roles or scope, "shipped" tense); limits the prompt states but the validator never checks (title length, criteria count).

## 5. Adapter and model output
Fenced JSON; leading prose; a list wrapping the object; extra top-level keys; one sibling object missing; a string where an object is expected; empty strings inside lists; duplicated ids; ids as integers; the decline shape; an exception from the adapter; `Mock()` and `MagicMock()` adapters (every attribute is truthy, `name` and `model` are not JSON serialisable); call counts after a full run [a repair round doubled `adapter.calls`]; calls recorded for records that must never reach the adapter; non-idempotent retries.

## 6. Leakage and logs
Reasons that quote input text (open questions, status values); hashes or ids of controlled content in results or audit lines; prompts echoing comments verbatim (an injection vector); error messages carrying paths, values or secrets; data on stderr or logs on stdout; a blocked record that still carries more than id, status and reason.

## 7. Process and filesystem
Rerun idempotency (byte-identical output, or a stated reason why not); partial writes (results written before the audit line, a crash between them); atomic writes; `--force` audited before the action succeeded; a missing output directory; an output path that is a file; an unwritable directory; relative paths from another working directory; newline and encoding on Windows; concurrent read-modify-write without a lock; stale state (the source changed after a decision was recorded).

## 8. CLI and HTTP
One exit code per failure class, documented; tracebacks where a message belongs (`OSError`, `KeyboardInterrupt`); `--help`; unknown flags; a missing input file; a directory where a file is expected; boolean flags fed from JSON strings; GET endpoints that skip a check POST performs; Host and origin checks; prompting when stdin is not a TTY; secrets accepted on the command line.

## 9. Time and numbers
Time zones and DST; month and year boundaries; leap days; epoch vs ISO strings; float formatting; integer overflow; off-by-one at 0, 1, n-1, n and n+1; the last page of a paginated list; a negative or zero page size.

## 10. The tests themselves
Would the suite notice the gate order swapped? [2 of 44 tests did]; status-only assertions with no reason checked; stubs returning `{}` so the happy path is never exercised; no full-run assertion on the adapter's call list; no test with a `Mock()` adapter; no malformed-plus-controlled record; no CLI error path; tests that pin a behaviour the brief did not ask for (a repair round) instead of the one it did.

## Hidden-test lens
Write 3-6 assertions the reviewer's own test would make, then run the program the way that test would: the required tests verbatim, `adapter.calls` after a full run, the exact output file shape, the status for each provided record, exit codes for the documented failures. Compare exactly, not approximately.
