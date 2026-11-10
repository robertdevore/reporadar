// RepoRadar — Activity Page

let currentDays = 7;

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const data = await apiFetch('/api/settings');
    const configuredDays = parseInt(data.settings.default_activity_window, 10);
    currentDays = configuredDays > 0 ? Math.min(365, configuredDays) : 7;
  } catch (err) { showToast('Could not load activity settings', 'error'); }
  document.querySelectorAll('.window-btn').forEach(btn => btn.classList.toggle('active', Number(btn.dataset.days) === currentDays));
  setupWindowButtons();
  loadActivity(currentDays);
});

function setupWindowButtons() {
  document.querySelectorAll('.window-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.window-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentDays = parseInt(btn.dataset.days);
      loadActivity(currentDays);
    });
  });
}

async function apiFetch(url, options = {}) {
  try {
    const resp = await fetch(url, options);
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    return await resp.json();
  } catch (err) { throw err; }
}

async function loadActivity(days) {
  document.getElementById('loading-state').classList.remove('hidden');
  document.getElementById('activity-content').classList.add('hidden');

  try {
    const data = await apiFetch('/api/activity?days=' + days);
    document.getElementById('loading-state').classList.add('hidden');
    document.getElementById('activity-content').classList.remove('hidden');

    document.getElementById('sum-total').textContent = data.total_commits;
    document.getElementById('sum-active').textContent = data.commits_per_repo ? data.commits_per_repo.length : 0;
    document.getElementById('sum-stale').textContent = data.stale_repos ? data.stale_repos.length : 0;

    renderChart(data.commits_by_day || []);
    renderMostActive(data.most_active || []);
    renderLeastActive(data.least_active || []);
    renderStale(data.stale_repos || []);
    renderCommitFeed(data.recent_commits || []);
  } catch (err) {
    document.getElementById('loading-state').classList.add('hidden');
    showToast('Failed to load activity data', 'error');
  }
}

function renderChart(commitsByDay) {
  const container = document.getElementById('chart-container');
  if (commitsByDay.length === 0) {
    container.innerHTML = '<p style="color:var(--charcoal);text-align:center;">No commits in this window</p>';
    return;
  }

  const maxCount = Math.max(...commitsByDay.map(d => d.count || 0), 1);

  let html = '<div class="chart-bar">';
  commitsByDay.forEach(d => {
    const height = Math.max((d.count / maxCount) * 100, 2);
    html += '<div style="flex:1;text-align:center;">';
    html += '<div class="chart-value">' + d.count + '</div>';
    html += '<div class="chart-bar-item" style="height:' + height + 'px;" title="' + d.day + ': ' + d.count + ' commits"></div>';
    html += '<div class="chart-label">' + (d.day || '').slice(5) + '</div>';
    html += '</div>';
  });
  html += '</div>';
  container.innerHTML = html;
}

function renderMostActive(repos) {
  const container = document.getElementById('most-active');
  if (repos.length === 0) {
    container.innerHTML = '<p style="color:var(--charcoal);">No active repos</p>';
    return;
  }
  container.innerHTML = repos.map(r => `
    <div class="repo-row">
      <span>${escHtml(r.display_name || r.repo_name)}</span>
      <span class="repo-count">${r.commit_count} commits</span>
    </div>
  `).join('');
}

function renderLeastActive(repos) {
  const container = document.getElementById('least-active');
  if (repos.length === 0) {
    container.innerHTML = '<p style="color:var(--charcoal);">No repos with low activity</p>';
    return;
  }
  container.innerHTML = repos.map(r => `
    <div class="repo-row">
      <span>${escHtml(r.display_name || r.repo_name)}</span>
      <span class="repo-count">${r.commit_count} commits</span>
    </div>
  `).join('');
}

function renderStale(repos) {
  const container = document.getElementById('stale-repos');
  if (repos.length === 0) {
    container.innerHTML = '<p style="color:var(--success);">All repos have recent activity</p>';
    return;
  }
  container.innerHTML = repos.slice(0, 10).map(r => `
    <div class="repo-row">
      <span>${escHtml(r.name)}</span>
      <span style="color:var(--charcoal);font-size:12px;">${r.last_commit_date ? 'Last: ' + r.last_commit_date.slice(0,10) : 'Never'}</span>
    </div>
  `).join('');
}

function renderCommitFeed(commits) {
  const container = document.getElementById('commit-feed');
  if (commits.length === 0) {
    container.innerHTML = '<p style="color:var(--charcoal);">No recent commits</p>';
    return;
  }
  container.innerHTML = commits.slice(0, 50).map(c => `
    <div class="commit-item">
      <span class="commit-repo">[${escHtml(c.repo_name || c.repo_display_name)}]</span>
      <span class="commit-msg">${escHtml(c.message)}</span>
      <span class="commit-meta">— ${escHtml(c.author)}, ${formatDate(c.date)}</span>
    </div>
  `).join('');
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const now = new Date();
    const diffMs = now - d;
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays < 1) return 'Today';
    if (diffDays < 7) return diffDays + 'd ago';
    return d.toLocaleDateString();
  } catch (e) { return dateStr; }
}

function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function showToast(message, type) {
  const toast = document.createElement('div');
  toast.className = 'toast toast-' + (type || 'success');
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
