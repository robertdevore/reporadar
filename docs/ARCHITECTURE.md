# Architecture

## Overview

RepoRadar is a **local-first** Git repository dashboard built in the **Kujo programming language**. It consists of:

1. **Kujo Backend** — CLI + HTTP server + Git scanner + SQLite storage
2. **Static Frontend** — HTML/CSS/JS served by Kujo's built-in HTTP server
3. **SQLite Database** — Local storage at `~/.reporadar.db`

`version.kujo` is the single source for the application version used by CLI and HTTP responses. `health_report.kujo` owns the normalized human/agent status contract.

## Component Diagram

```
┌─────────────────────────────────────────────────┐
│                    Browser                       │
│  Dashboard │ Detail │ Activity │ Discovery │     │
│              Settings │ Export/Import            │
└──────────────────┬──────────────────────────────┘
                   │ HTTP (JSON API)
┌──────────────────▼──────────────────────────────┐
│              Kujo HTTP Server                    │
│         (http_listen on 127.0.0.1)              │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │  server  │  │ scanner  │  │   registry   │  │
│  │  .kujo   │  │  .kujo   │  │    .kujo     │  │
│  └────┬─────┘  └────┬─────┘  └──────┬───────┘  │
│       │              │               │          │
│  ┌────▼──────────────▼───────────────▼───────┐  │
│  │              db.kujo (SQLite)             │  │
│  └──────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────┐
│                  Git (subprocess)                │
│     git status, git log, git rev-parse, ...      │
└─────────────────────────────────────────────────┘
```

## Data Flow

1. User adds repo via CLI or API → validated as Git repo → stored in `repos` table
2. Scan triggered → `scanner.kujo` runs safe Git commands → parses output → stored in `repo_status_snapshots`
3. Dashboard loads → API returns joined query of repos + latest snapshot → frontend renders
4. Scan → bounded reachable-HEAD history collection → snapshot and commit-cache replacement in one transaction → activity queries the UTC cache with explicit completeness metadata. Detail display remains limited to 20 commits.

## Database Schema

- `repos` — Tracked repositories with metadata
- `repo_status_snapshots` — Per-scan status results
- `repo_file_changes` — File-level changes per scan
- `repo_commits` — Collected commit records
- `scan_runs` — Bulk scan logs
- `settings` — Key-value configuration
- `discovery_exclusions` — Persisted hidden discovery paths
- `schema_version` — Migration tracking

Database initialization enables foreign keys, a five-second busy timeout, WAL mode, and normal synchronous durability. Schema v4 adds history completeness metadata and migrates retained timestamps/remotes. Existing latest-snapshot/date indexes and unique commit identity remain. See DEVELOPMENT.md for cache, migration and history-limit contracts.

## Safe Git Commands Used

All Git operations use safe, read-only subcommands prefixed by `GIT_OPTIONAL_LOCKS=0 git -c core.fsmonitor=false -C <validated-path>`:
- `git rev-parse --is-inside-work-tree`
- `git rev-parse --show-toplevel`
- `git branch --show-current`
- `git status --porcelain=v1 --branch --untracked-files=all --ignore-submodules=none`
- `git log --pretty=format:...`
- `git remote get-url origin`
- `git rev-parse --abbrev-ref --symbolic-full-name @{u}`
- `git rev-list --left-right --count HEAD...@{u}`

## Security Model

- Server binds to `127.0.0.1` only (no network exposure)
- Read-only Git commands only (no destructive operations)
- SQL injection mitigated via the shared `escape_sql(...)` helper
- No telemetry, analytics, or data upload
- Frontend served locally; no CDN dependencies
- Mutating browser requests require an exact same origin and JSON media type where applicable
- HTTP bodies, bulk collections, and recursive discovery are bounded
- Origin-less localhost clients remain supported for terminal and agent automation
