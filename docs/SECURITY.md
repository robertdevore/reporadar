# Security

## Design Principles

RepoRadar is designed with security as a first-class concern:

1. **Local-first** — All data stays on your machine
2. **Read-only by default** — No destructive Git operations
3. **No network exposure** — Server binds to `127.0.0.1` only
4. **No telemetry** — Zero data collection or phoning home
5. **Minimal dependencies** — Only Ruff runtime and Git

## Server Binding

The HTTP server explicitly binds to `127.0.0.1` using `http_listen("127.0.0.1", port)`. This means:
- Only accessible from the local machine
- Not exposed to the local network or internet
- No TLS needed (localhost-only)

## Git Commands

All Git operations use safe, read-only subcommands:
- No `git commit`, `git push`, `git pull`, `git reset`, `git rebase`, `git stash`, `git checkout`, `git merge`
- Commands are executed with validated paths
- Output is parsed defensively; malformed output is handled gracefully

When write actions (Phase 07) are implemented:
- They are **disabled by default** via settings toggle
- Each action requires explicit user confirmation
- The exact command is displayed before execution
- Failed commands show output without bricking the UI
- All write actions are logged to an audit trail

## Input Validation

- Repo paths are validated to exist and be directories
- Git repo validation via `git rev-parse --is-inside-work-tree`
- SQL values are escaped via `replace_str(value, "'", "''")`
- JSON import validates structure before processing
- Path traversal is prevented by filesystem API design

## Data Storage

- SQLite database at `~/.reporadar.db` (configurable via `REPORADAR_DB`)
- No credentials or tokens stored
- Commit messages and repo paths are the most sensitive data stored
- Database can be backed up and restored via Settings page

## Frontend

- Static HTML/CSS/JS with no external CDN dependencies
- Content is escaped (`escHtml`) before rendering to prevent XSS
- CORS headers are permissive for local development only

## Reporting Issues

If you discover a security issue, please report it responsibly. Do not disclose publicly until resolved.
