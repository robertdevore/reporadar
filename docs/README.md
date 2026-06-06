# RepoRadar

🔭 **RepoRadar** is a Ruff-powered local-first dashboard for tracking repo status, activity, branches, commits, and uncommitted work across your entire local development ecosystem.

## One-Liner

A local Git command center that shows at-a-glance visibility across all your local repos.

## Features

- **Repo Registry** — Add, edit, and remove tracked repos
- **Dashboard** — Sort, filter, and search all repos with status indicators
- **Activity View** — Commit counts over configurable time windows
- **Repo Detail** — Per-repo file changes, recent commits, scan history
- **Discovery** — Find repos under parent directories
- **Bulk Scanning** — Scan all tracked repos at once
- **Export/Import** — Portable JSON registry format
- **Settings** — Configurable thresholds and defaults

## Quick Start

```bash
# Install Ruff (v1.0.0+)
# Clone or navigate to the reporadar directory

# Start the server
ruff run src/main.ruff serve 8080

# Or use CLI commands
ruff run src/main.ruff add /path/to/your/repo
ruff run src/main.ruff scan 1
ruff run src/main.ruff list
```

Open `http://127.0.0.1:8080` in your browser.

## Requirements

- Ruff programming language v1.0.0+
- Git installed and accessible in PATH
- Modern web browser

## Architecture

See [ARCHITECTURE.md](docs/ARCHITECTURE.md) for details.

## Security

RepoRadar is **local-first** and **read-only by default**. No data leaves your machine. See [SECURITY.md](docs/SECURITY.md).

## Documentation

- [Installation](docs/INSTALL.md)
- [Development](docs/DEVELOPMENT.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Security](docs/SECURITY.md)
- [Testing](docs/TESTING.md)
- [Roadmap](docs/ROADMAP.md)
- [Changelog](docs/CHANGELOG.md)

## License

MIT
