# Testing

## Strategy

CI pins Kujo **v1.9.0** and checksum-verifies the published native archive before running the checks below. Dependabot checks GitHub Actions pins weekly; the Kujo release pin is updated explicitly and verified with the full suite. RepoRadar has no third-party Kujo package dependencies.

RepoRadar uses Kujo's built-in testing framework (`kujo test`). Tests are organized in the `tests/` directory.

## Running Tests

```bash
# Run all tests against both supported Kujo runtimes
kujo test --runtime dual

# Run with verbose output
kujo test -v

# Verify JSON purity, filters, scan behavior, and exit codes
python3 tests/cli_contract_harness.py

# Exercise a live localhost server and its mutation boundary
python3 tests/server_smoke_harness.py

# Check frontend syntax
for source in static/*.js; do node --check "$source"; done
```

## Test Categories

### Unit Tests
- Git output parsing (status porcelain, commit log, rev-list counts)
- Path validation
- Database CRUD operations
- Import/export serialization

### Integration Tests
- End-to-end scan of a real Git repo
- HTTP request-policy tests and a live same-origin/cross-origin smoke test
- Discovery of repos in a test directory tree
- Import/export roundtrip integrity

### Edge Cases
- Detached HEAD state
- No remote configured
- No commits (fresh repo)
- Missing `.git` directory
- Permission denied on repo path
- Corrupted Git repository
- Empty repository list
- Boolean flag injection attempts
- Git repositories with an executable `core.fsmonitor` helper

## Test Data

Tests should use:
- Mock Git output strings for unit tests
- Temporary Git repos created during test setup
- The `test_setup` and `test_teardown` hooks for fixture management

## Coverage Goals

- 80%+ coverage on scanner parsing functions
- 100% coverage on database CRUD operations
- Key integration paths tested end-to-end

## Writing Tests

```kujo
// Example test
test "parse_git_status clean repo" {
    let output = "## main"
    let result = parse_git_status(output)
    assert_equal(result["branch"], "main")
    assert_equal(result["is_clean"], 1)
    assert_equal(result["changed_total"], 0)
}
```

## Current Status

- Scanner unit tests, registry CRUD tests, and integration tests already live in `tests/`.
- Regression coverage now includes escaped setting values, opt-in boolean setting normalization, shell-quoted paths, local `.git` marker validation, latest-snapshot file changes, bounded scan-history trimming, duplicate commit handling, GitHub remote parsing, and Dependabot alert count parsing.
- Agent CLI coverage includes normalized report classification, stable attention reasons, dirty/attention filtering, JSON-only stdout, fresh scans, and exit codes `0` through `3`.
- HTTP coverage verifies exact-origin mutation rejection, JSON media types, request limits, and defensive browser headers.
- Database coverage verifies schema v2, connection integrity settings, indexes, flag normalization, and migration behavior.
- Git coverage verifies hardened read-only prefixes and filesystem-monitor suppression.
- GitHub Actions runs source checks, dual-runtime Kujo tests, CLI contracts, a live server smoke test, and JavaScript syntax on Linux and macOS.

Performance benchmarks for 30, 100, and 500 repository registries remain a documented follow-up rather than an unsubstantiated performance claim.
