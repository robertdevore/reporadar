# RepoRadar

RepoRadar is a local-first Git repository dashboard built in the Kujo programming language. It gives teams and solo developers a fast, polished view of local repositories while keeping default operation on the local machine.

Current release: **v0.5.0**

## Why it exists

- Give one place to inspect the state of every local repo
- Keep Git inspection read-only and safe by default
- Demonstrate a complete Kujo application with CLI, HTTP, SQLite, and static frontend layers working together

## What it does

- Tracks repository health, branch divergence, and latest commit data
- Shows file-level changes, recent commits, and activity trends
- Supports add, remove, pin, archive, discovery, scan, export, and restore workflows
- Preserves shareable dashboard views with status, group, tag, search, and sort URL parameters
- Keeps scan history bounded so long-running registries stay responsive
- Optionally shows GitHub Dependabot alert counts when explicitly enabled and authenticated through `gh`
- Serves dashboard, detail, activity, discovery, and settings views
- Stores everything locally in SQLite with no telemetry or cloud dependency
- Provides agent-friendly JSON health reports, attention filters, and automation exit codes
- Provides `doctor` and `version` commands for environment discovery and agent preflight checks

## Requirements

- **Kujo v1.9.0** — The Kujo language runtime
- **Git** — Must be installed and available on `PATH`
- **macOS, Linux, or WSL** — Any Unix-like environment is supported

If you have a Kujo binary already built locally, point your shell at it or use the full path directly.

## Quick start

```bash
kujo --version
kujo run src/main.kujo serve 8080
```

Then open `http://127.0.0.1:8080`.

## Common workflows

```bash
# Add a repository
kujo run src/main.kujo add /path/to/repo

# List tracked repositories
kujo run src/main.kujo list

# Scan one tracked repository by ID
kujo run src/main.kujo scan 1

# Scan all tracked repositories
kujo run src/main.kujo scan-all

# Run an agent-oriented ecosystem review with a fresh scan
kujo run src/main.kujo review --scan --json

# Discover Git repositories under a parent directory
kujo run src/main.kujo discover /path/to/parent

# Export the registry to JSON
kujo run src/main.kujo export

# Verify the local runtime, database, and registry
kujo run src/main.kujo doctor --json
```

## Configuration

- Database path: `~/.reporadar.db`
- Override the database location with `REPORADAR_DB`
- Dependabot alert enrichment is disabled by default. Enable it from Settings only when you want RepoRadar to call the GitHub CLI for GitHub remotes.

```bash
export REPORADAR_DB=/custom/path/reporadar.db
```

All runtime settings are stored locally in SQLite and can be managed from the Settings page.

## Repository layout

```text
reporadar/
  .github/    # Linux and macOS CI
  LICENSE
  README.md
  kujo.toml
  src/        # Kujo application code
  static/     # Browser UI assets
  tests/      # Kujo suites and Python contract/smoke harnesses
  docs/       # Longer-form docs and operational guidance
  agent/      # Handoff, review, and planning notes
```

The distributable root is intentionally small. Historical reviews live under `docs/archive/`, current follow-up reviews under `docs/reviews/`, and application code under `src/`.

## Testing

Run the full suite from the project root:

```bash
kujo test --runtime dual
python3 tests/cli_contract_harness.py
python3 tests/server_smoke_harness.py
python3 tests/hardening_harness.py
node tests/frontend_harness.js

# Static checks
for source in src/*.kujo; do kujo check "$source"; done
for source in static/*.js; do node --check "$source"; done
```

## Security model

- Binds to `127.0.0.1` only
- Requires exact same-origin browser mutation requests and JSON media types
- Caps request bodies, bulk collections, and recursive discovery work
- Sends defensive browser headers for content type sniffing, referrer leakage, framing, and browser permissions
- Uses read-only Git inspection commands with Git filesystem monitors disabled
- Avoids telemetry, analytics, and remote data upload
- Keeps repo metadata in local SQLite storage with foreign keys, WAL, a busy timeout, migrations, and query indexes
- Escapes SQL and shell-sensitive values in the scan and persistence paths
- Rejects static path traversal attempts before serving browser assets
- Keeps remote security enrichment opt-in; Dependabot alert checks require the user to enable them and authenticate `gh`

## Documentation

- [Installation](docs/INSTALL.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Development](docs/DEVELOPMENT.md)
- [Security](docs/SECURITY.md)
- [Testing](docs/TESTING.md)
- [Roadmap](docs/ROADMAP.md)
- [Changelog](docs/CHANGELOG.md)
- [CLI and agent integration](docs/CLI.md)

## Troubleshooting

- If `kujo` is not found, use the full path to the Kujo binary you built locally.
- If the server will not start, confirm that port `8080` is available or pass a different port.
- If the database path is wrong, confirm `REPORADAR_DB` is set before launching the app.
- If a repo does not appear, verify it is a valid Git repository and that the path is readable.

## Status

RepoRadar is production-ready for its documented scope: a single trusted user operating a localhost-only dashboard or CLI on macOS, Linux, or WSL. It is not a multi-user service and should not be exposed to a network without authentication, authorization, TLS, and a deployment-specific threat model.

This repository intentionally serves as a substantial Kujo example: one codebase exercises CLI contracts, HTTP routing, JSON APIs, SQLite migrations, subprocess isolation, filesystem discovery, browser UI, and cross-runtime tests. The [next enterprise review](docs/reviews/NEXT_SESSION_ENTERPRISE_REVIEW_2026-08-25.md) tracks the evidence and controls still required for broader deployment claims.

## License

[MIT](LICENSE) © Robert DeVore
