#!/usr/bin/env python3
"""Black-box smoke checks for RepoRadar's localhost server boundary."""

from __future__ import annotations

import json
import os
from pathlib import Path
import socket
import subprocess
import tempfile
import time
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]


def free_port() -> int:
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


def request(port: int, path: str, *, method: str = "GET", payload: dict | None = None,
            origin: str | None = None) -> tuple[int, dict, dict[str, str]]:
    data = None
    headers: dict[str, str] = {}
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"
    if origin is not None:
        headers["Origin"] = origin
    req = Request(f"http://127.0.0.1:{port}{path}", data=data, headers=headers, method=method)
    try:
        with urlopen(req, timeout=5) as response:
            body = response.read().decode("utf-8")
            return response.status, json.loads(body), dict(response.headers.items())
    except HTTPError as err:
        body = err.read().decode("utf-8")
        return err.code, json.loads(body), dict(err.headers.items())


def wait_until_ready(port: int) -> None:
    deadline = time.monotonic() + 15
    while time.monotonic() < deadline:
        try:
            status, _, _ = request(port, "/api/repos")
            if status == 200:
                return
        except (URLError, TimeoutError, json.JSONDecodeError):
            time.sleep(0.1)
    raise RuntimeError("RepoRadar server did not become ready")


def check_runtime(interpreter: bool) -> None:
    with tempfile.TemporaryDirectory(prefix="reporadar-server-smoke-") as temp_dir:
        temp = Path(temp_dir)
        repo = temp / "fixture"
        repo.mkdir()
        subprocess.run(["git", "init"], cwd=repo, check=True, capture_output=True)

        port = free_port()
        env = os.environ.copy()
        env["REPORADAR_DB"] = str(temp / "reporadar.db")
        process = subprocess.Popen(
            ["kujo", "run", *(["--interpreter"] if interpreter else []),
             "src/main.kujo", "serve", str(port)],
            cwd=ROOT,
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
        try:
            wait_until_ready(port)

            # Static and API callbacks must retain their imported module scope.
            for path in ("/", "/detail.html", "/activity.html", "/discovery.html",
                         "/settings.html", "/style.css", "/app.js", "/detail.js",
                         "/activity.js", "/discovery.js", "/settings.js"):
                with urlopen(f"http://127.0.0.1:{port}{path}", timeout=5) as response:
                    assert response.status == 200, path
                    assert response.read(), path
            for path in ("/api/settings", "/api/dashboard/summary", "/api/activity"):
                status, payload, _ = request(port, path)
                assert status == 200 and payload["success"] is True, (path, payload)

            status, payload, headers = request(port, "/api/repos")
            assert status == 200 and payload["success"] is True
            assert headers.get("X-Frame-Options") == "DENY"
            assert "camera=()" in headers.get("Permissions-Policy", "")

            hostile_status, hostile_payload, _ = request(
                port,
                "/api/scan/bulk",
                method="POST",
                origin="https://attacker.example",
            )
            assert hostile_status == 403
            assert hostile_payload["success"] is False

            same_origin = f"http://127.0.0.1:{port}"
            add_status, add_payload, _ = request(
                port,
                "/api/repos",
                method="POST",
                payload={"path": str(repo)},
                origin=same_origin,
            )
            assert add_status == 200 and add_payload["success"] is True

            list_status, list_payload, _ = request(port, "/api/repos")
            assert list_status == 200 and list_payload["total"] == 1
        finally:
            process.terminate()
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait(timeout=5)


def main() -> None:
    for interpreter in (False, True):
        check_runtime(interpreter)
    print("RepoRadar server smoke harness passed (VM and interpreter)")


if __name__ == "__main__":
    main()
