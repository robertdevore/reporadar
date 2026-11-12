# Roadmap

## v0.5.0 (Current release)
- [x] Agent-oriented ecosystem review command
- [x] Machine-readable JSON health reports
- [x] Dirty and attention filters
- [x] Automation-friendly exit codes
- [x] Richer terminal health summaries
- [x] Runtime and database diagnostics via `doctor`
- [x] Centralized version reporting for CLI and HTTP clients
- [x] Same-origin mutation enforcement and bounded HTTP/discovery inputs
- [x] Hardened Git inspection that suppresses filesystem-monitor helpers
- [x] SQLite schema v2, concurrency settings, and query indexes
- [x] Linux/macOS continuous integration

## v0.2.0
- [x] Repo registry (add, edit, remove)
- [x] Git scanner (status, branch, commit, remote)
- [x] Dashboard with sort, filter, search
- [x] Commit activity view
- [x] Repo detail view
- [x] Parent folder discovery
- [x] Bulk scanning
- [x] Settings management
- [x] JSON export/import
- [x] Database backup/restore

## v0.3.0
- [x] Dashboard column controls
- [x] Decorative summary charts
- [x] Refined dashboard table controls and action icons
- [x] Wider dashboard layout with constrained content width
- [x] Detail page commit and scan history layout polish
- [x] Settings, discovery, add modal, and scan modal typography polish
- [x] Commit hash and remote detail presentation refinements
- [x] Sharper visual system with square-edged UI

## Remaining roadmap
- [ ] Write action endpoints (stage, commit, push, pull)
- [x] Styled confirmation modal for repository removal
- [ ] Audit log for write actions
- [x] Cross-runtime, CLI-contract, server-policy, and live HTTP regression suites
- [ ] Real-time scan progress via polling
- [ ] Scheduled/periodic scanning

## v1.0.0 (Future)
- [ ] Performance optimization for 100+ repos
- [ ] Advanced filtering (regex, date ranges)
- [ ] Custom dashboard layouts
- [ ] Plugin/extension system
- [ ] Kujo LSP integration for repo-aware editing
- [ ] Multi-monitor support

## Known Limitations
- No real-time file watching (polling only)
- No Git operations beyond basic status/commit queries
- No multi-user support (single local user)
- No authentication; the HTTP server must remain localhost-only
- No cloud sync (by design)
- Requires Git to be installed separately
- Kujo v1.9.0 is the tested runtime
