# Testing

## Strategy

RepoRadar uses Kujo's built-in testing framework (`kujo test`). Tests are organized in the `tests/` directory.

## Running Tests

```bash
# Run all tests
kujo test

# Run with verbose output
kujo test -v
```

## Test Categories

### Unit Tests
- Git output parsing (status porcelain, commit log, rev-list counts)
- Path validation
- Database CRUD operations
- Import/export serialization

### Integration Tests
- End-to-end scan of a real Git repo
- Full API roundtrip (add → scan → query → verify)
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
- Large number of repos (30+)

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
- Regression coverage now includes escaped setting values, opt-in boolean setting normalization, shell-quoted paths, local `.git` marker validation, latest-snapshot file changes, duplicate commit handling, GitHub remote parsing, and Dependabot alert count parsing.
- The next useful step is to grow edge-case coverage and wire the suites into CI.
