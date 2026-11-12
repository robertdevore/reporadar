#!/usr/bin/env python3
"""Review-only evidence; disposable repositories/databases, no live registry access."""
import json, os, subprocess, tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[4]
KUJO=os.environ.get('KUJO_BIN','kujo')
results={}
with tempfile.TemporaryDirectory(prefix='reporadar-review-') as td:
 p=Path(td); repo=p/'repo';repo.mkdir()
 def git(*args,input=None):
  return subprocess.check_output(['git','-C',str(repo),*args],input=input,stderr=subprocess.DEVNULL).decode().strip()
 def snippet(code):
  f=p/'probe.kujo';f.write_text(code)
  r=subprocess.run([KUJO,'run',str(f)],cwd=ROOT,capture_output=True,text=True,timeout=30)
  assert r.returncode==0,(r.stdout,r.stderr)
  return json.loads(r.stdout)
 git('init');git('config','user.name','Fixture');git('config','user.email','fixture@example.invalid')
 (repo/'tracked').write_text('x');git('add','.');git('commit','-m','baseline')
 scan='from src.scanner import scan_repo\nprint(to_json(scan_repo('+json.dumps(str(repo))+')))'
 (repo/'untracked').write_text('untracked')
 normal=snippet(scan);git('config','status.showUntrackedFiles','no');hidden=snippet(scan)
 results['untracked_config']={'normal':{k:normal[k] for k in ['is_clean','untracked_count']},'configured':{k:hidden[k] for k in ['is_clean','untracked_count']}}
 git('remote','add','origin','https://fixture-user:FAKE-AUDIT-TOKEN@example.invalid/team/repo.git')
 results['remote_retention']=snippet(scan)['remote_url']
 # A normal Git author containing the record delimiter corrupts field boundaries.
 git('config','user.name','Fixture---not-a-date')
 git('commit','--allow-empty','-m','delimiter fixture')
 crafted=snippet(scan)
 results['delimiter_author']={k:crafted[k] for k in ['latest_commit_author','latest_commit_date','latest_commit_message']}
 payload='<img src=x onerror="document.documentElement.dataset.audit=true">'
 js="""const vm=require('vm'),fs=require('fs');const result={};for(const file of ['detail','activity']){let html='';const el={set innerHTML(v){html=v;},get innerHTML(){return html;},textContent:'',classList:{add(){},remove(){}}};const context={document:{addEventListener(){},getElementById(){return el;}},window:{location:{search:'?id=1'}},URLSearchParams,Date};vm.createContext(context);vm.runInContext(fs.readFileSync('static/'+file+'.js','utf8'),context);context.c={date:process.argv[1],author:'Fixture',message:'audit',short_hash:'abc',commit_hash:'abc',repo_id:1,repo_name:'fixture'};if(file==='detail')vm.runInContext('renderDetail({repo:{id:1},recent_commits:[c]})',context);else vm.runInContext('renderCommitFeed([c])',context);result[file]=html.includes(process.argv[1]);}console.log(JSON.stringify(result));"""
 # Resolve the actual feed function name from source, then call the renderer.
 # Renderer name checked against static/activity.js.
 r=subprocess.run(['node','-e',js,payload],cwd=ROOT,capture_output=True,text=True)
 results['synthetic_invalid_date_render_NOT_end_to_end']={'exit':r.returncode,'output':r.stdout.strip(),'error':r.stderr.strip()}
 code='''from src.db import create_schema_with_options
from src.registry import get_commits_by_day, get_activity_total
mut db=db_connect("sqlite",":memory:")
create_schema_with_options(db,false)
db_execute(db,"INSERT INTO repos(name,path) VALUES ('fixture','/fixture')")
mut day=db_query(db,"SELECT date('now') as d")[0]["d"]
db_execute(db,"INSERT INTO repo_commits(repo_id,commit_hash,short_hash,author,date,message) VALUES (1,'a','a','Fixture','"+day+" 12:00:00 -0500','fixture')")
print(to_json({"total":get_activity_total(db,7),"by_day":get_commits_by_day(db,7)}))'''
 results['activity_git_date']=snippet(code)
 git('config','user.name','Fixture')
 for i in range(25):git('commit','--allow-empty','-m',f'recent {i}')
 results['history_capture']=snippet('from src.scanner import collect_recent_commits\nprint(to_json({"default":len(collect_recent_commits('+json.dumps(str(repo))+',0)),"window":len(collect_recent_commits('+json.dumps(str(repo))+',7))}))')
print(json.dumps(results,indent=2))
