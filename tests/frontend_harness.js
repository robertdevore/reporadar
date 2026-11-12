// Execute shipped browser code with a minimal DOM; no third-party test dependency.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const context = vm.createContext({
  document: { addEventListener() {} },
  localStorage: { getItem() { return null; } },
  URLSearchParams, Date, console,
});
vm.runInContext(fs.readFileSync('static/app.js', 'utf8'), context);
vm.runInContext(`
  staleThresholdDays = 2;
  globalThis.fixtures = [
    {id:1,is_clean:1,has_remote:1,dependabot_alert_count:3,latest_commit_date:new Date().toISOString()},
    {id:2,is_clean:1,scan_error:'failed',has_remote:1,dependabot_alert_count:5,latest_commit_date:new Date().toISOString()},
    {id:3,is_clean:null,has_remote:null},
    {id:4,is_clean:0,has_remote:1,ahead_count:2,behind_count:1,latest_commit_date:new Date(Date.now()-3*86400000).toISOString()}
  ];
`, context);
const summary = vm.runInContext('buildSummaryFromRepos(fixtures)', context);
assert.equal(summary.clean, 1);
assert.equal(summary.dirty, 1);
assert.equal(summary.errors, 1);
assert.equal(summary.dependabot_alerts, 8);
assert.equal(summary.ahead, 1);
assert.equal(summary.behind, 1);
assert.equal(summary.diverged, 1);
assert.equal(summary.stale, 1);
assert.equal(summary.no_remote, 0);
assert.equal(summary.attention_repos, 4);
assert.equal(vm.runInContext("buildSummaryFromRepos([], {total:99}).total", context), 0);
assert.equal(vm.runInContext("renderRow(fixtures[2]).includes('Unscanned')", context), true);
const buttons = [7, 30, 90].map(days => ({dataset:{days}, classList:{toggle(name, value) {this.active=value;}}, addEventListener(){}}));
let ready;
let requested;
const activity = vm.createContext({
  document: { addEventListener(event, fn) { ready=fn; }, querySelectorAll() { return buttons; } },
  fetch: async () => ({ok:true, json:async () => ({settings:{default_activity_window:'30'}})}),
});
vm.runInContext(fs.readFileSync('static/activity.js', 'utf8'), activity);
activity.record = days => {requested=days;};
vm.runInContext('loadActivity = days => record(days)', activity);
(async () => {
  await ready();
  assert.equal(requested, 30);
  assert.equal(buttons[1].classList.active, true);
  console.log('Frontend health and settings regressions passed');
})().catch(err => {console.error(err); process.exitCode=1;});

// Discovery controls update the visible results only after a successful save.
(async () => {
  const elements = new Map();
  const element = id => {
    if (!elements.has(id)) elements.set(id, {innerHTML:'',textContent:'',style:{},disabled:false});
    return elements.get(id);
  };
  const saved = new Set();
  const discovery = vm.createContext({
    document: {addEventListener(){}, getElementById:element},
    fetch: async (url, options) => {
      const {action, paths} = JSON.parse(options.body);
      paths.forEach(path => action === 'exclude' ? saved.add(path) : saved.delete(path));
      return {ok:true,json:async () => ({excluded:[...saved].map(path => ({path}))})};
    }
  });
  vm.runInContext(fs.readFileSync('static/discovery.js','utf8'), discovery);
  vm.runInContext("showToast = () => {}; lastDiscoveryData = {new_repos:[{name:'Example',path:'/tmp/example'}], already_tracked:2, excluded_count:0}; renderDiscovery();", discovery);
  assert.match(element('result-list').innerHTML, /data-exclude="0"/);
  await vm.runInContext("updateExclusions('exclude',['/tmp/example'])", discovery);
  assert.equal(saved.size,1);
  assert.equal(element('btn-add-selected').style.display,'none');
  assert.match(element('excluded-list').innerHTML,/Restore/);
  await vm.runInContext("updateExclusions('restore',['/tmp/example'])", discovery);
  assert.equal(saved.size,0);
  assert.match(element('excluded-list').innerHTML,/No hidden/);
  console.log('Discovery hide and restore frontend regressions passed');
})().catch(err => { console.error(err); process.exitCode=1; });

// Invalid cached dates must stay text even before the next repairing scan.
for (const file of ['detail', 'activity']) {
  const markup = '<img src=x onerror="fixture()">';
  const sandbox = vm.createContext({document:{addEventListener(){}},window:{location:{search:'?id=1'}},URLSearchParams,Date});
  vm.runInContext(fs.readFileSync('static/'+file+'.js','utf8'),sandbox);
  sandbox.dateFixture=markup;
  assert.equal(vm.runInContext('formatDate(dateFixture)',sandbox).includes('<img'),false);
}

(async () => {
  const elements = new Map();
  const el = id => {
    if (!elements.has(id)) elements.set(id,{textContent:'',classList:{add(){},remove(){},toggle(name,value){this.hidden=value;}}});
    return elements.get(id);
  };
  const sandbox=vm.createContext({document:{addEventListener(){},getElementById:el},fetch:async()=>({ok:true,json:async()=>({total_commits:27,history_complete:false,incomplete_repos:[{id:1}]})})});
  vm.runInContext(fs.readFileSync('static/activity.js','utf8'),sandbox);
  vm.runInContext('renderChart=renderMostActive=renderLeastActive=renderStale=renderCommitFeed=()=>{}',sandbox);
  await vm.runInContext('loadActivity(7)',sandbox);
  assert.match(el('history-warning').textContent,/incomplete for 1 repositories/);
  assert.equal(el('history-warning').classList.hidden,false);
  console.log('History completeness and safe date rendering regressions passed');
})().catch(err=>{console.error(err);process.exitCode=1;});
