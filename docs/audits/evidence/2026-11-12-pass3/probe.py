#!/usr/bin/env python3
"""Review-only reproductions. All writes are confined to temporary fixtures."""
import json, os, pathlib, sqlite3, subprocess, sys, tempfile, shutil, shlex
ROOT=pathlib.Path(__file__).resolve().parents[4]
sys.path.insert(0,str(ROOT/'tests'))
from server_smoke_harness import free_port, wait_until_ready, request

def check(interpreter):
 with tempfile.TemporaryDirectory(prefix='reporadar-pass3-') as td:
  t=pathlib.Path(td); env=dict(os.environ, REPORADAR_DB=str(t/'test.db'),GIT_CONFIG_GLOBAL=str(t/'global'),GIT_CONFIG_NOSYSTEM='1')
  prefix=['kujo','run']+(['--interpreter'] if interpreter else [])
  def run(args): return subprocess.check_output(args,cwd=ROOT,env=env,stderr=subprocess.DEVNULL,text=True).strip()
  def snippet(code):
   f=t/'probe.kujo';f.write_text(code);return json.loads(run(prefix+[str(f)]))
  repo=t/'repo';repo.mkdir()
  def git(*args): return run(['git','-C',str(repo),*args])
  git('init');git('config','user.name','Fixture');git('config','user.email','fixture@example.invalid');git('commit','--allow-empty','-m','initial')
  names=['café.txt','line\nbreak.txt','quote".txt','space-end ']
  for n in names:(repo/n).write_text('fixture')
  scan=snippet('from src.scanner import scan_repo\nprint(to_json(scan_repo('+json.dumps(str(repo))+')))')
  actual=[f['file_path'] for f in scan['file_changes']]
  assert set(actual)!=set(names)
  rows={'runtime':'interpreter' if interpreter else 'vm','R16':{'expected_paths':names,'actual_paths':actual,'count':scan['changed_total']}}
  port=free_port()
  with open(t/'server.log','w') as log:
   proc=subprocess.Popen(prefix+['src/main.kujo','serve',str(port)],cwd=ROOT,env=env,stdout=log,stderr=log)
   try:
    wait_until_ready(port)
    with sqlite3.connect(t/'test.db') as db:
     db.execute("CREATE TRIGGER fail_second_setting BEFORE INSERT ON settings WHEN NEW.key LIKE 'audit_%' AND (SELECT count(*) FROM settings WHERE key LIKE 'audit_%') > 0 BEGIN SELECT RAISE(ABORT,'fixture write failure'); END")
    status,body,_=request(port,'/api/settings',method='PUT',payload={'settings':{'audit_a':'a','audit_b':'b'}})
    with sqlite3.connect(t/'test.db') as db: saved=db.execute("SELECT key,value FROM settings WHERE key LIKE 'audit_%'").fetchall()
    assert status==500 and len(saved)==1
    rows['R17']={'http_status':status,'persisted_after_failed_request':saved}
    parent=t/'many';parent.mkdir()
    # Discovery itself uses .git markers; no Git subprocess is needed for these fixtures.
    paths=[]
    for i in range(1001):
     p=parent/f'r{i:04}';(p/'.git').mkdir(parents=True);paths.append(str(p))
    status,body,_=request(port,'/api/discovery/exclusions',method='PUT',payload={'action':'exclude','paths':paths[:1000]})
    assert status==200,(status,body)
    results=[]
    for _ in range(2):
     status,body,_=request(port,'/api/discover',method='POST',payload={'path':str(parent),'max_depth':2})
     assert status==200 and body['truncated'] and body['new_repos']==[],body
     results.append({k:body[k] for k in ['truncated','total_found','excluded_count','entries_examined','new_repos']})
    status,narrow,_=request(port,'/api/discover',method='POST',payload={'path':paths[-1],'max_depth':1})
    assert len(narrow['new_repos'])==1
    rows['R18']={'repeated_parent_scan':results,'narrowed_last_repository_found':True}
   finally:
    proc.terminate()
    try:proc.wait(timeout=3)
    except subprocess.TimeoutExpired:proc.kill();proc.wait()
  # A wrapper schedules a real branch checkout immediately AFTER status completes.
  # This models another process; it does not fabricate Git output.
  old_branch=git('branch','--show-current')
  git('checkout','-b','audit-other');git('commit','--allow-empty','-m','other branch')
  other_hash=git('rev-parse','HEAD');git('checkout',old_branch)
  run(prefix+['src/main.kujo','add',str(repo)])
  real_git=shutil.which('git'); bindir=t/'bin';bindir.mkdir();wrapper=bindir/'git'
  wrapper.write_text('#!/bin/sh\n'+shlex.quote(real_git)+' "$@"\nstatus=$?\ncase " $* " in\n*" status --porcelain=v1 --branch --untracked-files=all "*) '+shlex.quote(real_git)+' -C '+shlex.quote(str(repo))+' checkout --quiet audit-other ;;\nesac\nexit "$status"\n')
  wrapper.chmod(0o700);env['PATH']=str(bindir)+os.pathsep+env['PATH']
  observed=snippet('from src.db import init_db\nfrom src.registry import scan_and_store\nmut db=init_db()\nprint(to_json(scan_and_store(db,1,'+json.dumps(str(repo))+',false)))')
  assert observed['success'] and observed['branch']==old_branch and observed['latest_commit_hash']==other_hash
  with sqlite3.connect(t/'test.db') as db:
   persisted=db.execute('SELECT branch,latest_commit_hash,scan_error FROM repo_status_snapshots ORDER BY id DESC LIMIT 1').fetchone()
  rows['R19']={'success':observed['success'],'reported_branch':observed['branch'],'actual_branch':'audit-other','latest_commit_matches_other_branch':observed['latest_commit_hash']==other_hash,'persisted_branch':persisted[0],'persisted_scan_error':persisted[2]}
  return rows
if __name__=='__main__':
 results=[check(False),check(True)]
 out=pathlib.Path(__file__).with_name('results.json');out.write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n');print(json.dumps(results,ensure_ascii=False))
