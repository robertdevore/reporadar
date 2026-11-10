# RepoRadar hardening review — 2026-11-09

> **Fix-mode update, 2026-11-09:** R01–R10 below are resolved by the implementation and regression gates documented in the final section. The original review and baseline artifacts are preserved as historical evidence.


## Repository and boundary

- Mode: **review**, the default for a bare kujo-hardening invocation. No implementation fixes were authorized by this invocation or made in this pass.
- Repository: `robertdevore/reporadar`; branch `main`.
- Starting and ending inspected code SHA: `17a8b27594e7e33b164690fcc44ef5fdd7ad9dce`. The subsequent report commit contains only this review and evidence. Starting tree was clean.
- Purpose: single-user localhost Git dashboard, SQLite registry, CLI health reports. Dependencies: native Kujo 1.9.0, Git; optional authenticated `gh` enrichment; Python and Node for verification. No declared third-party Kujo packages, model providers, MCP server, or tool schemas.
- Scope: all seven source modules, five frontend scripts and associated templates, four Kujo suites and two Python harnesses, runtime configuration, CI, active operational docs, historical review references. Related Kujo runtime source was inspected read-only for callback/database contracts. No other repository implementation was changed; no live registry mutations or scans were performed.

## Baseline and evidence

The existing documented suite passes on macOS x64 with Kujo 1.9.0: four Kujo test files, CLI contract harness, live server smoke in VM/interpreter, seven source checks, and all JavaScript syntax checks. Passing existing coverage does **not** prove the failure paths below safe.

[probe.py](evidence/2026-11-09/probe.py) creates disposable Git repositories, databases and a random-port server, then removes them. [results.json](evidence/2026-11-09/results.json) is the immutable retained result of this run. The probe intentionally records defective behavior instead of asserting that the application is hardened. It is an audit artifact, not a regression gate. It uses a separate in-memory database for failure injection and never connects to the user's registry. The running dashboard on port 8080 remains available.

## Finding ledger

Priorities follow this skill: P0 includes correctness/data integrity/security contracts, not necessarily an internet-exploitable emergency. Confidence is independent of priority.

| ID | Priority | Area | Finding and evidence | Recommended action | Status / confidence |
|---|---|---|---|---|---|
| R01 | P0 | Backup integrity | `src/server.kujo:980–994`, `api_export_db`, calls text `read_file` on binary SQLite. A populated fixture with committed WAL data returns HTTP 500, not a backup. Copying only the main file would also omit uncheckpointed WAL state. Settings offers the broken download, while docs claim database backup/restore. | Use a consistent SQLite backup or `VACUUM INTO` snapshot, return binary bytes, clean temporary output, and test restore/integrity plus a committed WAL marker. Document that the existing JSON importer is not a SQLite restore workflow. | Reproduced; High. WAL omission is code-supported, not a completed download observation. |
| R02 | P0 | Import atomicity | `src/server.kujo:886–975` adds repositories before validating the imported settings count. One valid repo plus 51 settings returns 413/`success:false`, but the repo is already persisted (`repos_after:1`). | Validate the whole payload before writes; explicitly choose atomic import or documented partial-success semantics. Add failure/rollback tests. | Reproduced; High. |
| R03 | P0 | Discovery resource contract | `src/server.kujo:667–734` passes a dictionary budget through recursive calls as though mutations were shared. On Kujo 1.9 value semantics, a result budget of 1 returns 3 sibling repos; the caller's budget remains unchanged. Thus advertised global 1,000-result/25,000-entry limits are not enforced across the tree. `list_dir` also materializes a whole directory before checking the budget. | Return and consume remaining budgets explicitly or use an iterative bounded traversal, bounded directory reads, and truncation metadata. Test sibling fan-out, not just depth. Preserve `.git` file/worktree support when correcting traversal. | Reproduced; High. |
| R04 | P0 | Git status correctness | `src/scanner.kujo:85–267,511–528`: `git mv` produces `R `, but the rename shortcut reports staged=0, unstaged=1. Actual detached checkout produces `HEAD (no branch)` yet `is_detached=0` because the check only recognizes empty/`HEAD detached`. | Interpret both porcelain status columns and determine detached state with a reliable Git contract. Add real staged-rename, modified-rename and detached fixtures. | Both reproduced; High. |
| R05 | P0 | Snapshot integrity | `src/registry.kujo:144–195`, `store_scan_result`, inserts a snapshot and each file row separately without a transaction. An aborting file-change INSERT trigger causes a caught failure while leaving 1 snapshot and 0 file rows. Latest-snapshot readers can select incomplete results. | Commit snapshot, file rows, repository timestamps and pruning as one transaction with rollback. Test failure injection and reader visibility; keep external Git work outside write transactions. | Reproduced; High. |
| R06 | P1 | HTTP failure contract | JSON handlers call `parse_json` without a bounded typed error boundary. `POST /api/repos` with body `{` and JSON media type returns generic text HTTP 500, despite being invalid client input. Shape validation is also incomplete. | Return structured 400 for invalid JSON/types, keep server failures distinct, and test every mutation entry point. Test next-request health too. | Reproduced; High. Previously noted in August follow-up; now native 1.9 evidence. |
| R07 | P0 | Localhost authority boundary | `src/server.kujo:48–58` compares Origin to the supplied Host but never restricts Host to localhost. Isolated `PUT /api/settings` with Host `audit.invalid`, Origin `http://audit.invalid` succeeds (200). | Validate the served authority for reads and mutations before comparing Origin. Keep documented loopback aliases and origin-less local CLI clients. Add hostile-host and valid-host tests. | Missing Host enforcement reproduced; High. Browser DNS-rebinding exploitation is **not** demonstrated and depends on browser/network protections. |
| R08 | P2 | Settings and report drift | `static/app.js:858–879` hardcodes staleDays=14; server and CLI read `stale_threshold_days`. `static/activity.js:3` always starts at 7 despite saved `default_activity_window`. Dashboard summary counts repos with alerts whereas API sums alerts; error snapshots can also overlap clean counts in raw UI filtering. | Share explicit status/count semantics, load settings before filtering, and add frontend behavior checks for changed settings, unknown states and multiple alerts. | Source-supported; High for settings/count mismatch. No browser configuration mutation performed. |
| R09 | P1 | Query/context volume | `get_all_repos` and stale lookup rank all stored snapshots; detail query uses the same global window before filtering one repo. `api_activity` loads every matching commit to return a count and only 50 rows. `init_db` repeats schema/index/default setup on each request. See measured scale below. | Profile query plans; use indexed latest-row lookups, SQL counts/limits and a safe initialization lifecycle. Add optional summary/output-file CLI modes while preserving existing JSON schema and detail access. | Query shape confirmed; performance improvement remains unmeasured. |
| R10 | P2 | Documentation and gates | `docs/CLI.md` describes doctor as non-mutating, but `cmd_doctor` calls schema creation/migration. `docs/DEVELOPMENT.md` uses a multi-file `kujo check src/*.kujo` unlike CI's loop. Backup/restore and bounded-discovery claims exceed reproduced behavior. Tests miss R01–R08. | Correct claims with future fixes; promote isolated behavioral probes into regression tests. Avoid calling a passing happy-path suite a production certification. | Source-supported; High; no unrelated doc rewrite made. |

## Changes implemented

Only the audit report, reproducible probe and captured evidence were added. No runtime, schema, dependency, UI or configuration changes. There is no before/after improvement claim. Phases 17–18 implementation work is intentionally not applicable to review mode.

## Performance and efficiency

Synthetic retained-history baseline: 250 snapshots per repo (the configured retention limit), three sequential GET `/api/repos` samples for each registry size, same machine/runtime, no remote calls. Each successful body was decoded and its count checked. These are warm-ish end-to-end request observations including initialization/query/serialization, not pure SQL timings or a load test.

| Repos | Snapshots | GET samples (ms) | Median (ms) | HTTP bytes | `list --json` bytes |
|---:|---:|---|---:|---:|---:|
| 30 | 7,500 | 24.99, 24.33, 25.79 | 24.99 | 22,150 | 22,844 |
| 100 | 25,000 | 103.93, 100.74, 99.89 | 100.74 | 73,814 | 75,072 |
| 500 | 125,000 | 357.95, 482.41, 420.51 | 420.51 | 370,214 | 374,672 |

No optimized comparator exists in review mode. No memory/CPU/build-size/token savings were measured. Native runtime build is external; this application is interpreted/VM-run with no app bundler. JSON byte sizes are exact output measurements, **not token counts**. Three samples are insufficient for p95 or a CI latency budget. Exploratory runs that mixed error probes and fixture replacement in one server produced generic 500s; the retained scale run restarts the disposable server before benchmarking. The cause of that exploratory instability was not isolated and is not promoted to a separate confirmed finding.

AI-facing analysis: the health report has stable schema/exit codes and attention/dirty filters, but emits full pretty JSON records; bulk review also repeats repo names/errors in `scan.repo_results`. No summary-only, output-file or pagination contract exists. Prefer optional concise receipts with full evidence preserved, not removal of error details. Progressive docs already separate README, CLI and architecture; archived reviews are not default context. No model retry/replay, child-agent handoffs or tool-registration payloads exist here. Terminal names/messages are untrusted Git content and currently printed without explicit control-character normalization; exploit/terminal effects were not tested.

## Security and state

Reviewed shell quoting, numeric route IDs, SQL escaping/flag normalization, static traversal checks, origin/media-type/body guards, browser rendering, repository-configured subprocess behavior, environment/db paths, opt-in GitHub calls and local persistence. Positive controls include loopback binding, `core.fsmonitor=false`, optional Git locks disabled, fixed static route registration, JSON-only CLI health output and pinned/checksummed CI runtime. Open boundaries are R01–R03/R05/R07 and incomplete failure validation. No live exploit, external upload or destructive migration was attempted.

Raw `remote_url` is stored/displayed/exported; credential-bearing Git remotes would therefore propagate credentials. No actual credential was sought or observed. Treat this as an input-policy risk for future review, not a discovered secret. Commit fields use a delimiter that can appear in author names; malformed date fallbacks are inserted into HTML without consistent escaping. End-to-end exploitability was not verified; use structured/robust record parsing and universal text escaping in a follow-up.

SQLite WAL/busy timeout and unique commit indexes help concurrency but do not supply multi-statement atomicity. `set_setting` and repo add use check-then-insert; concurrent duplicates require explicit conflict behavior. No concurrent-write stress test was run. Scan subprocesses have no application-owned timeout/cancellation; runtime/OS defaults were not exhaustively assessed. Snapshot counts are bounded per repo, but commit history, scan_runs and full response buffers have no explicit lifecycle budget. Avoid inferring a connection leak from the absence of `db_close`: Kujo handle ownership must be profiled first.

## Phase coverage 0–16

| Phase | Coverage and disposition |
|---:|---|
| 0 | Mapped CLI → scanner → registry/db and HTTP/static UI, package/CI, contracts and trust boundaries; exact SHA recorded. |
| 1 | Full baseline passed; isolated failure/scale evidence retained. |
| 2 | Repeated schema/default/index initialization, CLI/server bulk scan duplication, repeated frontend fetch/escape/date utilities and inconsistent classification inspected. Prefer targeted shared semantics, not cosmetic module churn. |
| 3 | Snapshot window queries, subprocess sequence, activity buffering and full-table rerender after each UI scan inspected; scale measured; R09. |
| 4 | Retention, full-directory allocation, response buffers, process cleanup and SQLite ownership inspected; R03/R05 and explicit unmeasured limits above. |
| 5 | CLI JSON byte volume, filters, repeated bulk results and progressive docs inspected; model/MCP/schema registration/replay N/A. |
| 6 | JSON-only mode and exit receipts pass; pretty whole-registry output has no file/summary mode; errors can be generic. |
| 7 | Malformed JSON, rejected import and injected SQLite failure exercised; R02/R05/R06. |
| 8 | Localhost input, filesystem, Git/subprocess, SQL, HTML and network trust boundaries covered; R03/R07, unvalidated hypotheses clearly separated. |
| 9 | Atomicity and value-semantic recursion tested; R03/R05. Concurrent duplicate requests, cancellation and deterministic discovery ordering need further tests. |
| 10 | Health schema v1, DB schema v2, app v0.4.0, return statuses, export/import, settings and CLI exit codes inspected; R04/R06/R08. |
| 11 | No third-party Kujo package dependencies; checksum-verified 1.9.0 runtime, SHA-pinned checkout 7.0.1, weekly Dependabot. GitHub API returned zero open alerts during this review. Runtime transitive dependencies not audited here. |
| 12 | Existing tests pass but omit backup restore, rollback, discovery sibling budgets, real rename/detached cases, hostile Host and frontend settings tests. Evidence probe supplies future regression inputs. |
| 13 | Linux/macOS source/unit/CLI/server/JS gates exist. Add deterministic behavior tests first; do not gate three-sample wall-clock timings. |
| 14 | Compared active docs to source; R10. August review remains historical, not proof current gaps are closed. |
| 15 | Small root, separate CLI guide and doctor help agents; unknown output volume and misleading read-only doctor claim remain. |
| 16 | No deletion justified. `tests/*.out` are Kujo fixture expectations, not disposable logs. Preserve font/license, runtime compatibility closures, archives and future-write setting pending contract decisions. |

## Compatibility and proposed sequencing

This review changes no public APIs, CLI behavior, persisted formats/schemas, settings, environment variables or downstream runtime behavior. Future fixes should preserve successful contracts; invalid JSON may intentionally change 500 to 400, hostile Host requests should become denied, rejected imports should stop mutating, and corrected Git flags should change only inaccurate outputs. Discovery truncation metadata and optional concise CLI output should be additive. A backup implementation must define binary restore guarantees rather than silently substituting registry JSON.

Recommended order: R01/R02/R05 integrity, R03 resource boundary, R07 authority checks, R04 scanner accuracy; then R06 error normalization, R09 measured optimization and R08/R10 consistency/docs. P3 cosmetics are not worth changing in this pass.

## Cross-repository follow-ups and limits

No other repository change is required to establish the reviewed app defects. Kujo value semantics must be respected by RepoRadar; changing the language to share mutable dictionaries would be inappropriate. Verify that the selected native release supports binary HTTP responses and SQLite-consistent backup primitives before implementing R01; only open a Kujo enhancement if the documented primitives are insufficient. Investigate opaque worker errors upstream only with an isolated reproducer. Browser DNS-rebinding feasibility, malicious Git metadata rendering, sustained concurrent-load behavior and Windows-native support remain **needs more evidence**. Unix/macOS scope is preserved.

## Verification receipt

Executed from repository root with the dedicated Kujo 1.9.0 directory prepended to PATH:

```sh
kujo test --runtime dual
python3 tests/cli_contract_harness.py
python3 tests/server_smoke_harness.py
for source in src/*.kujo; do kujo check "$source"; done
for source in static/*.js; do node --check "$source"; done
KUJO_BIN=/Users/robertdevore/.local/share/reporadar/kujo-1.9.0/kujo python3 docs/audits/evidence/2026-11-09/probe.py > docs/audits/evidence/2026-11-09/results.json
gh api 'repos/robertdevore/reporadar/dependabot/alerts?state=open' --jq length
git diff --check
```

Baseline checks PASS. Probe execution PASS as evidence collection; defective outcomes are OPEN findings, not passing product assertions. Dependency alert query returned 0, point-in-time only. Whitespace check PASS. No implementation changed, so there is no new behavioral regression or after-performance measurement to claim. Report-only CI is checked separately after push. Audit findings remain unresolved by design.

## Fix-mode verification — 2026-11-09

Scope: all ten confirmed findings from the review at `14be708901517c77cbaffa8cf0685b65e0240056`, using checksum-verified Kujo 1.9.0. The earlier phases 0–16 and exclusions above remain the review baseline; this pass completes implementation and verification phases 17–18. No other repositories were modified.

| Finding | Resolution | Regression evidence |
|---|---|---|
| R01 | SQLite `VACUUM INTO` in a private temporary directory, binary HTTP body, cleanup on success/failure | Download signature, restored `integrity_check`, committed WAL marker, no leftover snapshot directory; VM and interpreter |
| R02 | Validate all import collections/fields/settings before writes; transaction around repositories and settings | 51-key rejection leaves zero rows; injected settings trigger rolls back earlier repository insert; valid/duplicate imports preserved |
| R03 | Iterative traversal with explicit global counters; bounded native directory pages; worktree markers; symlink skipping; CLI/API/UI incomplete-result notices | Result budget 1 returns 1; three-entry budget stays bounded; sibling/worktree/cycle fixtures; complete scan returns four repositories |
| R04 | Parse index/worktree rename columns independently; recognize detached and unborn headers | Real Git staged rename and detached checkout in both runtimes; `RM` and unborn unit cases |
| R05 | Snapshot, file changes, timestamps and pruning in one immediate transaction; Git inspection stays outside | Injected file-change failure leaves no snapshot or timestamp update |
| R06 | Central route boundary parses once and checks object/array/field types; diagnostic logging for unexpected failures | Malformed JSON and wrong types across mutation endpoints return structured 400; subsequent reads remain healthy |
| R07 | Loopback authority allowlist on every registered route, independent of Origin | Arbitrary Host with matching Origin rejected for reads/writes; IPv4/IPv6/localhost aliases accepted; missing/invalid ports rejected |
| R08 | Saved stale/activity windows, exclusive status categories, summed alerts, inclusive ahead/behind, correct unscanned states | Browser-code tests for summary/filter/settings behavior; API summary and legacy timestamp tests |
| R09 | Indexed correlated latest-snapshot lookups; SQL LIMIT 50 activity feed plus aggregate count; schema-version fast path; settings upsert; optional health summary/file output | Index query-plan assertion without temporary sort; 75 commits counted with only 50 returned; output equivalence and write-error checks; comparable measurements below |
| R10 | Correct doctor/check/backup/discovery documentation; gate behavioral regressions in Linux/macOS CI | Source checks, existing contracts, new harnesses and frontend checks listed below |

### Verification commands and results

All local commands passed with the dedicated Kujo 1.9.0 binary first on PATH:

```bash
for source in src/*.kujo; do kujo check "$source"; done
kujo test --runtime dual
python3 tests/cli_contract_harness.py
python3 tests/server_smoke_harness.py
python3 tests/hardening_harness.py
node tests/frontend_harness.js
for source in static/*.js; do node --check "$source"; done
git diff --check
KUJO_BIN=/path/to/kujo-1.9.0/kujo python3 docs/audits/evidence/2026-11-09/probe.py
```

Kujo's `dual` strategy reports four fixture files passed with VM primary and no fallback; the server and hardening harnesses explicitly execute both VM and interpreter. Fixtures use disposable databases and repositories; the live registry is not modified by these tests. GitHub API checks on this date returned latest Kujo release `v1.9.0` and zero open RepoRadar Dependabot alerts. Existing dependency-free Kujo manifest and pinned CI actions are retained.

### Comparable measurements

Same preserved probe, macOS host, native Kujo 1.9.0, three sequential requests per scale, 250 snapshots per repository. Wall time is an observation, not a CI threshold. No memory, p95, token, or throughput claim is made. Detailed after evidence: [results](evidence/2026-11-09-fix/results.json).

| Repositories / snapshots | Before median ms | After median ms | HTTP bytes before / after | CLI JSON bytes before / after |
|---|---:|---:|---:|---:|
| 30 / 7500 | 24.99 | 4.49 | 22150 / 22150 | 22844 / 22844 |
| 100 / 25000 | 100.74 | 7.7 | 73814 / 73814 | 75072 / 75072 |
| 500 / 125000 | 420.51 | 26.19 | 370214 / 370214 | 374672 / 374672 |

Optional `--summary` produces less output in the regression fixture while preserving summary values and exit policy. `--output=<path>` preserves full report evidence and prints a small receipt. Default output remains unchanged.

### Compatibility and limits

No schema-version or default CLI schema bump is needed. JSON clients now receive 400 for malformed structures and 413 for oversized collections before import writes; unexpected failures remain logged 500 responses. Original missing-path/duplicate import skip semantics are retained. API discovery adds `truncated` and `entries_examined`; array-returning internal compatibility wrappers remain, but callers needing completeness should use `discover_report`. Child symlinks are excluded and filesystem-root discovery is rejected; select a narrower directory. Pagination rescans consume the same global entry budget, so wide directories can report incomplete results before returning all matches.

Raw database restoration is an offline operation; the web importer remains JSON registry/settings import. The backup response necessarily materializes a binary snapshot in memory with the current HTTP runtime contract. This pass does not claim streaming or unlimited database scale.

The prior browser-rebinding exploit hypothesis, malicious Git metadata investigation, sustained concurrent-load behavior, Windows-native support, external command timeouts, and enterprise controls were not converted into new confirmed findings. No unresolved item remains among R01–R10. Historical SignalBox review captures are referenced in the Strata completion handoff; no duplicate resolution captures are created.
