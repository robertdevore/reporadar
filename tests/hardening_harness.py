#!/usr/bin/env python3
"""Behavioral regressions for R01–R09; isolated SQLite/Git fixtures, both runtimes."""
import json
import os
from pathlib import Path
import sqlite3
import subprocess
import tempfile
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from server_smoke_harness import ROOT, free_port, wait_until_ready


def check(interpreter):
    with tempfile.TemporaryDirectory(prefix='reporadar-hardening-') as td:
        temp = Path(td)
        env = dict(os.environ, REPORADAR_DB=str(temp / 'test.db'))
        prefix = ['kujo', 'run'] + (['--interpreter'] if interpreter else [])
        def cli(*args):
            return subprocess.run(prefix + ['src/main.kujo', *args], cwd=ROOT, env=env,
                                  capture_output=True, text=True, timeout=30)
        def snippet(source):
            file = temp / 'check.kujo'
            file.write_text(source)
            result = subprocess.run(prefix + [str(file)], cwd=ROOT, env=env,
                                    capture_output=True, text=True, timeout=30)
            assert result.returncode == 0, (result.stdout, result.stderr)
            return json.loads(result.stdout)
        repo = temp / 'repo'
        repo.mkdir()
        def git(*args):
            return subprocess.check_output(['git', '-C', str(repo), *args], stderr=subprocess.DEVNULL)
        git('init'); git('config', 'user.name', 'Fixture'); git('config', 'user.email', 'fixture@example.invalid')
        (repo / 'old').write_text('fixture')
        git('add', '.'); git('commit', '-m', 'fixture'); git('mv', 'old', 'new')
        scan = 'from src.scanner import scan_repo\nprint(to_json(scan_repo(' + json.dumps(str(repo)) + ')))'
        data = snippet(scan)
        assert (data['staged_count'], data['unstaged_count']) == (1, 0), data
        git('commit', '-am', 'rename'); git('checkout', '--detach')
        assert snippet(scan)['is_detached'] == 1
        (repo / 'untracked').write_text('fixture')
        rollback = snippet('''from src.db import create_schema_with_options
from src.registry import add_repo, store_scan_result
from src.scanner import scan_repo
mut db=db_connect("sqlite", ":memory:")
create_schema_with_options(db,false)
mut added=add_repo(db,PATH,"","","","",0)
db_execute(db,"CREATE TRIGGER fail_scan BEFORE INSERT ON repo_file_changes BEGIN SELECT RAISE(ABORT, 'fixture failure'); END")
mut failed=false
try { store_scan_result(db,added["id"],scan_repo(PATH)) } except err { failed=true }
print(to_json({"failed":failed,"snapshots":db_query(db,"SELECT COUNT(*) AS n FROM repo_status_snapshots")[0]["n"],"scanned":db_query(db,"SELECT last_scan_at FROM repos")[0]["last_scan_at"]}))
'''.replace('PATH', json.dumps(str(repo))))
        assert rollback == {'failed': True, 'snapshots': 0, 'scanned': None}, rollback
        tree = temp / 'tree'; tree.mkdir()
        for name in ('a', 'b', 'c'): (tree / name / '.git').mkdir(parents=True)
        # A worktree has a .git file; symlinks must not escape/repeat traversal.
        worktree = tree / 'worktree'
        git('worktree', 'add', '--detach', str(worktree))
        (tree / 'cycle').symlink_to(tree, target_is_directory=True)
        def discover(entries, results):
            return snippet('from src.server import discover_report\nprint(to_json(discover_report(' +
                           json.dumps(str(tree)) + ',3,0,[],{"entries_remaining":' + str(entries) +
                           ',"results_remaining":' + str(results) + '})))')
        limited = discover(100, 1)
        assert len(limited['repos']) == 1 and limited['truncated'], limited
        complete = discover(100, 100)
        assert len(complete['repos']) == 4 and not complete['truncated'], complete
        bounded = discover(3, 100)
        assert bounded['truncated'] and bounded['entries_examined'] <= 3, bounded
        assert cli('doctor', '--json').returncode == 0
        port = free_port()
        def request(path, method='GET', payload=None, raw=None, headers=None):
            hdr = {'Content-Type': 'application/json'}
            hdr.update(headers or {})
            data = json.dumps(payload).encode() if payload is not None else raw
            req = Request(f'http://127.0.0.1:{port}{path}', data=data, headers=hdr, method=method)
            try:
                with urlopen(req, timeout=10) as response: return response.status, response.read()
            except HTTPError as err: return err.code, err.read()
        with (temp / 'server.log').open('w') as log:
            process = subprocess.Popen(prefix + ['src/main.kujo', 'serve', str(port)], cwd=ROOT,
                                       env=env, stdout=log, stderr=log)
            try:
                wait_until_ready(port)
                malformed = [('/api/repos', 'POST', '{'), ('/api/repos', 'POST', '[]'),
                             ('/api/repos', 'POST', '{"path":42}'),
                             ('/api/repos/1', 'PUT', '{"notes":{}}'),
                             ('/api/repos/bulk-add', 'POST', '{"repos":[null]}'),
                             ('/api/discover', 'POST', '{"path":[],"max_depth":"x"}'),
                             ('/api/import', 'POST', '{"repos":"bad","settings":{}}'),
                             ('/api/settings', 'PUT', '{"settings":[]}')]
                for path, method, raw in malformed:
                    status, body = request(path, method, raw=raw.encode())
                    assert status == 400 and json.loads(body)['success'] is False, (path, status, body)
                    assert request('/api/repos')[0] == 200
                for host in ('evil.invalid', 'localhost.evil.invalid', '127.0.0.1@evil.invalid'):
                    for path, method, payload in (('/api/repos', 'GET', None), ('/api/settings', 'PUT', {'settings': {'bad': 'host'}})):
                        assert request(path, method, payload, headers={'Host':host, 'Origin':'http://' + host})[0] == 403
                for host in ('localhost', f'127.0.0.1:{port}', f'[::1]:{port}'):
                    assert request('/api/repos', headers={'Host':host})[0] == 200
                payload = {'app':'reporadar', 'repos':[{'path':str(repo)}], 'settings':{f'k{i}':'v' for i in range(51)}}
                assert request('/api/import', 'POST', payload)[0] == 413
                assert json.loads(request('/api/repos')[1])['total'] == 0
                conn = sqlite3.connect(temp / 'test.db')
                conn.execute("CREATE TRIGGER fail_import BEFORE INSERT ON settings WHEN NEW.key='fail' BEGIN SELECT RAISE(ABORT, 'fixture failure'); END")
                conn.commit()
                payload['settings'] = {'fail':'value'}
                assert request('/api/import', 'POST', payload)[0] == 500
                assert conn.execute('SELECT count(*) FROM repos').fetchone()[0] == 0
                conn.execute('DROP TRIGGER fail_import'); conn.commit()
                payload['settings'] = {'default_activity_window':30, 'stale_threshold_days':2}
                assert request('/api/import', 'POST', payload)[0] == 200
                assert request('/api/import', 'POST', payload)[0] == 200  # duplicate remains a skip
                assert conn.execute('SELECT count(*) FROM repos').fetchone()[0] == 1
                conn.execute('PRAGMA wal_autocheckpoint=0')
                conn.execute("INSERT INTO settings VALUES ('wal_marker','latest')"); conn.commit()
                status, binary = request('/api/export/db')
                assert status == 200 and binary.startswith(b'SQLite format 3\x00'), (status, binary[:150])
                backup = temp / 'backup.db'; backup.write_bytes(binary)
                with sqlite3.connect(backup) as restored:
                    assert restored.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
                    assert restored.execute("SELECT value FROM settings WHERE key='wal_marker'").fetchone()[0] == 'latest'
                assert not list(temp.glob('.reporadar-backup-*'))
                # Historical snapshots: latest ID wins ties and the lookup uses an index.
                repo_id = conn.execute('SELECT id FROM repos').fetchone()[0]
                conn.executemany("INSERT INTO repo_status_snapshots(repo_id,is_clean,has_remote,dependabot_alert_count,latest_commit_date) VALUES (?,1,1,3,datetime('now','-3 days'))", [(repo_id,)] * 250)
                conn.execute("INSERT INTO repo_status_snapshots(repo_id,is_clean,scan_error,dependabot_alert_count,latest_commit_date) VALUES (?,1,'fixture',5,datetime('now','-3 days'))", (repo_id,))
                conn.commit()
                summary = json.loads(request('/api/dashboard/summary')[1])['summary']
                assert (summary['clean'], summary['errors'], summary['dependabot_alerts'], summary['stale']) == (0, 1, 5, 1), summary
                detail = json.loads(request(f'/api/repos/{repo_id}')[1])['repo']
                assert detail['scan_error'] == 'fixture'
                plan = conn.execute('EXPLAIN QUERY PLAN SELECT id FROM repo_status_snapshots WHERE repo_id=? ORDER BY scanned_at DESC,id DESC LIMIT 1', (repo_id,)).fetchall()
                assert any('SEARCH' in row[3] and 'INDEX' in row[3] for row in plan), plan
                assert not any('TEMP B-TREE' in row[3] for row in plan), plan
                conn.executemany("INSERT INTO repo_commits(repo_id,commit_hash,short_hash,author,date,message) VALUES (?,?,?,'fixture',datetime('now','-10 days'),'fixture')", [(repo_id, str(i), str(i)) for i in range(75)])
                conn.commit()
                activity = json.loads(request('/api/activity')[1])
                assert activity['days'] == 30 and activity['total_commits'] == 75, activity
                assert len(activity['recent_commits']) == 50
                assert 'repo_path' in activity['recent_commits'][0]
                assert json.loads(request('/api/activity?days=7')[1])['total_commits'] == 0
                # Legacy Git %ci timestamps and ISO timestamps share stale semantics.
                conn.execute("UPDATE repo_status_snapshots SET latest_commit_date=strftime('%Y-%m-%d %H:%M:%S','now','-3 days') || ' +0000'")
                conn.commit()
                assert json.loads(request('/api/dashboard/summary')[1])['summary']['stale'] == 1
                conn.close()
                full = cli('list', '--json'); assert full.returncode == 0, full.stderr
                compact = cli('list', '--summary'); assert compact.returncode == 0, compact.stderr
                full_data, compact_data = json.loads(full.stdout), json.loads(compact.stdout)
                assert compact_data['summary'] == full_data['summary'] and compact_data['repos'] == []
                assert len(compact.stdout) < len(full.stdout)
                saved = temp / 'report.json'
                receipt = cli('list', '--output=' + str(saved))
                assert receipt.returncode == 0, receipt.stderr
                assert json.loads(receipt.stdout)['output'] == str(saved)
                assert json.loads(saved.read_text())['repos'] == full_data['repos']
                assert cli('list', '--output=' + str(temp / 'missing' / 'report')).returncode == 1
                assert cli('list', '--output=').returncode == 2
                assert request('/api/repos')[0] == 200
            finally:
                process.terminate()
                try: process.wait(timeout=5)
                except subprocess.TimeoutExpired: process.kill(); process.wait()


if __name__ == '__main__':
    check(False)
    check(True)
    print('Hardening regressions passed (VM and interpreter)')
