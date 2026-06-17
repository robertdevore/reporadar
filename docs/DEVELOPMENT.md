# Development

## Project Structure

```
reporadar/
  README.md         # Top-level project overview
  kujo.toml           # Project configuration
  src/
    main.kujo         # CLI entry point
    server.kujo       # HTTP server + API routes
    db.kujo           # Database layer (SQLite)
    scanner.kujo      # Git scanner
    registry.kujo     # Repo registry CRUD
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
  tests/              # Test suites
  docs/               # Documentation
  agent/              # Handoff and session planning notes
```

## Running

```bash
# Check all source files
kujo check src/*.kujo

# Start the server (foreground)
kujo run src/main.kujo serve 8080

# CLI commands
kujo run src/main.kujo help
kujo run src/main.kujo add /path/to/repo
kujo run src/main.kujo list
kujo run src/main.kujo scan <id>
kujo run src/main.kujo scan-all
```

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
