# Changelog

## [Unreleased] — v0.1.0

### FEATURE
- Repo registry: add, edit, remove tracked Git repositories
- Git scanner: status, branch, remote, ahead/behind, latest commit
- Dashboard with sortable, filterable, searchable table
- Dashboard filters are shareable through persistent URL parameters for status, group, tag, search, and sort views
- Summary bar showing clean/dirty/ahead/behind/diverged counts
- Summary bar now includes no-remote, errors, and stale counts
- Summary and repo tables show open Dependabot alert counts when GitHub CLI access is available and the setting is enabled
- Commit activity view with configurable time windows (1-90 days)
- Activity visualization with commit-per-day bar chart
- Most active and least active repo lists
- Stale repo detection
- Repo detail page with file-level changes and commit history
- Repo detail and dashboard commit hashes link to hosted commit pages for GitHub, GitLab, and Bitbucket remotes
- Local Git validation recognizes `.git` markers separately from provider-specific remote enrichment
- Dependabot enrichment is opt-in so default scans remain local-only and faster
- Parent folder discovery for bulk-adding repos
- Bulk scan all tracked repos
- Bulk scan modal reports clean/dirty/error totals
- Settings page with configurable thresholds
- JSON export/import for registry portability
- Database backup/restore
- Dark-first UI with CSS variables
- CLI commands: serve, add, remove, scan, scan-all, list, discover, export

### TWEAK
- SQLite storage at `~/.reporadar.db` (configurable via env)
- Server binds to `127.0.0.1` exclusively
- Vanilla JS frontend with no framework dependencies
- Kujo-first implementation using native builtins

### SECURITY
- Read-only Git commands only
- No telemetry or data collection
- Local-only architecture
