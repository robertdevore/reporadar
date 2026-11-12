# RepoRadar hardening review — 2026-11-12

## Repository and scope

- **Review mode**, per bare skill invocation. No implementation fixes or live registry mutations.
- Repository: `robertdevore/reporadar`, branch `main`, clean starting tree.
- Starting and ending inspected code: `b21afd4ad16d28dc43c358da9e642a3413a49772`. The later report commit changes evidence/documentation only and cannot include its own SHA.
- Local-first Git dashboard and CLI; Kujo 1.9.0, Git, SQLite runtime; optional authenticated `gh` enrichment. No application package dependencies, model provider, MCP server, or agent tool schemas.
- Inspected scanner, persistence, HTTP routes, CLI/health contracts, frontend rendering/discovery/settings, schema v3, CI, tests and active documentation. Existing R01–R10 fixes remain intact and their regression harness passes. This review is a new milestone; it does not reopen those resolved findings.
- Fixtures use temporary repositories and databases. No real credentials were read, copied or tested; the credential-shaped URL in evidence is deliberately fake and points to `example.invalid`.

## Baseline

All seven verification command groups passed before review artifacts were added. Exact commands, exit codes and observed durations are in [baseline.json](evidence/2026-11-12/baseline.json); numbered logs retain details. macOS host, dedicated native Kujo 1.9.0. Four Kujo fixture suites pass; server/hardening harnesses explicitly cover VM and interpreter. New probes below use VM only.

GitHub API queries returned **0 open Dependabot alerts** and latest Kujo release **v1.9.0** on this date. This is point-in-time evidence, not a dependency-vulnerability certification. CI pins checkout by SHA and verifies the runtime archive checksum. Runtime internals/transitive dependencies were not independently audited.

## Finding ledger

Priorities follow the skill: P0 includes correctness/security contracts and does not imply an internet-exploitable emergency. All five findings are open; no fixed-count target was used.

| ID | Priority | Area | Evidence and impact | Recommended action | Confidence/status |
|---|---|---|---|---|---|
| R11 | P0 | Git status correctness | `src/scanner.kujo:scan_repo_with_options` invokes `status --porcelain=v1 --branch` without overriding `status.showUntrackedFiles`. A real repository with an untracked file reports dirty/count 1 normally, then clean/count 0 after `git config status.showUntrackedFiles no`. This silently changes dashboard and automation health. | Explicitly request untracked files and define directory/file counting semantics. Test repository and global config interference; consider submodule-ignore settings separately. | High; reproduced in `untracked_config`. |
| R12 | P0 | Secret propagation | `get_remote_url` returns the full remote; `write_scan_result`, `build_review_report`, API export and detail copy/render retain it. A fake HTTPS username/password remote appears unchanged in scan output. Docs say no credentials/tokens are stored. A credential-bearing remote can consequently enter saved history, report artifacts and shared exports. | Redact URL userinfo before persistence/output, preserve useful remote identity, cover URL variants, and define cleanup of existing snapshots/backups. Do not silently rewrite Git remotes. | High for propagation; fixture-only, no actual leak observed. |
| R13 | P0 | Commit parser integrity | `parse_commit_log_line` splits on `---`, which is valid in author names. Normal `git config user.name 'Fixture---not-a-date'` yields author `Fixture`, date `not-a-date`, and message prefixed by the actual timestamp. Invalid dates also undermine activity/stale classifications. | Use an unambiguous structured/length-aware record format and validate dates. Add a real Git author-delimiter regression and define repair/rescan of already stored rows (INSERT OR IGNORE otherwise preserves bad data). | High; reproduced in `delimiter_author`. |
| R14 | P1 | Activity dates | `get_commits_by_day` calls SQLite `date(rc.date)` on Git `--date=iso` strings such as `YYYY-MM-DD 12:00:00 -0500`; SQLite returns NULL. A current fixture has total 1 but a null day, so the chart loses daily buckets. Feed/window queries also compare local-offset timestamps lexically to UTC `datetime('now')`, which can misclassify boundary commits and chronological order. | Normalize timestamps to a consistent SQLite-supported UTC representation, including existing rows. Test positive/negative offsets, day boundaries, daily buckets and window cutoffs. Preserve indexed access after migration. | High for null bucket; boundary misclassification is source-supported, not separately exercised. |
| R15 | P1 | Activity completeness | Every CLI/HTTP scan calls `collect_recent_commits(path,0)`, which fetches only 20 commits. Activity GET only queries stored records; it never backfills the requested window. A fixture with 27 commits in seven days captures 20 on the production scan path. First scans and gaps of >20 commits therefore undercount without indicating incompleteness. `docs/ARCHITECTURE.md` incorrectly describes window-based Git collection on activity view. | Incrementally collect through the last known commit or requested bounded window, define history-rewrite behavior and explicit incomplete/backfill status. Keep the 20-row detail display separate from collection completeness. | High; reproduced in `history_capture`, production callers inspected. |

The credential/parser concerns were hypotheses in the earlier review; this pass supplies concrete fixture evidence rather than counting them as previously fixed work.

## Additional evidence and limitations

- **Rendering needs more evidence:** detail/activity `formatDate` returns invalid input unchanged and templates put it into `innerHTML`. A synthetic invalid date containing markup survives both real render functions in a Node DOM stub. CSP permits inline scripts. This is a confirmed unsafe rendering sink, **not a demonstrated repository-to-browser exploit**: ordinary Git author parsing strips angle-delimited name content, and an exploratory malformed raw commit did not establish the chain. No payload executed in a browser. Escape fallback text regardless; do not describe this as confirmed remote code execution or stored XSS without an attainable source and browser proof.
- Scanner subprocess calls have no application-owned timeout/cancellation. Import holds an immediate write transaction while invoking repository validation commands. Sustained stalls, concurrent duplicate insertion, migration contention and memory/descriptor ownership remain unmeasured hypotheses; existing busy timeout and rollback tests are not a concurrency stress test.
- Discovery exclusion filtering happens after the global 1,000 discovered-result cap. Large sets of tracked/hidden matches can consume the cap before later new matches; users receive `truncated`, but there is no continuation API. This is source-supported scale follow-up, not a newly reproduced cap bypass. Existing bounded traversal and hidden/restore persistence tests pass.
- Commit/scan-run retention has no explicit bound; snapshots are capped at 250 per repo. No memory leak is claimed. JSON/binary backup buffers and discovery queues are finite per operation but can be large. No useful resource benchmark was established in this review.
- Architecture docs still describe schema v2 and omit exclusions; security docs still claim Settings restores binary databases despite the later correct offline-restore section. Correct these alongside affected fixes, without rewriting historical evidence.

## Phase coverage 0–16

| Phase | Evidence / disposition |
|---:|---|
| 0 | CLI → scanner → registry/SQLite → HTTP/frontend mapped; schema v3, native runtime and optional gh boundary identified. No applicable repository AGENTS.md found. |
| 1 | Full existing CI-equivalent local baseline passed; seven command groups/logs retained. |
| 2 | Repeated frontend date/escape helpers explain uneven escaping; duplicate CLI/HTTP scan orchestration and schema DDL inspected. No cosmetic refactor justified by itself. |
| 3 | Indexed latest lookups and SQL-limited activity preserved. Twenty-commit shortcut trades correctness for work reduction (R15); do not remove bounds without a continuation plan. |
| 4 | Snapshot retention, commit/run growth, subprocess lifetime, bounded discovery, full backup buffers reviewed; no measured leak or savings claim. |
| 5 | Optional summary/output receipt CLI modes retained. Progressive README/CLI/docs references are adequate. No prompts, model retries/replay, tool registration, child handoff duplication or schema-token surface: N/A. |
| 6 | Stable JSON reports/exit codes and output-file mode inspected; default full output can grow, and raw remotes contaminate artifacts (R12). Existing gates check machine-readable output. |
| 7 | Existing malformed-body/import rollback/scan rollback gates pass. Silent metadata corruption and hidden untracked files are new failure-semantic gaps. Settings multi-key writes are not transactional; no injected failure test performed this pass. |
| 8 | Shell quoting, disabled fsmonitor, local authority/origin, JSON/body bounds, SQL escaping, metadata rendering, static routes, binary backup cleanup and remote export boundaries reviewed. R12; rendering hypothesis scoped above. |
| 9 | Snapshot/import transactions, unique commit identity, deterministic latest ID tiebreak and exclusion transaction preserved. Concurrent same-repo scans/duplicates and long subprocess locks need stress evidence. |
| 10 | CLI schema v1, DB schema v3, app v0.4.0; archive/exclusion distinction, registry-vs-database export and settings contracts inspected. No changes made. |
| 11 | No third-party application package tree; pinned/checksummed CI, weekly Actions Dependabot, latest release and zero alerts checked. Runtime dependency audit excluded. |
| 12 | Full suite passes but misses repository-config interference, valid delimiter-bearing authors, real Git date aggregation and >20-commit activity coverage. Probe captures defective outcomes, not passing product assertions. |
| 13 | Existing Linux/macOS regression gates useful; promote deterministic fixture cases after fixes. No flaky timing gates or arbitrary output budgets proposed. |
| 14 | Active architecture/security claims compared against call sites and schema; specific drift documented above and R12/R15. |
| 15 | CLI summary/output support, clear module map and targeted harnesses support agents; inaccurate health/activity is more important than instruction-size cleanup. |
| 16 | No proven dead-weight deletion. Fixture `.out` files, font/license and archived audits retained. Unused helpers alone do not establish safe removal of exported compatibility functions. |

## Changes implemented and compatibility

Only this report and review evidence were added. No APIs, CLI behavior, formats, schema, configuration, environment variables, dependencies or downstream behavior changed. Phases 17–18 implementation are not applicable in review mode. Existing suite success is a baseline, not a claim these new cases pass.

Future corrections need explicit migration/rescan treatment for persisted dates and secrets. R15 should preserve bounded operations and disclose incomplete data instead of silently dropping required history. No cross-repository change is required for R11–R15. Kujo runtime timeout/streaming primitives can be investigated read-only before proposing an upstream change; no upstream defect is established here.

## Performance and efficiency

No before/after optimization was performed. Baseline elapsed times in JSON describe this run only, not stable benchmarks. New relevant behavioral measurement: production collection returns 20 records vs 27 in the seven-day fixture; this is missing useful data, not a token-efficiency win. No memory, CPU, binary-size, throughput, token-count or savings claim. Existing optional concise CLI receipts should remain available with complete evidence stored separately.

## Remaining work

- **P0:** R11–R13; address secret redaction and status/parser correctness first.
- **P1:** R14–R15 and meaningful regression coverage accompanying fixes.
- **P2:** Correct affected architecture/security documentation; universally escape invalid date fallback text.
- **Needs more evidence:** browser exploit source/chain, discovery continuation at large scale, subprocess cancellation, concurrent writes, long-term resource growth, runtime internals, native Windows.
- **Not worth changing:** cosmetic module churn, dependency replacement (none declared), deleting exported helpers without consumer evidence, arbitrary token/performance budgets.

## Verification receipt

From repository root, with `/Users/robertdevore/.local/share/reporadar/kujo-1.9.0` prepended to PATH:

```sh
for source in src/*.kujo; do kujo check "$source" || exit; done
kujo test --runtime dual
python3 tests/cli_contract_harness.py
python3 tests/server_smoke_harness.py
python3 tests/hardening_harness.py
node tests/frontend_harness.js
for source in static/*.js; do node --check "$source" || exit; done
KUJO_BIN=/Users/robertdevore/.local/share/reporadar/kujo-1.9.0/kujo python3 docs/audits/evidence/2026-11-12/probe.py > docs/audits/evidence/2026-11-12/results.json
gh api 'repos/robertdevore/reporadar/dependabot/alerts?state=open' --jq length
gh api repos/kujolang/kujo/releases/latest --jq .tag_name
git diff --check
```

Baseline PASS; probe execution PASS as evidence collection, with intentionally defective results preserved in [results.json](evidence/2026-11-12/results.json). API checks returned `0` / `v1.9.0`. Whitespace check PASS. The probe does not contact remotes and does not access the live RepoRadar database. No actual credential or browser exploit was tested. Follow-up implementation remains open by mode choice.
