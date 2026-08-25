# Next Session Enterprise Review List - 2026-06-20 (Historical)

This follow-up list comes from the RepoRadar enterprise-readiness review and hardening pass completed on June 20, 2026.

## Priority 1 - Release Confidence

- Add CI that runs the full Kujo test suite on every push and pull request.
- Add a smoke script that starts the server on an ephemeral port, checks key API routes, verifies security headers, and exits cleanly.
- Replace the remaining integration-test reliance on the repository under test with an isolated temporary Git fixture once Kujo fixture helpers are available.
- Create a release checklist that verifies README commands, docs links, database migration behavior, export/import compatibility, and static asset serving.

## Priority 2 - Security Hardening

- Decide the long-term policy for non-local deployments before adding host binding beyond `127.0.0.1`.
- Add request-size limits or import-size validation for JSON import and bulk-add APIs.
- Add malformed JSON tests for all write endpoints once Kujo exposes parse failure handling ergonomics.
- Revisit the future write-action roadmap with explicit confirmations, command previews, audit logs, rollback guidance, and threat-model documentation before enabling write endpoints.

## Priority 3 - Performance and Scale

- Benchmark bulk scans with 30, 100, and 500 repositories and record scan duration per repo.
- Surface slow scans and stale scan data in the dashboard so large registries can be maintained deliberately.
- Make scan-history retention configurable after real-world usage confirms the right default.
- Review dashboard and activity SQL with `EXPLAIN QUERY PLAN` against larger fixture databases.

## Priority 4 - Product Completeness

- Add import dry-run output so users can preview duplicates, missing paths, and invalid repos before applying an import.
- Add saved view presets if shareable URLs prove useful in real usage.
- Add a first-run sample workflow or screenshots once the UI settles.
- Improve empty and error states across detail, discovery, activity, and settings pages.

## Priority 5 - Kujo Showcase Quality

- Add an architecture diagram showing Kujo CLI, HTTP server, SQLite, scanner, and static frontend boundaries.
- Expand docs with a "Why this is a good Kujo example" section that highlights CLI routing, HTTP APIs, SQLite migrations, filesystem scanning, shell-safe Git execution, static frontend serving, and tests.
- Keep the root clean with application code under `src/`, browser assets under `static/`, tests under `tests/`, docs under `docs/`, and working-agent notes under `agent/`.
- Avoid adding nonessential dependencies; each dependency should improve the product and demonstrate a clear Kujo ecosystem value.

## First Actions Next Session

1. Run `git status --short --branch` and confirm `main` is clean after the pushed commits.
2. Run `/Users/robertdevore/2026/Kujolang/kujo-repos/kujo/target/release/kujo test`.
3. Start with CI and a server smoke script because they unlock safer future hardening.
