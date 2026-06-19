# Next Session Enterprise Review List — 2026-06-19

This follow-up list comes from the RepoRadar enterprise-readiness review and hardening pass completed on June 19, 2026.

## Priority 1 — Release Confidence

- Add CI that runs `kujo test` on every push and pull request.
- Replace absolute integration-test paths with a temporary Git fixture so tests are portable across machines and CI.
- Add a smoke script that starts the server on an ephemeral port, checks key API routes, and exits cleanly.
- Create a release checklist that verifies README commands, docs links, database migration behavior, and export/import compatibility.

## Priority 2 — Security Hardening

- Decide the long-term policy for browser origins and cross-origin requests before supporting anything beyond localhost.
- Add tests for optional Dependabot enrichment staying disabled by default and returning `-1` without `gh` access.
- Document the threat model for local browser apps, including malicious websites trying to reach localhost services.
- Revisit the future write-action roadmap with explicit confirmation, audit logs, command previews, and rollback guidance before enabling write endpoints.

## Priority 3 — Performance and Scale

- Benchmark bulk scans with 30, 100, and 500 repositories to identify real bottlenecks.
- Cache or rate-limit optional remote enrichment so GitHub API calls cannot dominate scan time.
- Consider storing scan duration per repo and surfacing slow repositories in the UI.
- Review dashboard SQL with `EXPLAIN QUERY PLAN` once larger real-world datasets exist.

## Priority 4 — Product Completeness

- Add portable onboarding screenshots or a short demo workflow once the UI stabilizes.
- Improve empty states and error states on dashboard, detail, discovery, activity, and settings pages.
- Add import dry-run output so users can preview duplicates and invalid paths before applying an import.
- Add filter presets or saved views if shareable URLs prove useful in real usage.

## Priority 5 — Kujo Showcase Quality

- Keep the code organized around `src/`, `static/`, `tests/`, `docs/`, and local `agent/` notes so RepoRadar remains easy to study as a Kujo example.
- Add an architecture diagram showing Kujo CLI, HTTP server, SQLite, scanner, and static frontend boundaries.
- Expand docs with a "Why this is a good Kujo example" section that highlights CLI, HTTP, SQLite, filesystem, and testing capabilities.
- Avoid adding nonessential dependencies; each new dependency should demonstrate clear product or Kujo ecosystem value.

## First Actions Next Session

1. Run `git status --short --branch` and confirm the pushed branch is clean.
2. Run `/Users/robertdevore/2026/Kujolang/kujo-repos/kujo/target/release/kujo test`.
3. Start with portable test fixtures and CI because those unlock safer future hardening.
