---
name: perf-baseline
description: "Use for slowness, timeouts, queueing or responsiveness work: measures a p50/p95 baseline with queue wait split from work time, finds the bottleneck, applies a proportionate fix and reports before/after numbers."
argument-hint: "[scenario]"
---

# Perf baseline: $ARGUMENTS

Measure first. No speedup claim without before/after numbers from the same harness. Scenario: $ARGUMENTS

## Steps
1. **Metric and scenario.** Fix the inputs (payload size, concurrency, number of users) and the metrics: p50, p95 and max wall time; time to first output; queue wait (enqueue to dequeue) reported separately from work time (start to end).
2. **Baseline harness.** The smallest script or test that runs the scenario at least 20 times after 2 discarded warm-ups, against local fixtures or mocks with realistic latency, never shared or production systems. Timestamp with a monotonic clock (`time.perf_counter()`, `performance.now()`, `time.Since`) at enqueue, dequeue, tool start, tool end and first byte. Print one summary line; keep the numbers in the conversation.
3. **Profile.** Write profiles outside the working tree.
   - Python: `<runner> python -X importtime -c "import <pkg>"` for startup; `<runner> python -m cProfile -o <tmp>/out.prof <entry>`, then `<runner> python -c "import pstats; pstats.Stats('<tmp>/out.prof').sort_stats('cumulative').print_stats(15)"`.
   - Node: `node --cpu-prof --cpu-prof-dir <tmp> <entry>`; open the .cpuprofile in DevTools.
   - Go: `go test -run '^$' -bench . -benchmem -cpuprofile <tmp>/cpu.out ./<pkg>`, then `go tool pprof -top <tmp>/cpu.out`.
   - Count downstream calls per request (mock counter or log); calls that grow with input size mean N+1.
4. **Usual culprits.** A global lock or a single serial queue; sync I/O on an async path; N+1 or unbatched calls; missing timeouts holding slots; re-auth or a new client per call; oversized payloads or context; retries amplifying load.
5. **Proportionate fix.** Pick the smallest that addresses the measured bottleneck: bounded concurrency with per-user fairness (per-user cap, round-robin); timeouts and cancellation; batching and pagination; a TTL cache with explicit invalidation; client reuse; streaming or progress events (queue position, partial results). No new infrastructure without evidence from step 3.
6. **After.** Rerun the same harness with the same inputs and present the table below. The error rate must be unchanged; if it rose, the fix is not done.
7. **Guard.** Leave `latency_ms` and `queue_wait_ms` log fields, keyed by a user hash, plus a performance test with a generous budget (about 3x the new p95) so it catches regressions without flaking.
8. **PR.** State the numbers, the method (runs, warm-ups, machine, mocks and their latency) and the limits of the measurement.

## Output
```
Scenario: <inputs, concurrency, runs>
| metric | before | after | change |
|--------|--------|-------|--------|
| p50 ms | | | |
| p95 ms | | | |
| max ms | | | |
| queue wait p95 ms | | | |
| error rate | | | unchanged? |
Bottleneck: <file:line> <evidence from profile or call count>
Fix: <one sentence>
Limits: <what this measurement does not show>
```
