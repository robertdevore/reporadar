# RepoRadar Documentation

For the top-level project overview and quick start, see [`../README.md`](../README.md).

🔭 **RepoRadar** is a Kujo-powered local-first dashboard for tracking repo status, activity, branches, commits, and uncommitted work across your entire local development ecosystem.

## One-Liner

A local Git command center that shows at-a-glance visibility across all your local repos.

## Features

- **Repo Registry** — Add, edit, and remove tracked repos
- **Dashboard** — Sort, filter, and search all repos with status indicators and summary counts
- **Activity View** — Commit counts over configurable time windows
- **Repo Detail** — Per-repo file changes, recent commits, scan history
- **Discovery** — Find repos under parent directories
- **Bulk Scanning** — Scan all tracked repos at once
- **Export/Import** — Portable JSON registry format
- **Agent CLI** — Structured health reports, filters, priorities, and automation exit codes
- **Settings** — Configurable thresholds and defaults

## Quick Start

```bash
# Install Kujo (v1.0.0+)
# Clone or navigate to the reporadar directory

# Start the server
kujo run src/main.kujo serve 8080

# Or use CLI commands
kujo run src/main.kujo add /path/to/your/repo
kujo run src/main.kujo scan 1
kujo run src/main.kujo list
kujo run src/main.kujo review --scan --json
```

Open `http://127.0.0.1:8080` in your browser.

## Requirements

- Kujo programming language v1.0.0+
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
