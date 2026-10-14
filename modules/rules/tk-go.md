---
paths:
  - "**/*.go"
  - "**/go.mod"
---
# Go guidance

- Code is gofmt-clean and `go vet ./...` clean.
- Errors are wrapped with context and %w: `fmt.Errorf("load user %s: %w", id, err)`; callers check them with `errors.Is` / `errors.As`.
- Errors are never discarded. Library code returns errors and does not panic.
- `context.Context` is the first parameter, propagated down, with deadlines on I/O.
- An `http.Client` has a `Timeout` and is reused; outbound calls never use `http.DefaultClient`.
- Tests are table-driven with `t.Run(tc.name, ...)`.
- `-race` needs cgo, which is often unavailable on Windows: skip it there and say so.
- Interfaces are small and defined at the consumer.
- No package-level mutable state; dependencies are passed in.
- Logging uses `log/slog` if the repo already does.
- New modules (`go get`) wait for the user's go-ahead.
