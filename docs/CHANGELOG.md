# Changelog

## [Unreleased] — v0.1.0

### FEATURE
- Repo registry: add, edit, remove tracked Git repositories
- Git scanner: status, branch, remote, ahead/behind, latest commit
- Dashboard with sortable, filterable, searchable table
- Summary bar showing clean/dirty/ahead/behind/diverged counts
- Commit activity view with configurable time windows (1-90 days)
- Activity visualization with commit-per-day bar chart
- Most active and least active repo lists
- Stale repo detection
- Repo detail page with file-level changes and commit history
- Parent folder discovery for bulk-adding repos
- Bulk scan all tracked repos
- Settings page with configurable thresholds
- JSON export/import for registry portability
- Database backup/restore
- Dark-first UI with CSS variables
- CLI commands: serve, add, remove, scan, scan-all, list, discover, export

### TWEAK
- SQLite storage at `~/.reporadar.db` (configurable via env)
- Server binds to `127.0.0.1` exclusively
- Vanilla JS frontend with no framework dependencies
- Ruff-first implementation using native builtins

### SECURITY
- Read-only Git commands only
- No telemetry or data collection
- Local-only architecture
