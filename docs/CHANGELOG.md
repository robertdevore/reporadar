# Changelog

## Unreleased

### FEATURE
- Agent-oriented `review` command with optional fresh bulk scans
- JSON output for list, single-scan, bulk-scan, and review workflows
- Dirty-only and attention-only repository filters
- Normalized attention reasons and priority levels for automated triage
- `doctor` and `version` commands with machine-readable JSON contracts
- Linux and macOS CI with checksum-verified Kujo installation

### TWEAK
- Detailed human-readable repository health output
- Stable automation exit codes for operational errors, invalid usage, and attention findings
- CLI bulk scans now persist scan-run summaries like the HTTP bulk-scan endpoint
- Centralized application version reporting
- SQLite schema v2 with WAL, foreign-key enforcement, busy timeout, one-time commit deduplication, and query indexes
- Bounded recursive discovery and bulk API collections
- Root cleanup, MIT license, corrected documentation links, and a prioritized follow-up review

### SECURITY
- Exact same-origin enforcement for browser mutations while retaining origin-less local automation
- JSON content-type enforcement and a 1 MiB mutation-body limit
- Read-only Git inspection disables repository-configured filesystem-monitor helpers and optional index locking
- Repository boolean flags are normalized before SQL construction
- Detail-view copy actions no longer interpolate repository paths into inline JavaScript

## [0.4.0] — 2026-08-25

### FEATURE
- Styled repository removal confirmation modal
- Footer links to the RepoRadar GitHub repository and Robert DeVore's website

### TWEAK
- Rebuilt the bulk scan modal layout for a compact, consistent presentation
- Updated application and frontend version displays

## [0.3.0] — 2026-07-20

### FEATURE
- Dashboard column controls for customizing visible repository metadata
- Decorative summary charts for faster dashboard scanning
- Side-by-side repo commit and scan history views on detail pages
- Collapsible recent commits and moved scan history for denser detail pages

### TWEAK
- Refined dashboard summary, action icons, table controls, column selector, and content width
- Shifted the dashboard accent color and added dithered visual polish
- Polished detail, settings, discovery, add modal, and scan modal typography
- Condensed git change counts and improved remote and commit detail presentation
- Removed duplicate latest commit presentation and linked commit hashes from more views
- Removed rounded corners from the UI for a sharper visual system

## [0.2.0] — 2026-07-15

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
- Dashboard summary cards fill the available row on desktop and collapse into a compact two-column grid on mobile
- Dashboard bulk scans now update progress repo-by-repo with a scrolling scan log instead of waiting silently for the synchronous bulk endpoint
- Bulk scan loading state now uses a matching SVG loader icon instead of an emoji
- Bulk scan completion now shows a final status message, exposes a close button, and auto-closes after successful scans
- Scan snapshot and file-change history is bounded per repository to keep long-lived local databases responsive
- Integration tests now use the current repository path instead of an absolute machine-specific path

### SECURITY
- Read-only Git commands only
- No telemetry or data collection
- Local-only architecture
- CORS origin reflection is limited to localhost origins
- Static asset serving rejects traversal-shaped paths
- Responses include defensive browser security headers
- Dashboard row action handlers no longer embed repository JSON or names in inline JavaScript
