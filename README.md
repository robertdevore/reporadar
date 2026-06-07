# RepoRadar

RepoRadar is a local-first Git repository dashboard built to give a fast, polished view of the repositories on your machine.
It tracks repository health, branch divergence, recent commits, file-level changes, and activity trends through a Ruff-based CLI plus a browser UI.

## Why it exists

- Give developers a single place to see the state of every local repo.
- Stay local-only by default so repo metadata never leaves the machine.
- Showcase a clean, full-stack Ruff project with CLI, HTTP, SQLite, and static frontend pieces working together.

## Highlights

- Repo registry with add, edit, remove, pin, archive, and discover flows
- Read-only Git scanning for branch, remote, ahead/behind, and latest commit data
- Dashboard, detail, activity, discovery, and settings views
- Dashboard summary counts for clean, dirty, ahead, behind, diverged, no-remote, errors, and stale repos
- JSON export/import plus database backup and restore
- Safe-by-default design with no telemetry and localhost-only server binding

## Project layout

```text
reporadar/
  README.md
  ruff.toml
  src/        # Ruff application code
  static/     # Browser UI assets
  tests/      # Scanner, registry, and integration tests
  docs/       # Longer-form docs and roadmaps
  agent/      # Handoff, review, and planning notes
```

## Quick start

```bash
ruff run src/main.ruff serve 8080
```

Then open `http://127.0.0.1:8080`.

Common CLI commands:

```bash
ruff run src/main.ruff add /path/to/repo
ruff run src/main.ruff list
ruff run src/main.ruff scan 1
ruff run src/main.ruff scan-all
ruff run src/main.ruff discover /path/to/parent
ruff run src/main.ruff export
```

## Testing

Run the test suites from the project root:

```bash
ruff test tests/
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Installation](docs/INSTALL.md)
- [Development](docs/DEVELOPMENT.md)
- [Security](docs/SECURITY.md)
- [Testing](docs/TESTING.md)
- [Roadmap](docs/ROADMAP.md)
- [Changelog](docs/CHANGELOG.md)

## Security posture

RepoRadar is intentionally local-first and read-only by default.
Git access is limited to safe inspection commands, and the server binds to `127.0.0.1` only.

## Status

The codebase is structured for continued hardening and polish, with the next work items captured in `agent/NEXT_SESSION.md`.
