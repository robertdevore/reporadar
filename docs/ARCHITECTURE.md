# Architecture

## Overview

RepoRadar is a **local-first** Git repository dashboard built in the **Ruff programming language**. It consists of:

1. **Ruff Backend** — CLI + HTTP server + Git scanner + SQLite storage
2. **Static Frontend** — HTML/CSS/JS served by Ruff's built-in HTTP server
3. **SQLite Database** — Local storage at `~/.reporadar.db`

## Component Diagram

```
┌─────────────────────────────────────────────────┐
│                    Browser                       │
│  Dashboard │ Detail │ Activity │ Discovery │     │
│              Settings │ Export/Import            │
└──────────────────┬──────────────────────────────┘
                   │ HTTP (JSON API)
┌──────────────────▼──────────────────────────────┐
│              Ruff HTTP Server                    │
│         (http_listen on 127.0.0.1)              │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │  server  │  │ scanner  │  │   registry   │  │
│  │  .ruff   │  │  .ruff   │  │    .ruff     │  │
│  └────┬─────┘  └────┬─────┘  └──────┬───────┘  │
│       │              │               │          │
│  ┌────▼──────────────▼───────────────▼───────┐  │
│  │              db.ruff (SQLite)             │  │
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
2. Scan triggered → `scanner.ruff` runs safe Git commands → parses output → stored in `repo_status_snapshots`
3. Dashboard loads → API returns joined query of repos + latest snapshot → frontend renders
4. Activity view → `git log --since` collects commits → stored in `repo_commits` → queried by time window

## Database Schema

- `repos` — Tracked repositories with metadata
- `repo_status_snapshots` — Per-scan status results
- `repo_file_changes` — File-level changes per scan
- `repo_commits` — Collected commit records
- `scan_runs` — Bulk scan logs
- `settings` — Key-value configuration
- `schema_version` — Migration tracking

## Safe Git Commands Used

All Git operations use safe, read-only subcommands:
- `git rev-parse --is-inside-work-tree`
- `git rev-parse --show-toplevel`
- `git branch --show-current`
- `git status --porcelain=v1 --branch`
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
