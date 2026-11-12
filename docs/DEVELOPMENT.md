# Development

## Project Structure

```
reporadar/
  README.md         # Top-level project overview
  LICENSE           # MIT license
  kujo.toml         # Project configuration
  .github/           # Continuous integration
  src/
    main.kujo         # CLI entry point
    server.kujo       # HTTP server + API routes
    db.kujo           # Database layer (SQLite)
    scanner.kujo      # Git scanner
    registry.kujo     # Repo registry CRUD
    health_report.kujo # Stable human and JSON health model
    version.kujo      # Canonical application version
  static/
    index.html        # Main dashboard
    app.js            # Dashboard frontend
    style.css         # Dark theme styles
    detail.html       # Repo detail page
    detail.js
    activity.html     # Activity view
    activity.js
    discovery.html    # Discovery page
    discovery.js
    settings.html     # Settings page
    settings.js
  tests/              # Kujo suites and contract/smoke harnesses
  docs/               # Documentation
  agent/              # Handoff and session planning notes
```

## Running

```bash
# Check all source files
for source in src/*.kujo; do kujo check "$source"; done

# Start the server (foreground)
kujo run src/main.kujo serve 8080

# CLI commands
kujo run src/main.kujo help
kujo run src/main.kujo add /path/to/repo
kujo run src/main.kujo list
kujo run src/main.kujo scan <id>
kujo run src/main.kujo scan-all
kujo run src/main.kujo review --scan --json
kujo run src/main.kujo doctor --json
kujo run src/main.kujo version --json
```

See [CLI and Agent Integration](CLI.md) for the JSON schema, filters, and exit-code contract.

## Kujo Conventions

- Use `export func` for all function declarations (required for cross-module visibility)
- Use `mut` for mutable bindings (Kujo's `let` is deeply immutable)
- Use `from src.module import func` for cross-module imports
- No multi-line strings — use single-line concatenation
- `try/except err` requires a variable name after `except`
- `http_listen("127.0.0.1", port)` binds to localhost only

## API Endpoints

- `GET /api/repos` — List all repos with latest status
- `POST /api/repos` — Add a repo
- `DELETE /api/repos/:id` — Remove a repo
- `PUT /api/repos/:id` — Update repo metadata
- `POST /api/repos/:id/scan` — Scan a single repo
- `GET /api/repos/:id` — Repo detail
- `GET /api/dashboard/summary` — Summary counts
- `GET /api/activity?days=7` — Activity data
- `POST /api/scan/bulk` — Bulk scan all repos
- `POST /api/discover` — Discover repos under directory
- `POST /api/repos/bulk-add` — Bulk add repos
- `GET /api/settings` — Get settings
- `PUT /api/settings` — Update settings
- `GET /api/export` — Export JSON
- `POST /api/import` — Import JSON
- `GET /api/export/db` — Download database backup

Mutation endpoints enforce exact same-origin browser requests, JSON media types where applicable, a 1 MiB request-body limit, and bounded collection sizes. Origin-less local clients remain supported for CLI and agent tooling.

## Discovery exclusions

`GET /api/discovery/exclusions` lists hidden paths. `PUT` accepts `{ "action": "exclude" | "restore", "paths": ["/absolute/path"] }`, up to 1,000 paths per request. Updates are atomic and enforce the standard localhost/JSON mutation policy. Schema v3 adds `discovery_exclusions`; existing registries migrate automatically. Hidden paths are persisted separately from tracked/archived repositories and never delete files. Full SQLite backups include them; registry-only JSON exports do not. Discovery counts distinguish new, already tracked (including archived), and hidden results.

### Metadata and activity (schema v4)

All production scan entrypoints use `scan_and_store`: Git inspection completes before one transaction publishes the snapshot and replaces the reachable-HEAD commit cache. History collection reads at most 10,001 records, retaining 10,000 and using the extra record to detect truncation. Shallow clones are also incomplete. `GET /api/activity` adds `history_complete` and `incomplete_repos`; repo objects and CLI reports add `history_complete`/`history_error`, and CLI summaries add `history_incomplete`. The activity page displays a partial-history notice. These fields describe the last scan, not a live Git watcher. Detail pages still show only 20 commits; that display limit no longer limits collection.

Refreshing the reachable-HEAD cache removes commits no longer reachable after branch switches or history rewrites and repairs delimiter-corrupted cached author/message fields. If collection or persistence fails, the cache is not partially replaced. A failed collection is recorded as a scan error/incomplete history; a persistence failure rolls back the snapshot and history together. HEAD movement between inspection and collection is rejected for retry.

New Git records use five NUL-delimited fields and strict ISO author timestamps. Persistence normalizes valid dates to UTC `YYYY-MM-DDTHH:MM:SSZ`; indexed comparisons and daily grouping use the same UTC basis. Schema v4 normalizes existing dates, redacts URL userinfo in every retained snapshot, and marks existing history incomplete until rescanned. Invalid legacy dates become empty and are excluded from activity; old historical author/message values cannot be reconstructed by a format migration alone. A fresh scan replaces the commit cache and creates corrected latest metadata. Registry metadata and discovery exclusions are preserved. Existing exported files are not rewritten.
