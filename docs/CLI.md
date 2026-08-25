# CLI and Agent Integration

RepoRadar's CLI supports both readable terminal reports and a stable JSON contract for agents, scripts, and external schedulers.

## Ecosystem review

Run a fresh scan and return only actionable repositories:

```bash
kujo run src/main.kujo review --scan
```

Use JSON for an agent or automation:

```bash
kujo run src/main.kujo review --scan --json
```

`review` includes attention items by default and uses exit code `3` when any are found. Use `--no-fail-on-attention` when attention should be advisory rather than a failing automation result.

```bash
kujo run src/main.kujo review --scan --json --no-fail-on-attention
```

## Health commands

```bash
# Detailed latest status for every tracked repository
kujo run src/main.kujo list

# Only dirty working trees
kujo run src/main.kujo list --dirty-only

# Every kind of actionable repository
kujo run src/main.kujo list --attention-only

# Scan everything and emit one JSON document
kujo run src/main.kujo scan-all --json

# Scan one repository and fail if it needs attention
kujo run src/main.kujo scan 12 --json --fail-on-attention
```

Supported health filters are:

- `--dirty-only` — Include only repositories whose working tree has changes.
- `--attention-only` — Include dirty, errored, unscanned, ahead, behind, diverged, no-remote, stale, or security-alert repositories.
- `--all` — Include all repositories in `review` output.

## JSON contract

JSON output is written to stdout without progress text and includes:

- `schema_version` — Currently `1`.
- `command`, `success`, and `exit_code` — Execution metadata.
- `filter` — `all`, `dirty`, or `attention`.
- `summary` — Total, included, clean, dirty, error, unscanned, attention, sync, staleness, alert, and changed-file counts.
- `repos` — Normalized repository records with paths, status, priority, attention reasons, change counts, upstream state, remote information, staleness, alerts, latest commit, scan timestamp, and scan errors.
- `scan` — Present for `scan`, `scan-all`, and `review`; records whether a scan ran and its results.

Stable `attention_reasons` values are:

```text
scan_error
unscanned
dirty_worktree
ahead
behind
diverged
no_remote
stale
security_alerts
```

Priority is `critical`, `high`, `medium`, or `none`. Scan errors, divergence, and security alerts are critical; dirty, behind, and unscanned repositories are high priority.

## Exit codes

| Code | Meaning |
| ---: | --- |
| `0` | Command completed successfully |
| `1` | A scan or operational error occurred |
| `2` | The command or its arguments were invalid |
| `3` | Attention items were found and attention failure was enabled |

Scan errors take precedence over attention status. `review` enables attention failure by default. Other health commands enable it only with `--fail-on-attention`.

## External scheduling

Scheduling intentionally remains outside RepoRadar. A scheduler or agent only needs filesystem access to the tracked repositories and the same database configuration used by the dashboard:

```bash
REPORADAR_DB="$HOME/.reporadar.db" \
  kujo run /path/to/reporadar/src/main.kujo review --scan --json
```

If the dashboard uses a custom `REPORADAR_DB`, the scheduled command must use that same value. On macOS, the process running the schedule must be allowed to read every registered repository.

## Suggested agent instruction

> Run RepoRadar `review --scan --json`. Summarize critical findings first, followed by high and medium priority repositories. Identify dirty worktrees, scan errors, divergence, branches behind or ahead of upstream, missing remotes, stale activity, and security alerts. Include repository paths. Do not modify repositories.
