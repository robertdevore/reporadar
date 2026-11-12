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
- Every inspection uses `GIT_OPTIONAL_LOCKS=0` and `-c core.fsmonitor=false` so read-only scans neither acquire optional index locks nor execute repository-configured filesystem-monitor helpers
- Output is parsed defensively; malformed output is handled gracefully

If write actions are implemented in the future:
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
- Browser mutation requests must match the exact `http://<Host>` origin; origin-less local clients remain available for terminal and agent integrations
- JSON mutation endpoints require `Content-Type: application/json`
- Request bodies are capped at 1 MiB, bulk collections at 1,000 entries, settings updates at 50 keys, and discovery at 25,000 visited entries/1,000 results

## Data Storage

- SQLite database at `~/.reporadar.db` (configurable via `REPORADAR_DB`)
- URI userinfo (including HTTPS tokens/passwords) is removed from remote URLs before persistence and reporting; SCP-style SSH usernames remain. Arbitrary repository content, URL paths/query strings and user-entered notes are not a general-purpose secret-redaction surface.
- Commit messages and repo paths are the most sensitive data stored
- Connections enable foreign-key enforcement, a 5-second busy timeout, WAL journaling, and normal synchronous durability
- Indexed latest-snapshot and date-first activity queries avoid repeated full-history scans
- Scan snapshots and file-change rows are trimmed to the newest 250 snapshots per repository to keep long-lived registries bounded
- Settings downloads a database backup; binary restoration is offline, as described below.

## Frontend

- Static HTML/CSS/JS with no external CDN dependencies
- Content is escaped (`escHtml`) before rendering to prevent XSS
- Dashboard action buttons resolve repositories by numeric ID instead of embedding repository JSON in inline handlers
- CORS headers only reflect same-machine browser origins (`127.0.0.1`, `localhost`, and `[::1]`)
- Responses include defensive browser headers: `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`, and a local-only Content Security Policy

## Trust Boundary

RepoRadar has no user authentication because it is a single-user localhost application. Other processes running as the same operating-system user can generally access the same repositories and database directly. Do not bind or proxy RepoRadar to a LAN or the public internet. A networked or multi-user deployment requires a separate threat model plus authentication, authorization, and TLS.

## Reporting Issues

If you discover a security issue, please report it responsibly. Do not disclose publicly until resolved.

## Request validation, imports, and backups

Every registered route validates Host against `127.0.0.1`, `localhost`, or `[::1]`, optionally followed by a valid numeric port. Browser mutations also require matching Origin; originless local CLI clients remain supported. This closes the arbitrary-Host boundary without asserting a demonstrated browser DNS-rebinding exploit.

JSON mutations reject malformed JSON and wrong container/field types with structured 400 responses. Collection limits return 413 before registry writes. Imports validate the entire structure before starting a transaction; unexpected persistence failures roll back repositories and settings together. Existing duplicate and missing-path skip behavior remains. Scan snapshots, file changes, timestamps, and retention pruning likewise commit atomically.

`GET /api/export/db` uses SQLite `VACUUM INTO` to create a consistent snapshot including committed WAL data. The snapshot lives in a private temporary directory, is returned as binary SQLite data, and is removed after reading. A failed backup is logged and returns a structured error. Backups contain local paths and metadata; store them accordingly.

The JSON importer accepts registry/settings exports, not SQLite files. To restore a binary backup, stop RepoRadar and any other users of its database, preserve the existing database together with its `-wal` and `-shm` sidecars, then place the downloaded file at the configured `REPORADAR_DB` path without old sidecars. Restart RepoRadar and run `doctor --json`. Do not replace a live database. The regression harness verifies backup integrity and recovery of a committed WAL marker using disposable files.


### Remote metadata cleanup

Schema v4 redacts URL userinfo in existing snapshot rows in a transaction, with secure-delete enabled on application connections, then requests WAL truncation. A busy external database reader can delay checkpoint cleanup. Existing backups, JSON exports, logs and copied reports remain outside the migration: replace or securely retire affected artifacts, and rotate any credential that was shared. RepoRadar never rewrites a repository's Git remote. No real credential exposure is inferred from the synthetic regression fixture.

Scans explicitly include all untracked files and submodule changes regardless of repository/global status preferences. Commit fields are NUL-framed, and invalid date fallback text is HTML-escaped in detail/activity views.
