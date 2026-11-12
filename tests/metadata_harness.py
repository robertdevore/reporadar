#!/usr/bin/env python3
"""R11–R15 behavioral regressions: real Git, isolated databases, VM and interpreter."""
import json
import os
from pathlib import Path
import sqlite3
import subprocess
import tempfile
from server_smoke_harness import ROOT, free_port, wait_until_ready
from urllib.request import Request, urlopen


def check(interpreter):
    with tempfile.TemporaryDirectory(prefix='reporadar-metadata-') as td:
        temp=Path(td); repo=temp/'repo'; repo.mkdir()
        env=dict(os.environ, REPORADAR_DB=str(temp/'test.db'), GIT_CONFIG_GLOBAL=str(temp/'global'), GIT_CONFIG_NOSYSTEM='1')
        prefix=['kujo','run']+(['--interpreter'] if interpreter else [])
        def git(*args, extra=None):
            return subprocess.check_output(['git','-C',str(repo),*args],env=dict(env,**(extra or {})),stderr=subprocess.DEVNULL).decode().strip()
        def snippet(source):
            f=temp/'check.kujo';f.write_text(source)
            result=subprocess.run(prefix+[str(f)],cwd=ROOT,env=env,capture_output=True,text=True,timeout=60)
            assert result.returncode==0,(result.stdout,result.stderr)
            return json.loads(result.stdout)
        def cli(*args):
            r=subprocess.run(prefix+['src/main.kujo',*args],cwd=ROOT,env=env,capture_output=True,text=True,timeout=60)
            assert r.returncode==0,(r.stdout,r.stderr)
            return r.stdout
        git('init');git('config','user.name','Fixture---not-a-date');git('config','user.email','fixture@example.invalid')
        git('commit','--allow-empty','-m','subject --- preserved')
        # Both global and per-repo configuration must not hide file-level untracked changes.
        (temp/'global').write_text('[status]\n showUntrackedFiles = no\n')
        git('config','status.showUntrackedFiles','no')
        (repo/'nested').mkdir();(repo/'nested'/'one').write_text('1');(repo/'nested'/'two').write_text('2')
        scan='from src.scanner import scan_repo\nprint(to_json(scan_repo('+json.dumps(str(repo))+')))'
        scanned=snippet(scan)
        assert scanned['is_clean']==0 and scanned['untracked_count']==2,scanned
        assert scanned['latest_commit_author']=='Fixture---not-a-date'
        assert scanned['latest_commit_message']=='subject --- preserved'
        assert len(scanned['latest_commit_date'])==25
        git('config','--unset','status.showUntrackedFiles')
        assert snippet(scan)['untracked_count']==2
        # Userinfo is redacted, but repository configuration and meaningful identity stay intact.
        urls={
            'https://user:FAKE-AUDIT-TOKEN@github.com/team/repo.git':'https://github.com/team/repo.git',
            'https://FAKE-AUDIT-TOKEN@github.com/team/repo.git':'https://github.com/team/repo.git',
            'https://user:p%40ss@host.invalid:8443/team/repo':'https://host.invalid:8443/team/repo',
            'ssh://git@host.invalid/team/repo':'ssh://host.invalid/team/repo',
            'git@host.invalid:team/repo.git':'git@host.invalid:team/repo.git',
            '/local/@repo':'/local/@repo',
        }
        for raw,expected in urls.items():
            git('config','remote.origin.url',raw)
            assert snippet(scan)['remote_url']==expected
            assert git('config','remote.origin.url')==raw
        git('config','remote.origin.url',next(iter(urls)))
        # Timestamp normalization supports both offsets and preserves UTC day/order boundaries.
        dates=snippet('''from src.metadata import normalize_commit_date
mut db=db_connect("sqlite",":memory:")
print(to_json([normalize_commit_date(db,"2026-01-01 00:30:00 +0530"),normalize_commit_date(db,"2025-12-31T23:30:00-05:00"),normalize_commit_date(db,"invalid")]))''')
        assert dates==['2025-12-31T19:00:00Z','2026-01-01T04:30:00Z',''],dates
        # Same instant with opposite offsets must straddle the window by UTC, not local text.
        boundary=snippet('''from src.db import create_schema_with_options
from src.registry import store_repo_commits, get_activity_total, get_activity_feed
mut db=db_connect("sqlite",":memory:")
create_schema_with_options(db,false)
db_execute(db,"INSERT INTO repos(name,path) VALUES ('fixture','/fixture')")
mut times=db_query(db,"SELECT strftime('%Y-%m-%d %H:%M:%S','now','-7 days','-2 hours') || ' -0500' AS inside, strftime('%Y-%m-%d %H:%M:%S','now','-7 days','+2 hours') || ' +0500' AS outside")[0]
store_repo_commits(db,1,[{"hash":"in","short_hash":"in","author":"a","date":times["inside"],"message":"inside"},{"hash":"out","short_hash":"out","author":"a","date":times["outside"],"message":"outside"}])
print(to_json({"total":get_activity_total(db,7),"feed":get_activity_feed(db,7)}))''')
        assert boundary['total']==1 and boundary['feed'][0]['commit_hash']=='in',boundary
        cli('doctor','--json');cli('add',str(repo))
        for i in range(26):git('commit','--allow-empty','-m',f'commit {i}')
        report=json.loads(cli('scan','1','--json'))
        assert report['repos'][0]['history_complete']==1
        assert 'FAKE-AUDIT-TOKEN' not in json.dumps(report)
        with sqlite3.connect(temp/'test.db') as db:
            assert db.execute('select count(*) from repo_commits').fetchone()[0]==27
            assert db.execute("select count(*) from repo_commits where date(date) is null").fetchone()[0]==0
            assert db.execute('select latest_commit_date from repo_status_snapshots order by id desc limit 1').fetchone()[0].endswith('Z')
        limited=snippet('from src.scanner import collect_history_report\nprint(to_json(collect_history_report('+json.dumps(str(repo))+',5)))')
        assert limited['complete'] is False and len(limited['commits'])==5
        shallow=temp/'shallow'
        subprocess.check_call(['git','clone','--quiet','--depth=1',repo.as_uri(),str(shallow)],env=env,stderr=subprocess.DEVNULL)
        shallow_report=snippet('from src.scanner import collect_history_report\nprint(to_json(collect_history_report('+json.dumps(str(shallow))+',100)))')
        assert shallow_report['complete'] is False and 'Shallow' in shallow_report['error']
        # Simulate persisted legacy v3 data; migration redacts every snapshot, normalizes dates,
        # preserves exclusion/registry state and invalidates completeness until a verified scan.
        with sqlite3.connect(temp/'test.db') as db:
            db.execute('delete from schema_version where version>=4')
            db.execute('insert or ignore into schema_version(version) values(3)')
            db.execute("update repo_status_snapshots set remote_url=?,latest_commit_date='2026-01-01 00:30:00 +0530'",(next(iter(urls)),))
            db.execute("update repo_commits set author='broken',message='broken',date='not-a-date'")
            db.execute("insert into discovery_exclusions(path) values('/missing/hidden')")
        with sqlite3.connect(temp/'test.db') as db:
            db.execute("create trigger fail_migration before update on repo_status_snapshots begin select raise(ABORT,'fixture migration failure'); end")
        migration_failure=subprocess.run(prefix+['src/main.kujo','doctor','--json'],cwd=ROOT,env=env,capture_output=True,text=True)
        assert migration_failure.returncode!=0
        with sqlite3.connect(temp/'test.db') as db:
            assert db.execute('select max(version) from schema_version').fetchone()[0]==3
            db.execute('drop trigger fail_migration')
        cli('doctor','--json');cli('doctor','--json')
        with sqlite3.connect(temp/'test.db') as db:
            assert db.execute('select max(version) from schema_version').fetchone()[0]==4
            remote,date=db.execute('select remote_url,latest_commit_date from repo_status_snapshots limit 1').fetchone()
            assert 'FAKE-AUDIT-TOKEN' not in remote and date=='2025-12-31T19:00:00Z'
            assert db.execute('select count(*) from discovery_exclusions').fetchone()[0]==1
            assert db.execute('select history_complete from repos').fetchone()[0]==0
        cli('scan','1','--json')
        with sqlite3.connect(temp/'test.db') as db:
            assert db.execute("select count(*) from repo_commits where author='broken' or date='' or message='broken'").fetchone()[0]==0
        # Branch rewrites remove unreachable cached commits, rather than accumulating ghost history.
        git('reset','--soft','HEAD~5');cli('scan','1','--json')
        with sqlite3.connect(temp/'test.db') as db:
            assert db.execute('select count(*) from repo_commits').fetchone()[0]==22
            snapshot_count=db.execute('select count(*) from repo_status_snapshots').fetchone()[0]
            db.execute("create trigger fail_history before insert on repo_commits begin select raise(ABORT,'fixture failure'); end")
        # A failed history write must preserve both the previous snapshot and full previous cache.
        failed=subprocess.run(prefix+['src/main.kujo','scan','1','--json'],cwd=ROOT,env=env,capture_output=True,text=True)
        assert failed.returncode!=0
        with sqlite3.connect(temp/'test.db') as db:
            assert db.execute('select count(*) from repo_status_snapshots').fetchone()[0]==snapshot_count
            assert db.execute('select count(*) from repo_commits').fetchone()[0]==22
            db.execute('drop trigger fail_history')
        # HTTP uses the same collection path, reports incomplete migrations/unscanned repos,
        # and serves daily buckets, a bounded detail list, and redacted exports/backups.
        port=free_port()
        def request(path, method='GET'):
            with urlopen(Request(f'http://127.0.0.1:{port}'+path,method=method),timeout=30) as response:return response.read()
        with (temp/'server.log').open('w') as log:
            proc=subprocess.Popen(prefix+['src/main.kujo','serve',str(port)],cwd=ROOT,env=env,stdout=log,stderr=log)
            try:
                wait_until_ready(port)
                assert json.loads(request('/api/repos/1/scan','POST'))['success']
                activity=json.loads(request('/api/activity?days=7'))
                assert activity['total_commits']==22 and activity['history_complete'] is True,activity
                assert all(day['day'] for day in activity['commits_by_day'])
                detail=json.loads(request('/api/repos/1'))
                assert len(detail['recent_commits'])==20
                assert b'FAKE-AUDIT-TOKEN' not in request('/api/export')
                backup=request('/api/export/db');(temp/'backup.db').write_bytes(backup)
                with sqlite3.connect(temp/'backup.db') as db:
                    assert not any('FAKE-AUDIT-TOKEN' in (row[0] or '') for row in db.execute('select remote_url from repo_status_snapshots'))
                with sqlite3.connect(temp/'test.db') as db:db.execute("update repos set history_complete=0,history_error='Fixture partial history'")
                activity=json.loads(request('/api/activity?days=7'))
                assert activity['history_complete'] is False and len(activity['incomplete_repos'])==1
            finally:
                proc.terminate()
                try: proc.wait(timeout=5)
                except subprocess.TimeoutExpired: proc.kill();proc.wait(timeout=5)
        print(('interpreter' if interpreter else 'vm')+': R11–R15 metadata/history regressions passed')

if __name__=='__main__':
    check(False)
    check(True)
