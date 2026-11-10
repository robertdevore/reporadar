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
