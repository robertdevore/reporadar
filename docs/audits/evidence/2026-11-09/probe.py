#!/usr/bin/env python3
"""Read-only implementation audit; all runtime writes use disposable fixtures."""
import json, os, platform, socket, sqlite3, statistics, subprocess, tempfile, time
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
ROOT = Path(__file__).resolve().parents[4]
KUJO = os.environ.get('KUJO_BIN', 'kujo')
result = {'platform': platform.platform(), 'runtime': subprocess.check_output([KUJO,'--version'],text=True).strip()}
with tempfile.TemporaryDirectory(prefix='reporadar-audit-') as td:
    tmp=Path(td); env=os.environ.copy(); env['REPORADAR_DB']=str(tmp/'test.db')
    def cli(*args):
        return subprocess.run([KUJO,'run','src/main.kujo',*args],cwd=ROOT,env=env,capture_output=True,text=True,timeout=30)
    def snippet(source):
        p=tmp/'probe.kujo'; p.write_text(source)
        r=subprocess.run([KUJO,'run',str(p)],cwd=ROOT,env=env,capture_output=True,text=True,timeout=30)
        assert r.returncode==0,(r.stdout,r.stderr)
        return json.loads(r.stdout)
    repo=tmp/'repo'; repo.mkdir()
    def git(*args): return subprocess.check_output(['git','-C',str(repo),*args],stderr=subprocess.DEVNULL,text=True)
    git('init'); git('config','user.email','audit@example.invalid'); git('config','user.name','Audit')
    (repo/'old').write_text('fixture'); git('add','.'); git('commit','-m','fixture'); git('mv','old','new')
    result['rename']=snippet('from src.scanner import scan_repo\nprint(to_json(scan_repo('+json.dumps(str(repo))+')))')
    result['rename']={k:result['rename'][k] for k in ['staged_count','unstaged_count','file_changes']}
    git('commit','-am','rename'); git('checkout','--detach')
    data=snippet('from src.scanner import scan_repo\nprint(to_json(scan_repo('+json.dumps(str(repo))+')))')
    result['detached']={k:data[k] for k in ['branch','is_detached']}
    tree=tmp/'tree'; tree.mkdir()
    for name in ('a','b','c'): (tree/name/'.git').mkdir(parents=True)
    result['discovery']=snippet('from src.server import discover_repos_with_budget\nmut budget={"entries_remaining":100,"results_remaining":1}\nmut found=discover_repos_with_budget('+json.dumps(str(tree))+',3,0,[],budget)\nprint(to_json({"count":len(found),"budget_after":budget}))')
    (repo/'untracked').write_text('fixture')
    result['partial_scan']=snippet('from src.db import create_schema_with_options\nfrom src.registry import add_repo, store_scan_result\nfrom src.scanner import scan_repo\nmut db=db_connect("sqlite", ":memory:")\ncreate_schema_with_options(db,false)\nmut added=add_repo(db,'+json.dumps(str(repo))+',"","","","",0)\ndb_execute(db,"CREATE TRIGGER audit_fail BEFORE INSERT ON repo_file_changes BEGIN SELECT RAISE(ABORT, \'audit failure\'); END")\nmut failed=false\ntry { store_scan_result(db,added["id"],scan_repo('+json.dumps(str(repo))+')) } except err { failed=true }\nprint(to_json({"failed":failed,"snapshots":db_query(db,"SELECT COUNT(*) AS n FROM repo_status_snapshots"),"changes":db_query(db,"SELECT COUNT(*) AS n FROM repo_file_changes")}))')
    assert cli('doctor','--json').returncode==0
    with socket.socket() as sock: sock.bind(('127.0.0.1',0)); port=sock.getsockname()[1]
    with (tmp/'server.log').open('w') as log:
        proc=subprocess.Popen([KUJO,'run','src/main.kujo','serve',str(port)],cwd=ROOT,env=env,stdout=log,stderr=log)
        try:
            def request(path,method='GET',data=None,headers=None):
                hdr={'Content-Type':'application/json','Origin':f'http://127.0.0.1:{port}'}; hdr.update(headers or {})
                req=Request(f'http://127.0.0.1:{port}'+path,data=data,method=method,headers=hdr)
                try:
                    with urlopen(req,timeout=15) as r: return r.status,r.read()
                except HTTPError as r: return r.code,r.read()
            deadline=time.monotonic()+15
            while True:
                try:
                    if request('/api/repos')[0]==200: break
                except URLError: pass
                if time.monotonic()>deadline: raise RuntimeError('server not ready')
                time.sleep(.05)
            payload={'app':'reporadar','repos':[{'path':str(repo)}],'settings':{f'k{i}':'x' for i in range(51)}}
            status,body=request('/api/import','POST',json.dumps(payload).encode())
            result['rejected_import']={'status':status,'body':body.decode(),'repos_after':json.loads(request('/api/repos')[1])['total']}
            status,body=request('/api/repos','POST',b'{')
            result['malformed_json']={'status':status,'body':body.decode()[:250]}
            status,body=request('/api/settings','PUT',b'{"settings":{"audit_host":"accepted"}}',{'Host':'audit.invalid','Origin':'http://audit.invalid'})
            result['host_validation']={'status':status,'body':body.decode()}
            conn=sqlite3.connect(tmp/'test.db'); conn.execute('PRAGMA wal_autocheckpoint=0')
            conn.execute("INSERT INTO settings(key,value) VALUES ('wal_audit_marker','latest')"); conn.commit()
            status,body=request('/api/export/db'); result['backup']={'status':status,'bytes':len(body)}
            if status==200:
                backup=tmp/'download.db'; backup.write_bytes(body)
                try:
                    b=sqlite3.connect(backup); result['backup']['integrity']=b.execute('PRAGMA integrity_check').fetchone()[0]; result['backup']['marker']=b.execute("SELECT value FROM settings WHERE key='wal_audit_marker'").fetchall(); b.close()
                except sqlite3.Error as e: result['backup']['sqlite_error']=str(e)
            else: result['backup']['body']=body.decode()[:250]
            conn.close()
            result['health_after_backup']={'status':request('/api/repos')[0]}
            proc.terminate()
            try: proc.wait(timeout=5)
            except subprocess.TimeoutExpired: proc.kill(); proc.wait()
            proc=subprocess.Popen([KUJO,'run','src/main.kujo','serve',str(port)],cwd=ROOT,env=env,stdout=log,stderr=log)
            deadline=time.monotonic()+15
            while True:
                try:
                    if request('/api/repos')[0]==200: break
                except URLError: pass
                if time.monotonic()>deadline: raise RuntimeError('restart not ready')
                time.sleep(.05)
            result['benchmarks']=[]
            for n in (30,100,500):
                c=sqlite3.connect(tmp/'test.db'); c.execute('DELETE FROM repo_status_snapshots'); c.execute('DELETE FROM repos')
                c.executemany('INSERT INTO repos(id,name,path) VALUES (?,?,?)',[(i,f'repo-{i}',f'/audit/repo-{i}') for i in range(1,n+1)])
                c.executemany("INSERT INTO repo_status_snapshots(repo_id,branch,is_clean,latest_commit_date) VALUES (?,'main',1,'2026-11-09 12:00:00 +0000')",[(i,) for i in range(1,n+1) for _ in range(250)])
                c.commit(); c.close()
                lat=[]; size=0
                for _ in range(3):
                    start=time.perf_counter(); status,body=request('/api/repos'); lat.append(round((time.perf_counter()-start)*1000,2)); size=len(body); 
                    if status != 200: break
                    assert json.loads(body)['total']==n
                output=cli('list','--json')
                result['benchmarks'].append({'repos':n,'snapshots':n*250,'http_ms':lat,'median_ms':statistics.median(lat),'http_bytes':size,'cli_json_bytes':len(output.stdout.encode()),'http_status':status,'http_error':body.decode()[:250] if status!=200 else None,'cli_exit':output.returncode,'cli_error':output.stderr[:500]})
        finally:
            proc.terminate()
            try: proc.wait(timeout=5)
            except subprocess.TimeoutExpired: proc.kill(); proc.wait()
print(json.dumps(result,indent=2))
