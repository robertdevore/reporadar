# Installation

## Prerequisites

- **Kujo v1.0.0+** — The Kujo programming language runtime
- **Git** — Must be installed and accessible in your PATH
- **macOS, Linux, or WSL** — Any Unix-like environment

## Install Kujo

Build from source or use a pre-built binary:

```bash
# From the Kujo project directory
cd /path/to/kujo
cargo build --release
# Binary is at target/release/kujo
```

Add the Kujo binary to your PATH, or use the full path when running commands.

## Install RepoRadar

```bash
# Clone or copy the reporadar directory
cd /path/to/reporadar

# Verify Kujo is available
kujo --version

# Start the server
kujo run src/main.kujo serve 8080

# Verify Git, SQLite schema, and registry access
kujo run src/main.kujo doctor
```

## Configuration

RepoRadar stores its database at `~/.reporadar.db` by default. Override with:

```bash
export REPORADAR_DB=/custom/path/reporadar.db
```

All settings are stored in the database and configurable via the Settings page in the dashboard.
