# Security

## Design Principles

RepoRadar is designed with security as a first-class concern:

1. **Local-first by default** — Core scanning and storage stay on your machine
2. **Read-only by default** — No destructive Git operations
3. **No network exposure** — Server binds to `127.0.0.1` only
4. **No telemetry** — Zero data collection or phoning home
5. **Minimal dependencies** — Only Kujo runtime and Git are required

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

## Optional Network Enrichment

Dependabot alert counts are disabled by default. When `enable_dependabot_alerts` is set to `true`, scans may call:

```bash
gh api /repos/<owner>/<repo>/dependabot/alerts
```

This only applies to GitHub remotes that can be parsed as `owner/repo`, and it returns `-1` when `gh` is missing, unauthenticated, unauthorized, or unavailable. RepoRadar does not store GitHub credentials; authentication remains owned by the GitHub CLI.

Leave this setting disabled for fully offline/local-only operation or environments where repository names should not be sent to GitHub.

## Input Validation

- Repo paths are validated to exist and be directories
- Git repo validation via `git rev-parse --is-inside-work-tree`
- SQL values are escaped via the shared `escape_sql(...)` helper
- JSON import validates structure before processing
- Static asset requests reject `..` segments and backslashes before touching the filesystem

## Data Storage

- SQLite database at `~/.reporadar.db` (configurable via `REPORADAR_DB`)
- No credentials or tokens stored
- Commit messages and repo paths are the most sensitive data stored
- Scan snapshots and file-change rows are trimmed to the newest 250 snapshots per repository to keep long-lived registries bounded
- Database can be backed up and restored via Settings page

## Frontend

- Static HTML/CSS/JS with no external CDN dependencies
- Content is escaped (`escHtml`) before rendering to prevent XSS
- Dashboard action buttons resolve repositories by numeric ID instead of embedding repository JSON in inline handlers
- CORS headers only reflect same-machine browser origins (`127.0.0.1`, `localhost`, and `[::1]`)
- Responses include defensive browser headers: `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, and a local-only Content Security Policy

## Reporting Issues

If you discover a security issue, please report it responsibly. Do not disclose publicly until resolved.
