# RepoRadar

RepoRadar is a local-first Git repository dashboard built in the Kujo programming language. It gives teams and solo developers a fast, polished view of local repositories while keeping default operation on the local machine.

Current release: **v0.4.0**

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

## Requirements

- **Kujo v1.0.0+** — The Kujo language runtime
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

# Discover Git repositories under a parent directory
kujo run src/main.kujo discover /path/to/parent

# Export the registry to JSON
kujo run src/main.kujo export
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
  README.md
  kujo.toml
  src/        # Kujo application code
  static/     # Browser UI assets
  tests/      # Scanner, registry, and integration tests
  docs/       # Longer-form docs and operational guidance
  agent/      # Handoff, review, and planning notes
```

The distributable project root is intentionally small. Prompt packs, handoff notes, and future-session planning live under `agent/` so the root stays focused on files a new user expects first.

## Testing

Run the full suite from the project root:

```bash
kujo test
```

## Security model

- Binds to `127.0.0.1` only
- Limits browser CORS reflection to localhost origins
- Sends defensive browser headers for content type sniffing, referrer leakage, and framing
- Uses read-only Git inspection commands
- Avoids telemetry, analytics, and remote data upload
- Keeps secrets and repo metadata in local SQLite storage
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

## Troubleshooting

- If `kujo` is not found, use the full path to the Kujo binary you built locally.
- If the server will not start, confirm that port `8080` is available or pass a different port.
- If the database path is wrong, confirm `REPORADAR_DB` is set before launching the app.
- If a repo does not appear, verify it is a valid Git repository and that the path is readable.

## Status

The project is useful and increasingly polished, but not yet "enterprise complete" in the universal sense. The next hardening pass should focus on CI, broader platform testing, auth/threat-model decisions for non-local deployments, and measured scan performance. See `docs/NEXT_SESSION_ENTERPRISE_REVIEW_2026-06-20.md` for the newest follow-up list.
