# Next Enterprise Review — 2026-08-25

This is the prioritized follow-up list from the August 25 security, performance, reliability, and presentation review. The current application is hardened for its documented single-user, localhost-only scope; the items below are the remaining work needed before claiming broader enterprise deployment readiness.

## Priority 1 — Deployment boundary

- Decide whether RepoRadar will remain a single-user localhost application. If non-local or multi-user deployment becomes a goal, add authentication, authorization, TLS termination guidance, CSRF tokens, and an explicit trust model before exposing the server.
- Add a per-launch capability token or Unix-domain-socket mode for operators who need stronger protection from other local processes.
- Publish a root `SECURITY.md` with supported-version and private-reporting instructions once a disclosure channel is selected.
- Add uniform malformed-JSON error handling and fuzz cases once Kujo exposes catchable JSON parse failures in HTTP handlers.

## Priority 2 — Performance evidence

- Add repeatable benchmarks for registries with 30, 100, and 500 repositories and publish latency and memory baselines.
- Profile dashboard and activity queries with `EXPLAIN QUERY PLAN` against realistic history volumes.
- Design a bounded scan queue with configurable concurrency, cancellation, timeouts, and per-repository progress for large ecosystems.
- Make discovery limits configurable while preserving safe defaults and expose truncation metadata to CLI and API callers.

## Priority 3 — Agent and operator ergonomics

- Add `--output <path>` and compact/pretty controls for JSON-producing CLI commands.
- Add import validation and `--dry-run` support to preview changes before registry restoration.
- Add a machine-readable capabilities command so agents can negotiate supported schema versions and commands.
- Decide whether Windows is supported natively; otherwise make Unix/WSL support explicit in packaging and release artifacts.

## Priority 4 — Presentation and release engineering

- Add checked-in screenshots or a short terminal/dashboard demo to the README.
- Remove remaining inline browser handlers and styles so the Content Security Policy can drop `'unsafe-inline'`.
- Add automated release packaging, checksum publication, changelog validation, and a clean-install smoke test.
- Verify the new Linux/macOS CI workflow on GitHub and add branch protection once the checks are stable.

## Exit criteria for the next pass

- Benchmarks have reproducible commands and stored baselines.
- Any broadened deployment mode has a written threat model and automated authorization tests.
- CLI additions preserve JSON-only stdout and documented exit codes.
- All Kujo tests, CLI contract tests, server smoke tests, JavaScript checks, and CI jobs pass without regression.
