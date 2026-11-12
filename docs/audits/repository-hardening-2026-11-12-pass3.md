# RepoRadar hardening review — pass 3, 2026-11-12

## Repository and scope

Repository `robertdevore/reporadar`, branch `main`; starting and ending implementation SHA `556e4644c694eefded4ab73b20c72935d7d3d516`. Initially clean. Review only: report and reproductions added, no production changes. R01–R15 remain resolved as recorded in the earlier audits. No applicable repository AGENTS.md was found; user instructions authorize committing/pushing evidence.

RepoRadar is a local Git inventory/dashboard using Kujo 1.9.0, SQLite, Git and optional GitHub CLI enrichment. Browser assets are local, the Kujo package dependency list is empty, and tests use Python/Node.

## Baseline and evidence

All nine existing verification groups passed on macOS, native Kujo 1.9.0 and Git 2.42.0. [checks.json](evidence/2026-11-12-pass3/checks.json) records exact commands, exit codes and single-run durations; numbered logs preserve output. [probe.py](evidence/2026-11-12-pass3/probe.py) reproduces four new findings in both VM and interpreter; [results.json](evidence/2026-11-12-pass3/results.json) records results.

All fixture databases, repositories and servers are temporary. Live data/application were not modified or restarted. Discovery fixtures use `.git` markers, exactly what discovery recognizes. Scanner fixtures use real Git. The race fixture schedules a real checkout after status completes through a temporary Git wrapper; it does not fabricate output. This establishes a possible interleaving, not its frequency.

## Finding ledger

All findings have high confidence and remain open. P0 follows the skill's correctness/data-integrity category; it does not imply a critical exploitable vulnerability.

| ID | Priority | Area | Finding and evidence | Action | Status |
|---|---|---|---|---|---|
| R16 | P2 | Path fidelity | `src/scanner.kujo:parse_git_status` stores Git's quoted display spelling as `file_path`. Four actual filenames containing Unicode, newline, quote or trailing space retain literal quotes/backslash escapes. `static/detail.js:renderFiles` displays these unchanged. Counts remain correct. | Use NUL-framed status with explicit rename/copy handling; preserve exact whitespace and filenames. Test real Git special names and rename paths while preserving compatibility helpers. | Reproduced in both runtimes; open |
| R17 | P0 | Settings atomicity | `src/server.kujo:api_settings_update` writes keys separately without a transaction. A trigger aborting the second INSERT returns HTTP 500 while the first setting remains committed. This is distinct from the fixed atomic import handler. | Validate first, wrap the whole batch in a transaction, rollback on error; test that all previous values survive a later-write failure. | Reproduced in both runtimes; open |
| R18 | P1 | Discovery progress | `api_discover` filters hidden/tracked paths after `discover_report` consumes its 1,000-result cap. With 1,001 marker repos and the first 1,000 hidden, repeated parent searches return zero new repos, truncated=true, 1,000 excluded and 3,002 examined entries. Narrowing to the final repo finds it. Hiding does not advance the parent search. | Filter before consuming visible-result slots or provide resumable cursors, preserving the global entry budget and nested-repo traversal. Test both hidden and tracked prefixes. | Reproduced in both runtimes; open |
| R19 | P0 | Scan consistency | `scan_repo_with_options` reads status before latest commit; `scan_and_store` compares only two later history reads. A checkout between status and latest-commit collection persists the old branch plus the new branch's commit, success=true and empty scan_error. | Validate branch/HEAD identity across the entire collection, anchor history to that identity, reject or retry boundedly on mismatch. Keep Git work outside SQLite write locks. Test this interleaving and detached/unborn transitions. | Reproduced in both runtimes; open |

R19 corrupts the recorded relationship between scan fields, not Git history. R17 requires a write failure; no failure was induced in the live database. No production data loss or exploit is inferred.

## Phases 0–16 coverage

| Phase | Evidence / assessment |
|---|---|
| 0 Repository | CLI/server/scanner/registry/metadata/database, static clients, manifests, CI and existing audits inspected; root/branch/SHA confirmed. |
| 1 Baseline | Nine groups pass, including dual-runtime fixture and integration coverage. |
| 2 Complexity | Shared scan persistence/metadata helpers remain useful; large server module alone does not justify speculative refactoring. |
| 3 Performance | Indexed latest-snapshot and bounded activity queries retained; history reads at most 10,001 records to detect incompleteness. R18 measures result-budget waste, not a timing regression. |
| 4 Resources | Discovery caps, 250 snapshots per repo, 10,000 cached commits, request/bulk limits and backup cleanup reviewed. Count bounds are not total-byte bounds. No RSS benchmark. |
| 5 Agent context | CLI summary/output-file modes available. Model prompts, replay loops, MCP registrations and tool-schema size are N/A in this application. |
| 6 Output | Compact CLI contracts pass; verbose evidence retained in logs. Full exports scale with inventory; no invented token savings. |
| 7 Errors | Existing structured client/server error tests pass; R17 exposes the missing settings rollback boundary. |
| 8 Security | Shell/SQL quoting, disabled fsmonitor, loopback Host/exact Origin checks, static traversal, userinfo redaction, backup privacy and body limits inspected; existing security regressions pass. No new proven security vulnerability. |
| 9 State | Snapshot/history transaction tests pass. R19 concerns observation-time consistency, R17 a distinct missing transaction. |
| 10 Contracts | Findings cover file identity, failed-save semantics, discovery progress and coherent scan metadata. JSON import intentionally differs from full SQLite backup. |
| 11 Dependencies | Empty package dependencies, local assets, pinned checkout SHA and checksum-verified Kujo CI install. GitHub returned zero open Dependabot alerts on this review date; host-binary advisories were not exhaustively audited. |
| 12 Tests | Four previously uncovered cases reproduced twice; adapt into regression tests when fixing. Current probes intentionally assert current defects. |
| 13 CI | Linux/macOS matrix covers source, dual runtime, CLI/server/hardening/metadata/frontend. Review probes are evidence rather than CI assertions of wrong behavior. |
| 14 Docs | Security/development/testing and schema/history contracts checked; report clarifies remaining limitations without unrelated rewrites. |
| 15 Agent DX | Focused modules, documented verification and machine-readable reports support review. No additional agent framework warranted. |
| 16 Dead weight | No safely removable dependency or compatibility export proven. Preserve legacy helpers and avoid cosmetic churn. |

## Changes, compatibility and measurements

Only review artifacts added. No API, CLI, schema, file format, configuration, environment variable, UI or dependency changes. No migration or cross-repository implementation required for proposed fixes; existing Kujo NUL strings and transactions suffice.

Static assets measured 232 KiB via `du -sh static` (filesystem allocation, not transfer size). R16 affects 4/4 special-name fixtures; R17 persists 1 of 2 settings after failure; R18 consumes 1,000 result slots/3,002 entry visits per repeated search; R19 persists one mixed snapshot per controlled interleaving. No before/after runtime, RSS, build-size or token improvement claimed. Baseline durations are single observations, not benchmarks.

## Remaining work and limits

- P0: R17 and R19. P1: R18. P2: R16. No P3 recommendations.
- Needs more evidence: independent scans publishing out of collection order, concurrent startup migrations, byte-level subprocess limits for unusually large metadata. These are unproven considerations, not admitted findings or SignalBox captures.
- Not worth changing: intentional compatibility exports, speculative module splits and cosmetic cleanup.
- No new browser layout session, live bulk scan, penetration test, exhaustive resource benchmark or third-party binary advisory audit. This is not a guarantee of no further defects.

## Verification receipt

From repository root, with `/Users/robertdevore/.local/share/reporadar/kujo-1.9.0` prepended to PATH:

```sh
for source in src/*.kujo; do kujo check "$source" || exit; done
kujo test --runtime dual
python3 tests/cli_contract_harness.py
python3 tests/server_smoke_harness.py
python3 tests/hardening_harness.py
python3 tests/metadata_harness.py
node tests/frontend_harness.js
for source in static/*.js; do node --check "$source" || exit; done
git diff --check
python3 docs/audits/evidence/2026-11-12-pass3/probe.py
```

All passed. The last command confirms reproduction, not remediation. Additional authenticated read-only check `gh api repos/robertdevore/reporadar/dependabot/alerts --jq '[.[] | select(.state=="open")] | length'` returned `0`. No baseline failures. The report commit cannot embed its own SHA; Git history records it.
