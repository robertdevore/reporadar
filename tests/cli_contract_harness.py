#!/usr/bin/env python3
"""End-to-end contract checks for RepoRadar's human and agent CLI surfaces."""

from __future__ import annotations

import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile


ROOT = Path(__file__).resolve().parents[1]
CLI = ["kujo", "run", "src/main.kujo"]


def run_cli(db_path: Path, *args: str) -> subprocess.CompletedProcess[str]:
    env = os.environ.copy()
    env["REPORADAR_DB"] = str(db_path)
    return subprocess.run(
        [*CLI, *args],
        cwd=ROOT,
        env=env,
        text=True,
        capture_output=True,
        check=False,
    )


def json_result(result: subprocess.CompletedProcess[str]) -> dict:
    assert result.stdout.lstrip().startswith("{"), result.stdout
    return json.loads(result.stdout)


def git(repo: Path, *args: str) -> None:
    subprocess.run(["git", *args], cwd=repo, check=True, capture_output=True, text=True)


def main() -> None:
    with tempfile.TemporaryDirectory(prefix="reporadar-cli-contract-") as temp_dir:
        temp = Path(temp_dir)
        db_path = temp / "reporadar.db"
        repo = temp / "fixture-repo"

        fresh = run_cli(db_path, "list", "--json")
        assert fresh.returncode == 0, fresh.stderr
        fresh_data = json_result(fresh)
        assert fresh_data["schema_version"] == 1
        assert fresh_data["summary"]["total"] == 0

        repo.mkdir()
        git(repo, "init")
        git(repo, "config", "user.email", "cli-contract@example.invalid")
        git(repo, "config", "user.name", "RepoRadar CLI Contract")
        (repo / "README.md").write_text("# fixture\n", encoding="utf-8")
        git(repo, "add", "README.md")
        git(repo, "commit", "-m", "Initial fixture")

        added = run_cli(db_path, "add", str(repo))
        assert added.returncode == 0, added.stdout + added.stderr

        scanned = run_cli(db_path, "scan-all", "--json")
        assert scanned.returncode == 0, scanned.stdout + scanned.stderr
        scan_data = json_result(scanned)
        assert scan_data["success"] is True
        assert scan_data["scan"]["clean"] == 1
        assert scan_data["summary"]["clean"] == 1

        # An untracked file keeps the dirty-state assertion independent of Git's stat cache.
        (repo / "DIRTY.txt").write_text("dirty\n", encoding="utf-8")
        reviewed = run_cli(db_path, "review", "--scan", "--json")
        assert reviewed.returncode == 3, reviewed.stdout + reviewed.stderr
        review_data = json_result(reviewed)
        assert review_data["exit_code"] == 3
        assert review_data["summary"]["dirty"] == 1
        assert "dirty_worktree" in review_data["repos"][0]["attention_reasons"]

        advisory = run_cli(db_path, "review", "--json", "--no-fail-on-attention")
        assert advisory.returncode == 0, advisory.stdout + advisory.stderr
        assert json_result(advisory)["exit_code"] == 0

        dirty_only = run_cli(db_path, "list", "--json", "--dirty-only")
        assert dirty_only.returncode == 0, dirty_only.stdout + dirty_only.stderr
        assert json_result(dirty_only)["summary"]["included"] == 1

        invalid = run_cli(db_path, "review", "--json", "--not-a-real-option")
        assert invalid.returncode == 2, invalid.stdout + invalid.stderr
        assert json_result(invalid)["exit_code"] == 2

        shutil.rmtree(repo)
        failed_scan = run_cli(db_path, "scan-all", "--json")
        assert failed_scan.returncode == 1, failed_scan.stdout + failed_scan.stderr
        failed_data = json_result(failed_scan)
        assert failed_data["success"] is False
        assert failed_data["exit_code"] == 1
        assert failed_data["summary"]["errors"] == 1

    print("RepoRadar CLI contract harness passed")


if __name__ == "__main__":
    main()
