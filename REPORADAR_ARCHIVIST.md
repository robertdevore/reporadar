# RepoRadar Archivist Dossier

## Executive Summary

RepoRadar is a local-first Git repository dashboard implemented in Kujo with a CLI entrypoint, localhost HTTP server, SQLite persistence, read-only Git scanning, and static browser views for dashboard, detail, activity, discovery, and settings. Confirmed sources show repo registry CRUD, scan snapshots, file-change storage, commit collection, bulk scanning, discovery, settings, JSON export/import, and database backup endpoints. The project also contains planning and handoff notes that mark write-action endpoints, CI, broader hardening, scale testing, and some release-readiness work as future or incomplete. Sources inspected: `README.md`, `kujo.toml`, `docs/`, `agent/`, `src/`, `static/`, and `tests/`.

Evidence status: confirmed with planned and unknown items separated below.

## One-Sentence Description

RepoRadar is a Kujo-built, local-first dashboard and CLI for inspecting local Git repositories, storing scan data in SQLite, and serving a static browser UI from `127.0.0.1`.

Evidence status: confirmed. Sources: [S1], [S3], [S4], [S7], [S8], [S10].

## What KUJO Is

- The inspected sources establish Kujo as the programming language/runtime used by RepoRadar and show commands such as `kujo run src/main.kujo serve 8080`, `kujo check src/*.kujo`, and `kujo test`. Sources: [S1], [S4], [S20].
- RepoRadar uses `.kujo` modules for CLI, server, database, registry, and scanner code. Sources: [S4], [S7], [S8], [S9], [S10], [S11].
- The sources do not establish the full Kujo language specification, governance, package ecosystem, or runtime internals beyond RepoRadar usage and local conventions noted in docs. Evidence status: unknown for broader KUJO claims. Source: [S4].

## Why KUJO Exists

Unknown from inspected sources. RepoRadar's sources say why RepoRadar exists, but they do not state why the Kujo language exists.

RepoRadar exists to provide one place to inspect local repository state, keep Git inspection read-only by default, and demonstrate a complete Kujo application with CLI, HTTP, SQLite, and static frontend layers. Evidence status: confirmed. Source: [S1].

## Core Language Concepts

- `export func`: documented as required for cross-module visibility in this repo. Evidence status: confirmed. Source: [S4].
- `mut`: documented for mutable bindings because `let` is deeply immutable in this repo's Kujo usage. Evidence status: confirmed. Source: [S4].
- Cross-module imports use `from src.module import func`. Evidence status: confirmed. Source: [S4].
- `try/except err` requires a variable name after `except` according to the development notes. Evidence status: confirmed. Source: [S4].
- `http_listen("127.0.0.1", port)` is used and documented as localhost binding. Evidence status: confirmed. Sources: [S4], [S10].
- Broader syntax, type system, standard library, compiler, and package-management behavior are unknown from inspected sources.

## Tooling Ecosystem

### RepoRadar CLI

- Location: `src/main.kujo`.
- Purpose: command entrypoint for serving the dashboard and operating on the repo registry.
- Commands: `serve`, `scan`, `scan-all`, `add`, `remove`, `list`, `discover`, `export`, `help`.
- Inputs and outputs: accepts command arguments, reads/writes the local SQLite database, prints command results, and writes `reporadar-export.json` for CLI export.
- Evidence status: confirmed. Sources: [S1], [S7].

### RepoRadar HTTP Server/API

- Location: `src/server.kujo`.
- Purpose: initializes the database, registers static routes and JSON API endpoints, and listens on `127.0.0.1`.
- API surface includes repo list/add/update/remove/scan/detail, dashboard summary, activity, bulk scan, discovery, bulk add, settings get/update, JSON export/import, and database export.
- Evidence status: confirmed. Sources: [S4], [S10].

### Git Scanner

- Location: `src/scanner.kujo`.
- Purpose: validates Git repositories, runs read-only Git commands, parses branch/status/commit/remote/upstream data, captures file changes, collects recent commits, and optionally counts GitHub Dependabot alerts through `gh`.
- Evidence status: confirmed. Sources: [S3], [S8], [S15].

### SQLite Registry/Database

- Locations: `src/db.kujo`, `src/registry.kujo`.
- Purpose: stores tracked repos, scan snapshots, file changes, commits, scan runs, settings, and schema version data in SQLite.
- Default DB path is `~/.reporadar.db`, overridable with `REPORADAR_DB`.
- Evidence status: confirmed. Sources: [S1], [S9], [S11].

### Browser UI

- Location: `static/`.
- Purpose: static HTML/CSS/JS pages for dashboard, repo detail, activity, discovery, and settings.
- Evidence status: confirmed. Sources: [S4], [S12].

## Workflow Ecosystem

- Add/list/scan/discover/export CLI workflows are documented in the README and implemented in `src/main.kujo`. Evidence status: confirmed. Sources: [S1], [S7].
- Browser workflows include dashboard filtering/sorting/search/shareable URL params, repo add/edit/delete/scan, bulk scan progress, discovery/bulk add, activity views, settings, export/import, and DB backup. Evidence status: confirmed from docs/source, with UI behavior partly confirmed by static JS inspection. Sources: [S1], [S10], [S12].
- Test workflow uses Kujo's built-in `kujo test` with scanner, registry, and integration test suites. Evidence status: confirmed. Sources: [S16], [S20].
- There are no inspected `.github` workflow files, so CI workflow implementation is unknown/not present in the inspected tree. Evidence status: unknown. Sources: [S2], [S18].

## Skills And Agents

- No local `skills/` or `.codex/skills/` folder was present in the RepoRadar source inventory. Evidence status: confirmed absence from inspected files. Source: [S2].
- RepoRadar includes `agent/` planning, handoff, memory, checklist, and phase notes. These are local agent work artifacts, not executable skills. Evidence status: confirmed. Sources: [S17], [S19].
- The agent notes state all implementation phases complete, while also saying write endpoints are deferred and future work remains. Evidence status: confirmed conflict/nuance. Sources: [S17], [S19].

## Repository Map

- Path: `/Users/robertdevore/2026/reporadar`.
- Apparent purpose: local-first Git repository dashboard and Kujo application example. Evidence status: confirmed. Sources: [S1], [S3].
- High-signal files inspected: `README.md`, `kujo.toml`, `docs/*.md`, `agent/*.md`, `agent/phases/*.md`, `src/*.kujo`, `static/*.html`, `static/*.js`, `static/style.css`, `tests/*.kujo`.
- Important commands/APIs: `kujo run src/main.kujo ...`, `kujo test`, localhost API routes in `src/server.kujo`.
- Open questions: license file is not present though `docs/README.md` says MIT; CI is planned but no workflow file was inspected; current production-readiness is explicitly not "enterprise complete"; some agent notes are older than docs and may be historical.
- Evidence status: confirmed with unknowns separated. Sources: [S1], [S2], [S5], [S10], [S18].

## Public Positioning

- "local-first Git repository dashboard built in the Kujo programming language" appears in `README.md` and `docs/ARCHITECTURE.md`. Evidence status: confirmed. Sources: [S1], [S3].
- "local Git command center" appears in `docs/README.md`. Evidence status: confirmed as project wording, not restated as a marketing claim. Source: [S5].
- The README status says the project is useful and increasingly polished but not universally "enterprise complete". Evidence status: confirmed. Source: [S1].

## Audience / ICP

- Explicit audience: "teams and solo developers" in the README. Evidence status: confirmed. Source: [S1].
- Inferred users: local developers with multiple Git repositories who want repo status, branches, commit activity, local changes, and scan history in one UI. Evidence status: inferred from README features, architecture, and UI/API implementation. Sources: [S1], [S3], [S10], [S12].
- Unknown: commercial ICP, buyer persona, deployment model beyond local use, and supported organization/team operating process are not established by inspected sources.

## What Is Confirmed

- RepoRadar package metadata names the package `reporadar` at version `0.4.0`. Source: [S6].
- RepoRadar requires Kujo v1.0.0+, Git on `PATH`, and a Unix-like environment according to docs. Sources: [S1], [S13].
- The CLI command surface includes `serve`, `scan`, `scan-all`, `add`, `remove`, `list`, `discover`, `export`, and `help`. Sources: [S1], [S7].
- The server binds to `127.0.0.1` and registers static plus API routes. Sources: [S4], [S10].
- The database layer defaults to `~/.reporadar.db` and supports `REPORADAR_DB`. Sources: [S1], [S9].
- The schema includes repo registry, status snapshots, file changes, commits, scan runs, settings, and schema version tables. Sources: [S3], [S9].
- The scanner uses shell-quoted read-only Git commands for validation, status, commit, remote, and upstream data. Sources: [S3], [S8], [S15].
- Dependabot alert enrichment is opt-in and uses GitHub CLI when enabled and available. Sources: [S1], [S8], [S14].
- The static UI has dashboard, detail, activity, discovery, and settings pages wired to API endpoints. Sources: [S4], [S12].
- Tests cover scanner parsing, path validation, settings/registry behavior, scan data helpers, GitHub remote parsing, Dependabot count parsing, and integration flows. Sources: [S15], [S16].

## What Is Inferred

- RepoRadar appears intended both as a useful local tool and a Kujo showcase app because the README says it demonstrates a complete Kujo application and docs emphasize Kujo layers. Sources: [S1], [S3], [S18].
- The local-first constraint appears central to product design because README, architecture, security docs, and server code all reinforce local storage, localhost binding, read-only Git inspection, and no telemetry. Sources: [S1], [S3], [S10], [S14].
- The user likely values source hygiene for this repo because README states the root is intentionally small and planning artifacts are kept under `agent/`; later follow-up docs repeat the root organization pattern. Sources: [S1], [S18].

## What Is Planned

- CI for running the Kujo test suite on pushes/PRs is planned. Source: [S18].
- A server smoke script for key API routes and security headers is planned. Source: [S18].
- Isolated temporary Git fixtures are planned to replace remaining reliance on the repository under test. Source: [S18].
- Request/import-size validation and malformed JSON tests are planned hardening work. Source: [S18].
- Write-action endpoints for stage/commit/push/pull remain planned/deferred; current evidence shows settings/toggle planning but no implemented write endpoints in route list. Sources: [S10], [S17], [S19].
- Performance benchmarking for 30, 100, and 500 repositories is planned. Source: [S18].
- Import dry-run output, saved view presets, onboarding screenshots/sample workflow, and broader empty/error state polish are planned. Source: [S18].

## What Is Unknown

- The full Kujo language/runtime design and ecosystem are outside what RepoRadar sources establish.
- Current CI status is unknown; no workflow files were found in the inspected repository inventory. Sources: [S2], [S18].
- License status is unclear: `docs/README.md` says MIT, but no top-level license file appeared in the inspected inventory. Sources: [S2], [S5].
- Whether README examples were recently executed in this session is not established by the dossier source scan; command availability was inspected separately only for verification.
- Production security posture outside localhost-only operation is unknown; docs explicitly call for deciding non-local deployment policy before broader binding. Sources: [S14], [S18].
- Performance at 30, 100, or 500 repositories is unknown from inspected sources, despite planned benchmarking and some older checklist claims. Sources: [S18], [S19].

## What To Avoid Saying

- Do not say RepoRadar is enterprise complete; README says it is not universally enterprise complete. Source: [S1].
- Do not say write actions are implemented; route/source evidence does not show stage/commit/push/pull endpoints and planning notes say actual write endpoints are deferred. Sources: [S10], [S17].
- Do not say CI is implemented; inspected sources list CI as future work and no workflow files were found. Sources: [S2], [S18].
- Do not say no data ever leaves the machine without qualification; Dependabot enrichment can call GitHub CLI when explicitly enabled. Sources: [S1], [S8], [S14].
- Do not claim broad Kujo language features beyond the conventions and commands present in this repo. Source: [S4].
- Do not claim a top-level MIT license file exists; only docs text states MIT. Sources: [S2], [S5].

## Glossary

- RepoRadar: local-first Git repository dashboard built in Kujo. Evidence status: confirmed. Sources: [S1], [S3].
- Kujo: programming language/runtime used to run RepoRadar `.kujo` modules and tests. Evidence status: confirmed only within this repo's usage. Sources: [S1], [S4].
- Registry: SQLite-backed list of tracked repositories with metadata and latest status. Evidence status: confirmed. Sources: [S9], [S11].
- Scan snapshot: per-repository scan record stored in `repo_status_snapshots`. Evidence status: confirmed. Sources: [S3], [S9], [S11].
- File changes: parsed Git porcelain entries stored per scan snapshot. Evidence status: confirmed. Sources: [S8], [S11].
- Dependabot enrichment: opt-in GitHub CLI lookup for open Dependabot alert counts on GitHub remotes. Evidence status: confirmed. Sources: [S8], [S14].
- Local-first: default local operation with localhost server binding and SQLite storage. Evidence status: confirmed. Sources: [S1], [S3], [S14].

## Source Notes

- [S1] Path: `README.md`
  Type: README.
  Detail: overview, why it exists, features, requirements, quick start, workflows, configuration, security model, status.
  Supports: project description, audience, local-first/read-only purpose, command examples, requirements, not-enterprise-complete status.
  Evidence status: confirmed/planned where status text is future-facing.
- [S2] Path: repository inventory from `/Users/robertdevore/2026/reporadar`
  Type: source inventory.
  Detail: inspected files include README, docs, agent notes, source, static assets, tests, `kujo.toml`; no `.github` workflow or local skills directory appeared.
  Supports: repository map, absence of inspected workflows/local skills, license-file uncertainty.
  Evidence status: confirmed/unknown.
- [S3] Path: `docs/ARCHITECTURE.md`
  Type: docs.
  Detail: overview, component diagram, data flow, schema, safe Git commands, security model.
  Supports: architecture, data flow, schema, read-only Git command list.
  Evidence status: confirmed.
- [S4] Path: `docs/DEVELOPMENT.md`
  Type: docs.
  Detail: project structure, running commands, Kujo conventions, API endpoint list.
  Supports: module layout, Kujo conventions, command and API descriptions.
  Evidence status: confirmed.
- [S5] Path: `docs/README.md`
  Type: docs.
  Detail: one-liner, features, requirements, docs index, license text.
  Supports: project wording, feature list, license uncertainty when compared with inventory.
  Evidence status: confirmed/unknown.
- [S6] Path: `kujo.toml`
  Type: metadata.
  Detail: package name/version.
  Supports: package identity `reporadar` version `0.4.0`.
  Evidence status: confirmed.
- [S7] Path: `src/main.kujo`
  Type: source.
  Detail: `print_usage`, `cmd_list`, `cmd_add`, `cmd_remove`, `cmd_scan`, `cmd_scan_all`, `cmd_discover`, `cmd_export`, `main`.
  Supports: CLI command surface and behavior.
  Evidence status: confirmed.
- [S8] Path: `src/scanner.kujo`
  Type: source.
  Detail: `shell_quote`, `validate_git_repo`, `parse_git_status`, `get_latest_commit`, `parse_github_repo_slug`, `count_dependabot_alerts`, `scan_repo_with_options`, `collect_recent_commits`.
  Supports: Git scanner behavior, shell quoting, Dependabot enrichment, commit collection.
  Evidence status: confirmed.
- [S9] Path: `src/db.kujo`
  Type: source.
  Detail: `get_db_path`, `sanitize_setting_value`, `create_schema`, `ensure_schema`, defaults, indexes.
  Supports: SQLite path, schema, settings defaults and normalization.
  Evidence status: confirmed.
- [S10] Path: `src/server.kujo`
  Type: source.
  Detail: CORS/security helpers, API handlers, static serving, route mapping, `start_server`.
  Supports: localhost server, API surface, static routes, CORS/security behavior.
  Evidence status: confirmed.
- [S11] Path: `src/registry.kujo`
  Type: source.
  Detail: `add_repo`, `remove_repo`, `update_repo`, `get_all_repos`, `store_scan_result`, history trimming, commit helpers.
  Supports: registry CRUD, scan persistence, bounded history, commit storage.
  Evidence status: confirmed.
- [S12] Path: `static/*.html`, `static/*.js`, `static/style.css`
  Type: source/static frontend.
  Detail: dashboard/detail/activity/discovery/settings pages and fetch calls.
  Supports: browser UI pages and client API interactions.
  Evidence status: confirmed.
- [S13] Path: `docs/INSTALL.md`
  Type: docs.
  Detail: prerequisites, install/run steps, configuration.
  Supports: requirements and DB override.
  Evidence status: confirmed.
- [S14] Path: `docs/SECURITY.md`
  Type: docs.
  Detail: design principles, server binding, Git commands, optional network enrichment, validation, storage, frontend security.
  Supports: local-first/read-only security posture and Dependabot caveat.
  Evidence status: confirmed/planned for write-action section.
- [S15] Path: `tests/test_scanner.kujo`
  Type: test.
  Detail: parser, path, shell quote, GitHub remote, Dependabot output, commit parsing tests.
  Supports: scanner behavior and regression coverage.
  Evidence status: confirmed.
- [S16] Path: `tests/test_registry.kujo`, `tests/test_integration.kujo`
  Type: test.
  Detail: settings, registry, scan data helpers, duplicate commit storage, history trimming, Git validation, full scan, end-to-end add/scan/store/retrieve.
  Supports: registry and integration behavior.
  Evidence status: confirmed.
- [S17] Path: `agent/TODO.md`, `agent/HANDOFF.md`
  Type: planning/handoff note.
  Detail: phase completion status, known issues, next-agent notes.
  Supports: historical implementation status and deferred write endpoints.
  Evidence status: confirmed/planned depending on claim.
- [S18] Path: `docs/NEXT_SESSION_ENTERPRISE_REVIEW_2026-06-20.md`
  Type: planning note.
  Detail: release confidence, security hardening, performance, product completeness, Kujo showcase follow-up list.
  Supports: planned CI, smoke script, fixture, hardening, benchmarking, product follow-ups.
  Evidence status: planned.
- [S19] Path: `agent/phases/*.md`, `agent/MASTER.md`, `agent/DECISIONS.md`, `agent/REVIEW_CHECKLIST.md`
  Type: planning notes.
  Detail: phase plans, decisions, implementation criteria, checklist.
  Supports: planned work, design intent, and historical checklist state.
  Evidence status: planned/inferred unless corroborated by current source.
- [S20] Path: `docs/TESTING.md`
  Type: docs.
  Detail: testing strategy, commands, categories, current status.
  Supports: Kujo test workflow and coverage descriptions.
  Evidence status: confirmed/planned for future coverage/CI.
