// Data for guard.mjs. A rule is [id, decision, regex, why]; the first match wins, anywhere in a compound command (read-only search segments are skipped unless the id is in WHOLE).
const r = String.raw; const rx = (flags, ...alts) => new RegExp(alts.join('|'), flags);
const S = r`[^;&|\n]*`; // rest of the same shell segment
const GIT = r`\bgit\b(?:\s+-[Cc]\s+\S+)*\s+`;
const END = r`(?=$|[\s'"\x60;|&)<>,])`;
const AT = r`(?:^|[\s'"=/:])`; // start of a path inside a command
const NOT_TEST = r`(?<!${AT}(?:tests?|fixtures|testdata)/(?:[^\s'"/]*/)*)`; // synthetic fixtures under test dirs are not secrets
const ENVFILE = r`\.env(?!\.(?:[\w-]+\.)*(?:example|sample|template|dist)${END})(?:\.[\w.-]+)?`;
const SECRET = rx('i', r`${AT}(?:${ENVFILE}|\.envrc|\.npmrc|\.pypirc|\.netrc|\.git-credentials|id_(?:rsa|ed25519|ecdsa))${END}`,
  r`${AT}(?:${NOT_TEST}\.?credentials\.json|[\w-][\w.-]*\.(?:pem|key|p12|pfx))${END}`,
  r`${AT}\.(?:ssh|aws|gnupg)(?:/\S*)?${END}`, r`\.docker/config\.json${END}`, r`\.config/gcloud(?:/|${END})`);
const SECRET_VAR = r`\w*(?:KEY|TOKEN|SECRET|PASSW|CREDENTIAL)`, METHOD = r`(?:POST|PUT|PATCH|DELETE)`;
export const RULES = [['selftest-marker', 'deny', /toolkit-selftest-deny/, 'selftest marker'],
  ['force-push', 'deny', rx('', r`${GIT}push\b${S}(?:\s--force(?:-with-lease)?\b|\s-\w*f\w*\b|\s\+\S)`), 'force-push rewrites shared history'],
  ['push-delete', 'deny', rx('', r`${GIT}push\b${S}\s(?:--delete\b|-d\b|:\S)`), 'deletes a remote branch'],
  ['no-verify', 'deny', rx('', r`${GIT}(?:commit|push)\b${S}\s--no-verify\b`), 'skips the repository hooks; fix the hook failure instead'],
  ['reset-hard', 'deny', rx('', r`${GIT}reset\b${S}\s--hard\b`), 'discards uncommitted work'],
  ['git-clean', 'deny', rx('', r`${GIT}clean\b${S}\s(?:-\w*f|--force\b)`), 'deletes untracked files'],
  ['discard-all', 'deny', rx('', r`${GIT}(?:checkout|restore)\b(?!(?=${S}\s(?:--staged|-S)\b)(?!${S}\s(?:--worktree|-W)\b))${S}\s\.(?=$|[\s;&|)])`),
    'discards every working-tree change'],
  ['stash-drop', 'deny', rx('', r`${GIT}stash\s+(?:drop|clear)\b`), 'destroys stashed work'],
  ['history-rewrite', 'deny', rx('', r`${GIT}filter-(?:branch|repo)\b`), 'rewrites history'],
  ['recursive-delete', 'deny', rx('i', r`(?:^|[\s;&|(])(?:rm|del|erase)\b(?=${S}\s-(?:\w*r|-recursive))(?=${S}\s-(?:\w*f|-force))`, r`\bfind\b${S}\s-delete\b`,
    r`(?:^|[\s;&|(])(?:Remove-Item|ri)\b${S}\s-r`, r`(?:^|[\s;&|(])(?:rmdir|rd|del|erase)\b${S}\s/s\b`), 'recursive delete'],
  ['sql-destructive', 'deny', rx('i', r`\bDROP\s+(?:DATABASE|SCHEMA|TABLE)\b`, r`\bTRUNCATE\s+(?:TABLE\s+)?[a-z_"]`,
    r`\bDELETE\s+FROM\s+[\w."]+(?![\w."]*[^;'"]*\bWHERE\b)`, r`\bdropdb\b`, r`\bFLUSH(?:ALL|DB)\b`), 'destroys data'],
  ['infra-destroy', 'deny', rx('', r`\bterraform\b${S}\s-?destroy\b`, r`\bkubectl\b${S}\s(?:delete|drain)\b`, r`\bhelm\s+(?:uninstall|delete)\b`,
    r`\bgcloud\b${S}\sdelete\b`, r`\baws\b${S}\s(?:delete|terminate)-`, r`\baws\s+s3\s+(?:rm|rb)\b`), 'destroys infrastructure'],
  ['docker-prune', 'deny', rx('', r`\bdocker\s+(?:system|volume|image|container|builder)\s+prune\b`, r`\bdocker\s+volume\s+rm\b`,
    r`\bcompose\b${S}\sdown\b${S}\s(?:-v\b|--volumes\b)`), 'deletes containers, images or volumes'],
  ['publish', 'deny', rx('', r`\b(?:npm|pnpm|yarn|bun|cargo)\s+publish\b`, r`\btwine\s+upload\b`, r`\bgh\s+(?:release\s+create|repo\s+delete)\b`), 'publishes'],
  ['pipe-to-shell', 'deny', rx('i', r`\b(?:curl|wget|iwr|irm|Invoke-WebRequest|Invoke-RestMethod)\b[^;&\n]*\|\s*(?:sudo\s+)?`
    + r`(?:sh|bash|zsh|iex|Invoke-Expression|pwsh|powershell|python3?|node)\b`), 'runs downloaded code unreviewed'],
  ['env-dump', 'deny', rx('i', r`(?:^|[;&|(])\s*(?:printenv|env|set|export\s+-p)\s*(?=$|[;&|)])`, r`\[(?:System\.)?Environment\]::GetEnvironmentVariables`,
    r`(?:^|[\s;&|(])(?:gci|ls|dir|Get-ChildItem|Get-Item)\b${S}\s(?:-Path\s+)?env:`), 'prints every environment variable, secrets included'],
  ['secret-echo', 'deny', rx('i', r`\b(?:echo|printf|Write-Output|Write-Host)\b${S}\$(?:\{|env:)?${SECRET_VAR}`, r`\bprintenv\s+${SECRET_VAR}`,
    r`(?:^|[;&|(])\s*\$env:${SECRET_VAR}\w*\s*(?=$|[;&|)])`), 'prints a secret value'],
  ['token-print', 'deny', rx('', r`\bgh\s+auth\s+(?:token\b|status\b${S}\s(?:-t\b|--show-token\b))`, r`\baz\s+account\s+get-access-token\b`,
    r`\bgcloud\b${S}\sauth\s+print-(?:access|identity)-token\b`), 'prints a credential'],
  ['secret-path', 'deny', SECRET, 'touches a secret file; .env.example lists the key names'],
  ['git-push', 'ask', rx('', r`${GIT}push\b`), 'pushes to a shared remote'],
  ['branch-force-delete', 'ask', rx('', r`${GIT}branch\b${S}\s-D\b`), 'force-deletes a local branch'],
  ['github-write', 'ask', rx('i', r`\bgh\s+(?:pr|issue)\s+(?:create|merge|comment|close|edit|review)\b`,
    r`\bgh\s+api\b${S}\s(?:(?:-X\s*|--method[\s=]+)${METHOD}\b|-f\b|--(?:raw-)?field\b)`), 'writes to GitHub'],
  ['dependency-change', 'ask', rx('', r`\b(?:npm|pnpm|yarn|bun)\s+(?:add|install|i|remove|rm|uninstall|update|up|upgrade)\b`
    + r`(?!${S}--(?:frozen-lockfile|immutable))`, r`\bpip3?\s+install\b`, r`\b(?:uv|poetry)\s+(?:add|remove|lock)\b`, r`\bpoetry\s+(?:install|update)\b`,
    r`\buv\s+sync\b(?!${S}\s--(?:frozen|locked)\b)`, r`\bgo\s+(?:get|install|mod\s+(?:tidy|download))\b`), 'changes dependencies or the lockfile'],
  ['migration', 'ask', rx('', r`\balembic\s+(?:upgrade|downgrade)\b`, r`\bprisma\s+migrate\b`, r`\bmanage\.py\s+migrate\b`, r`\bknex\s+migrate\b`,
    r`\bdb:migrate\b`, r`\b(?:goose|migrate)\b${S}\s(?:up|down)\b`), 'changes a database schema'],
  ['external-write', 'ask', rx('', r`(?:^|[\s;&|(])(?:curl|wget|https?|xh)`
    + r`(?=${S}\s(?:-X\s*${METHOD}|--request[\s=]+${METHOD}|--data[\w-]*|-d|--json|-F|--form|--post-data|${METHOD})(?=[\s=@'"]|$))`
    + r`(?!${S}(?:\/\/|\s|@)(?:localhost|127\.0\.0\.1|\[?::1\]?)(?=[:\/\s'"]|$))`), 'writes to an external service'],
  ['external-write', 'ask', rx('i', r`\b(?:Invoke-RestMethod|Invoke-WebRequest|irm|iwr)\b${S}\s-Method\s+['"]?${METHOD}\b`), 'writes to an external service'],
  ['exec-flag', 'ask', rx('', r`\brg\b${S}\s--pre(?:[\s=]|$)`, r`\bfd\b${S}\s(?:-[xX]|--exec(?:-batch)?)\b`, r`${GIT}grep\b${S}\s(?:-O|--open-files-in-pager)`),
    'runs arbitrary programs through a search tool'],
  ['infra-change', 'ask', rx('', r`\bterraform\s+apply\b`, r`\bkubectl\b${S}\s(?:apply|scale|patch|edit|rollout\s+restart)\b`, r`\bgcloud\b${S}\sdeploy\b`),
    'changes live infrastructure'],
  ['production', 'ask', rx('i', r`^(?=[\s\S]*\bprod(?:uction)?\b)(?=[\s\S]*\b(?:deploy|migrate|apply|psql|kubectl)\b)`), 'targets production'],
  ['rewrites-files', 'ask', rx('', r`\b(?:ruff|eslint|golangci-lint|biome)\b${S}\s--fix\b`, r`\bgofmt\b${S}\s-w\b`, r`\bprettier\b${S}\s(?:--write|-w)\b`), 'rewrites files; checks run in check mode'],
  ['uv-run-unlocked', 'ask', rx('', r`\buv\s+run\b(?!${S}\s--(?:frozen|locked|no-sync)\b)`), 'may create uv.lock and .venv; with a lockfile use uv run --frozen'],
];
// Rules tested on the whole command even when it is a read-only search (a search can itself leak or execute); every other rule skips search segments.
export const WHOLE = new Set(['selftest-marker', 'pipe-to-shell', 'env-dump', 'secret-echo', 'token-print', 'secret-path', 'exec-flag']);
export const FILE_RULES = [ // Read and Grep check only the first rule; Edit, Write, MultiEdit and NotebookEdit check all
  ['secret-file', 'deny', rx('i', r`(?:^|/)(?:\.env(?:\.(?!(?:[^/]*\.)?(?:example|sample|template|dist)$)[^/]+)?|\.envrc|\.npmrc|\.pypirc|\.netrc)$`,
    r`(?:^|/)(?:\.git-credentials|${NOT_TEST}\.?credentials\.json|id_(?:rsa|ed25519|ecdsa)|[^/]+\.(?:pem|key|p12|pfx))$`,
    r`(?:^|/)\.(?:ssh|aws|gnupg)(?:/|$)`, r`(?:^|/)\.docker/config\.json$`, r`(?:^|/)\.config/gcloud(?:/|$)`), 'secret file; .env.example lists the key names'],
  ['lockfile', 'deny', /(?:^|\/)(?:package-lock\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb?|uv\.lock|poetry\.lock|Pipfile\.lock|go\.sum|Cargo\.lock)$/, 'lockfiles are generated; regenerate with the package manager'],
  ['git-internals', 'deny', /(?:^|\/)\.git\/(?:config$|hooks\/|objects\/|refs\/|HEAD$|index$)/, 'git internals are never edited by hand'],
];
