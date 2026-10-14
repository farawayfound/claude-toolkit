export const meta = {
  name: 'gate',
  description: 'Eight independent review passes over the current change in parallel (the eighth mutates inputs and runs the entrypoints), each finding then checked by an agent that tries to refute it; ends in SHIP or FIX FIRST',
  whenToUse: 'Before opening a PR or submitting, once the tests are green. Optional argument: the base branch.',
  phases: [
    { title: 'Review', detail: 'checks, tests, scope, bypasses, security, reliability, concision, edges' },
    { title: 'Verify', detail: 'each high or medium finding gets an independent attempt to refute it' },
  ],
}

const raw = typeof args === 'string' ? args : args && typeof args.base === 'string' ? args.base : ''
const base = /^[\w./-]+$/.test(raw.trim()) ? raw.trim() : ''
const CHANGE = base
  ? `the change: \`git diff ${base}\` (committed and uncommitted work) plus untracked files from \`git ls-files -o --exclude-standard\``
  : 'the change: find the base with `git merge-base HEAD origin/HEAD` (else main, then master), then `git diff <base>` (committed and uncommitted work) plus untracked files from `git ls-files -o --exclude-standard`'
const COMMON = `Review ${CHANGE}. Read every changed file in full and the callers of every changed function. Read-only: never edit files, stash, reset, checkout, commit, install or redirect output into files. Report only your pass: at most 4 findings, no style nits, each located as file:line. A finding is CONFIRMED only with a reproducer you actually ran (an existing test, or a one-off command that writes no files) and its quoted output; otherwise PLAUSIBLE. Prefer reading code and one-off commands over full test runs; the checks pass runs the suite.`
const EDGES = `Test ${CHANGE} with inputs a strict reviewer would try. Never edit, stash, reset, checkout, commit or install inside the checkout; scratch copies, mutated fixtures and one-off scripts go under the OS temp directory. Report only your pass: at most 6 findings, each located as file:line, CONFIRMED only with the command you ran and its quoted output, otherwise PLAUSIBLE.`

const PASSES = [
  { key: 'checks', agentType: 'verifier', effort: 'low', prompt: 'Pass: checks. Run the repository checks per your instructions (format check, lint, typecheck, targeted tests, the full suite if under about 2 minutes). Each new failure is a high finding; each pre-existing failure or check that could not run is low. Put the Check | Command | Exit | Result table in summary. verdict: pass when everything ran and nothing new failed, concerns when something could not run, fail on any new failure.' },
  { key: 'tests', prompt: 'Pass: tests. Would each new or changed test fail without the change? Do deny and dry-run cases assert zero side effects? Which cases are missing: happy path, denied, error, empty, missing identity, bulk, duplicate? Are the tests deterministic (no network, sleeps or real clocks)?' },
  { key: 'scope', effort: 'low', prompt: 'Pass: scope and hygiene. From git diff --stat and the diff: files beyond the purpose of the change, drive-by edits, renames, reformatting churn, commented-out code, debug prints, TODOs, new dependencies or lockfile edits, secret-like strings (report the keyword and file:line, never the value).' },
  { key: 'bypass', prompt: 'Pass: bypasses. Find every other route to the same side effect that does not go through the changed check or fix: bulk operations, delete paths, raw passthrough, background jobs, scripts, alternate entrypoints. Grep for them; each unguarded route is a finding.' },
  { key: 'security', prompt: 'Pass: security. Identity or authorization taken from caller- or model-supplied arguments; secrets or PII in logs, errors or fixtures; injection (SQL, shell, path); overly broad scopes or shared credentials; time-of-check vs time-of-use on writes.' },
  { key: 'reliability', prompt: 'Pass: reliability and operability. Timeouts on network calls; bounded retries with backoff; idempotent, retry-safe writes; pagination; actionable errors with stable codes and non-zero exits; structured logs with a correlation id; a rollback path.' },
  { key: 'concision', prompt: 'Pass: concision. Needless loops, layers, wrappers, abstractions or dependencies; dead code; comments that narrate; anything the standard library or an existing helper already does. Each finding names the shorter version as its fix.' },
  { key: 'edges', agentType: 'breaker', prompt: 'Pass: edges. From the brief, README and tests, list the input shapes and the rules in their stated order, then write 3-6 hidden-test assertions a reviewer would make (call lists after a full run, the status of each provided record, the output shape, exit codes). Run the real entrypoints with mutated inputs from the edge matrix: wrong shape, missing key, blank and null values, case and whitespace, duplicate ids, a malformed record that is also controlled, Mock adapters, reruns, a missing output directory. Each wrong status, skipped gate, leak, crash or failed hidden-test assertion is a finding with its reproducer.' },
]

const FINDINGS = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['pass', 'concerns', 'fail'] },
    summary: { type: 'string' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          severity: { type: 'string', enum: ['high', 'med', 'low'] },
          evidence: { type: 'string', enum: ['CONFIRMED', 'PLAUSIBLE'] },
          location: { type: 'string' },
          problem: { type: 'string' },
          fix: { type: 'string' },
        },
        required: ['severity', 'evidence', 'location', 'problem', 'fix'],
      },
    },
  },
  required: ['verdict', 'summary', 'findings'],
}
const VERDICT = {
  type: 'object',
  properties: { status: { type: 'string', enum: ['confirmed', 'refuted', 'unsure'] }, reason: { type: 'string' } },
  required: ['status', 'reason'],
}

const refute = (f, pass) => agent(
  `Independently check one review finding about ${CHANGE}. Try to refute it: read the code at the location, and run a reproducer if one is cheap (read-only; it must write no files). Answer confirmed only with concrete evidence, refuted when the code shows it is wrong or already handled, unsure otherwise.\n\nFinding (${pass} pass): [${f.severity}] ${f.location} - ${f.problem}\nProposed fix: ${f.fix}`,
  { label: `verify:${pass}`, phase: 'Verify', schema: VERDICT, agentType: 'reviewer' },
).then((v) => ({ ...f, check: v ? v.status : 'unsure', why: v ? v.reason : 'the check did not complete' }))

const results = await pipeline(
  PASSES,
  (p) => agent(`${p.key === 'edges' ? EDGES : COMMON}\n\n${p.prompt}`, { label: `pass:${p.key}`, phase: 'Review', schema: FINDINGS, agentType: p.agentType || 'reviewer', ...(p.effort ? { effort: p.effort } : {}) }),
  (review, p) => {
    if (!review) return null
    const toCheck = p.key === 'checks' ? [] : review.findings.filter((f) => f.severity !== 'low')
    return parallel(toCheck.map((f) => () => refute(f, p.key))).then((checked) => ({
      pass: p.key,
      verdict: review.verdict,
      summary: review.summary,
      findings: [
        ...checked.map((c, i) => c || { ...toCheck[i], check: 'unsure', why: 'the check did not complete' }),
        ...review.findings.filter((f) => !toCheck.includes(f)),
      ],
    }))
  },
)

const passes = results.map((r, i) => r || { pass: PASSES[i].key, verdict: 'error', summary: 'the pass did not complete', findings: [] })
const RANK = { high: 0, med: 1, low: 2 }
const kept = passes
  .flatMap((r) => r.findings.filter((f) => f.check !== 'refuted').map((f) => ({ pass: r.pass, ...f })))
  .sort((a, b) => RANK[a.severity] - RANK[b.severity])
const refuted = passes.flatMap((r) => r.findings.filter((f) => f.check === 'refuted').map((f) => ({ pass: r.pass, location: f.location, problem: f.problem, why: f.why })))
const blocking = kept.filter((f) => f.severity === 'high' && (f.check === 'confirmed' || f.evidence === 'CONFIRMED'))
const checksFailed = passes.some((r) => r.pass === 'checks' && r.verdict === 'fail')
const incomplete = passes.filter((r) => r.verdict === 'error').map((r) => r.pass)
const verdict = blocking.length || checksFailed ? 'FIX FIRST' : incomplete.length ? 'INCOMPLETE' : 'SHIP'
if (refuted.length) log(`${refuted.length} finding(s) refuted and dropped`)
if (incomplete.length) log(`passes that did not complete: ${incomplete.join(', ')}`)

const report = [
  `Gate: ${verdict} (${blocking.length} blocking, ${kept.length} kept, ${refuted.length} refuted)`,
  '',
  '| Pass | Verdict | Kept findings |',
  '|---|---|---|',
  ...passes.map((r) => `| ${r.pass} | ${r.verdict} | ${r.findings.filter((f) => f.check !== 'refuted').length} |`),
  '',
  ...kept.map((f) => `- [${f.severity}] ${f.pass} ${f.location}: ${f.problem} → ${f.fix} (${f.check || f.evidence})`),
  '',
  `Checks: ${(passes.find((r) => r.pass === 'checks') || {}).summary || 'n/a'}`,
].join('\n')

return { verdict, report, passes, findings: kept, refuted, incomplete }
