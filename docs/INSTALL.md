# Installation

## Prerequisites

- **Ruff v1.0.0+** — The Ruff programming language runtime
- **Git** — Must be installed and accessible in your PATH
- **macOS, Linux, or WSL** — Any Unix-like environment

## Install Ruff

Build from source or use a pre-built binary:

```bash
# From the Ruff project directory
cd /path/to/ruff
cargo build --release
# Binary is at target/release/ruff
```

Add the Ruff binary to your PATH, or use the full path when running commands.

## Install RepoRadar

```bash
# Clone or copy the reporadar directory
cd /path/to/reporadar

# Verify Ruff is available
ruff --version

# Start the server
ruff run src/main.ruff serve 8080
```

## Configuration

RepoRadar stores its database at `~/.reporadar.db` by default. Override with:

```bash
export REPORADAR_DB=/custom/path/reporadar.db
```

All settings are stored in the database and configurable via the Settings page in the dashboard.
