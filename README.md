# RepoRadar

RepoRadar is a local-first Git repository dashboard built in the Ruff programming language. It gives teams and solo developers a fast, polished view of local repositories without sending data off the machine.

## Why it exists

- Give one place to inspect the state of every local repo
- Keep Git inspection read-only and safe by default
- Demonstrate a complete Ruff application with CLI, HTTP, SQLite, and static frontend layers working together

## What it does

- Tracks repository health, branch divergence, and latest commit data
- Shows file-level changes, recent commits, and activity trends
- Supports add, remove, pin, archive, discovery, scan, export, and restore workflows
- Serves dashboard, detail, activity, discovery, and settings views
- Stores everything locally in SQLite with no telemetry or cloud dependency

## Requirements

- **Ruff v1.0.0+** — The Ruff language runtime
- **Git** — Must be installed and available on `PATH`
- **macOS, Linux, or WSL** — Any Unix-like environment is supported

If you have a Ruff binary already built locally, point your shell at it or use the full path directly.

## Quick start

```bash
ruff --version
ruff run src/main.ruff serve 8080
```

Then open `http://127.0.0.1:8080`.

## Common workflows

```bash
# Add a repository
ruff run src/main.ruff add /path/to/repo

# List tracked repositories
ruff run src/main.ruff list

# Scan one tracked repository by ID
ruff run src/main.ruff scan 1

# Scan all tracked repositories
ruff run src/main.ruff scan-all

# Discover Git repositories under a parent directory
ruff run src/main.ruff discover /path/to/parent

# Export the registry to JSON
ruff run src/main.ruff export
```

## Configuration

- Database path: `~/.reporadar.db`
- Override the database location with `REPORADAR_DB`

```bash
export REPORADAR_DB=/custom/path/reporadar.db
```

All runtime settings are stored locally in SQLite and can be managed from the Settings page.

## Repository layout

```text
reporadar/
  README.md
  ruff.toml
  src/        # Ruff application code
  static/     # Browser UI assets
  tests/      # Scanner, registry, and integration tests
  docs/       # Longer-form docs and operational guidance
  agent/      # Handoff, review, and planning notes
```

## Testing

Run the full suite from the project root:

```bash
ruff test tests/
```

Run a single suite when iterating:

```bash
ruff test tests/test_scanner.ruff
ruff test tests/test_registry.ruff
ruff test tests/test_integration.ruff
```

## Security model

- Binds to `127.0.0.1` only
- Uses read-only Git inspection commands
- Avoids telemetry, analytics, and remote data upload
- Keeps secrets and repo metadata in local SQLite storage
- Escapes SQL and shell-sensitive values in the scan and persistence paths

## Documentation

- [Installation](docs/INSTALL.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Development](docs/DEVELOPMENT.md)
- [Security](docs/SECURITY.md)
- [Testing](docs/TESTING.md)
- [Roadmap](docs/ROADMAP.md)
- [Changelog](docs/CHANGELOG.md)

## Troubleshooting

- If `ruff` is not found, use the full path to the Ruff binary you built locally.
- If the server will not start, confirm that port `8080` is available or pass a different port.
- If the database path is wrong, confirm `REPORADAR_DB` is set before launching the app.
- If a repo does not appear, verify it is a valid Git repository and that the path is readable.

## Status

The project is actively maintained and organized for continued hardening, feature work, and onboarding improvements. See `agent/NEXT_SESSION.md` for the current follow-up list.
