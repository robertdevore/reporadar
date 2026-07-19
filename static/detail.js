// RepoRadar — Repo Detail Page

const urlParams = new URLSearchParams(window.location.search);
const repoId = urlParams.get('id');
let currentRepo = null;

document.addEventListener('DOMContentLoaded', () => {
  if (!repoId) {
    showError('No repository ID provided');
    return;
  }
  loadDetail();
});

async function apiFetch(url, options = {}) {
  try {
    const resp = await fetch(url, options);
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    return await resp.json();
  } catch (err) {
    throw err;
  }
}

async function loadDetail() {
  try {
    const data = await apiFetch('/api/repos/' + repoId);
    document.getElementById('loading-state').classList.add('hidden');
    document.getElementById('detail-content').classList.remove('hidden');
    renderDetail(data);
  } catch (err) {
    document.getElementById('loading-state').classList.add('hidden');
    document.getElementById('error-state').classList.remove('hidden');
    document.getElementById('error-msg').textContent = err.message;
  }
}

function renderDetail(data) {
  const repo = data.repo;
  currentRepo = repo;
  const fileChanges = data.file_changes || [];
  const commits = data.recent_commits || [];
  const scanHistory = data.scan_history || [];

  let statusBadge = '<span class="badge badge-clean">Clean</span>';
  if (repo.scan_error && repo.scan_error !== '') {
    statusBadge = '<span class="badge badge-error">Error: ' + escHtml(repo.scan_error) + '</span>';
  } else if (repo.is_clean === 0) {
    statusBadge = '<span class="badge badge-dirty">Dirty</span>';
  }

  const pinned = repo.pinned === 1 ? ' <span class="badge badge-pinned">★ Pinned</span>' : '';
  const ahead = repo.ahead_count || 0;
  const behind = repo.behind_count || 0;
  const latestCommitUrl = hostedCommitUrl(repo.remote_url, repo.latest_commit_hash);
  const latestCommitHash = repo.latest_commit_short_hash || '-';
  const latestCommitHashHtml = latestCommitUrl
    ? '<a href="' + escAttr(latestCommitUrl) + '" target="_blank" rel="noopener" class="commit-hash">' + escHtml(latestCommitHash) + '</a>'
    : '<span class="commit-hash">' + escHtml(latestCommitHash) + '</span>';

  let aheadBehind = '';
  if (repo.is_diverged === 1) {
    aheadBehind = '<span class="badge badge-diverged">Diverged (↑' + ahead + ' ↓' + behind + ')</span>';
  } else if (ahead > 0) {
    aheadBehind = '<span class="badge badge-ahead">Ahead ↑' + ahead + '</span>';
  } else if (behind > 0) {
    aheadBehind = '<span class="badge badge-behind">Behind ↓' + behind + '</span>';
  }

  let fileSection = '';
  if (fileChanges.length > 0) {
    const stagedFiles = fileChanges.filter(f => f.staged === 1);
    const unstagedFiles = fileChanges.filter(f => f.unstaged === 1);
    const untrackedFiles = fileChanges.filter(f => f.untracked === 1);

    fileSection = `
      <div class="card card-full">
        <h3>📁 File Changes (${fileChanges.length})</h3>
        ${stagedFiles.length > 0 ? '<h4 style="color:var(--success);margin-top:8px;">Staged (' + stagedFiles.length + ')</h4><div class="file-list">' + renderFiles(stagedFiles) + '</div>' : ''}
        ${unstagedFiles.length > 0 ? '<h4 style="color:var(--warning);margin-top:8px;">Unstaged (' + unstagedFiles.length + ')</h4><div class="file-list">' + renderFiles(unstagedFiles) + '</div>' : ''}
        ${untrackedFiles.length > 0 ? '<h4 style="color:var(--charcoal);margin-top:8px;">Untracked (' + untrackedFiles.length + ')</h4><div class="file-list">' + renderFiles(untrackedFiles) + '</div>' : ''}
      </div>
    `;
  }

  let commitSection = '';
  if (commits.length > 0) {
    commitSection = `
      <div class="card">
        <h3><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:6px;"><circle cx="12" cy="12" r="3"/><line x1="3" x2="9" y1="12" y2="12"/><line x1="15" x2="21" y1="12" y2="12"/></svg> Recent Commits (${commits.length})</h3>
        <div class="commit-list">
          ${commits.slice(0, 20).map(c => `
            <div class="commit-item">
              ${renderCommitHash(repo.remote_url, c)}
              <span class="commit-msg">${escHtml(c.message)}</span>
              <span class="commit-meta">— ${escHtml(c.author)}, ${formatDate(c.date)}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  let scanSection = '';
  if (scanHistory.length > 0) {
    scanSection = `
      <div class="card">
        <h3><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:6px;"><path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg> Scan History</h3>
        ${scanHistory.slice(0, 5).map(s => `
          <div class="info-row">
            <span class="info-label">${s.scanned_at}</span>
            <span class="info-value">${s.scan_error ? '⚠ ' + escHtml(s.scan_error) : '✓ Clean: ' + s.is_clean + ' | Branch: ' + escHtml(s.branch || 'N/A')}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  const html = `
    <div class="detail-layout">
      <div class="card">
        <h3><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:6px;"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg> Repository Info</h3>
        <div class="info-row"><span class="info-label">Name</span><span class="info-value">${escHtml(repo.display_name || repo.name)}${pinned}</span></div>
        <div class="info-row"><span class="info-label">Path</span><span class="info-value" style="font-family:monospace;font-size:12px;">${escHtml(repo.path)}</span></div>
        <div class="info-row"><span class="info-label">Group</span><span class="info-value">${escHtml(repo.group_name || '-')}</span></div>
        <div class="info-row"><span class="info-label">Tags</span><span class="info-value">${escHtml(repo.tags || '-')}</span></div>
        <div class="info-row"><span class="info-label">Notes</span><span class="info-value">${escHtml(repo.notes || '-')}</span></div>
        <div class="info-row"><span class="info-label">Created</span><span class="info-value">${formatDate(repo.created_at)}</span></div>
        <div style="margin-top:12px;display:flex;gap:8px;">
          <button class="btn btn-primary" onclick="rescanRepo()"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px;"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg> Rescan</button>
          <button class="btn btn-secondary" onclick="copyPath('${escHtml(repo.path).replace(/'/g, "\\'")}')"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px;"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg> Copy Path</button>
          <button class="btn btn-secondary" onclick="copyStatusSummary()"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px;"><path d="m12 15 2 2 4-4"/><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg> Copy Status</button>
        </div>
      </div>

      <div class="card">
        <h3><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:6px;"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg> Git Status</h3>
        <div class="info-row"><span class="info-label">Status</span><span class="info-value">${statusBadge}</span></div>
        <div class="info-row"><span class="info-label">Branch</span><span class="info-value">${escHtml(repo.branch || (repo.is_detached === 1 ? '(detached)' : '-'))}</span></div>
        <div class="info-row"><span class="info-label">Remote</span><span class="info-value" style="font-family:monospace;font-size:11px;">${escHtml(repo.remote_url || 'None')}</span></div>
        <div class="info-row"><span class="info-label">Upstream</span><span class="info-value">${escHtml(repo.upstream_branch || '-')}</span></div>
        <div class="info-row"><span class="info-label">Ahead/Behind</span><span class="info-value">${aheadBehind || 'Even'}</span></div>
        <div class="info-row"><span class="info-label">Has Remote</span><span class="info-value">${repo.has_remote === 1 ? 'Yes' : 'No'}</span></div>
        <div class="info-row"><span class="info-label">Detached HEAD</span><span class="info-value">${repo.is_detached === 1 ? 'Yes' : 'No'}</span></div>
        <div class="info-row"><span class="info-label">Staged</span><span class="info-value">${repo.staged_count || 0}</span></div>
        <div class="info-row"><span class="info-label">Unstaged</span><span class="info-value">${repo.unstaged_count || 0}</span></div>
        <div class="info-row"><span class="info-label">Untracked</span><span class="info-value">${repo.untracked_count || 0}</span></div>
        <div class="info-row"><span class="info-label">Total Changed</span><span class="info-value">${repo.changed_total || 0}</span></div>
        <div class="info-row"><span class="info-label">Dependabot Alerts</span><span class="info-value">${renderDependabotAlerts(repo.dependabot_alert_count)}</span></div>
      </div>

      <div class="card">
        <h3><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:6px;"><path d="m10 9-3 3 3 3"/><path d="m14 15 3-3-3-3"/><path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719"/></svg> Latest Commit</h3>
        <div class="info-row"><span class="info-label">Hash</span><span class="info-value">${latestCommitHashHtml}</span></div>
        <div class="info-row"><span class="info-label">Message</span><span class="info-value">${escHtml(repo.latest_commit_message || '-')}</span></div>
        <div class="info-row"><span class="info-label">Author</span><span class="info-value">${escHtml(repo.latest_commit_author || '-')}</span></div>
        <div class="info-row"><span class="info-label">Date</span><span class="info-value">${repo.latest_commit_date ? formatDate(repo.latest_commit_date) : '-'}</span></div>
      </div>

      <div class="card">
        <h3><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:6px;"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><path d="M11 7v4"/><path d="M11 15h.01"/></svg> Scan Info</h3>
        <div class="info-row"><span class="info-label">Last Scan</span><span class="info-value">${repo.scanned_at ? formatDate(repo.scanned_at) : 'Never'}</span></div>
        <div class="info-row"><span class="info-label">Error</span><span class="info-value">${repo.scan_error ? escHtml(repo.scan_error) : 'None'}</span></div>
      </div>

      ${fileSection}
      ${commitSection}
      ${scanSection}
    </div>
  `;

  document.getElementById('detail-content').innerHTML = html;
}

function renderFiles(files) {
  return files.map(f => {
    let cls = '?';
    if (f.status_code) {
      const sc = f.status_code;
      if (sc[1] !== ' ') cls = sc[1];
      else cls = sc[0];
    }
    return '<div class="file-item"><span class="file-status ' + cls + '">' + escHtml(f.status_code) + '</span><span>' + escHtml(f.file_path) + '</span></div>';
  }).join('');
}

function renderCommitHash(remoteUrl, commit) {
  const hash = commit.commit_hash || commit.hash || '';
  const shortHash = commit.short_hash || hash.slice(0, 7) || '-';
  const url = hostedCommitUrl(remoteUrl, hash);
  if (!url) {
    return '<span class="commit-hash">' + escHtml(shortHash) + '</span>';
  }
  return '<a href="' + escAttr(url) + '" target="_blank" rel="noopener" class="commit-hash">' + escHtml(shortHash) + '</a>';
}

function renderDependabotAlerts(count) {
  if (count === null || count === undefined || count === '' || Number(count) < 0) {
    return '<span class="muted-cell" title="Dependabot alert count unavailable">Unavailable</span>';
  }
  const n = Number(count);
  if (n === 0) {
    return '<span class="badge badge-clean">0 open</span>';
  }
  return '<span class="badge badge-alert">' + n + ' open</span>';
}

function hostedCommitUrl(remoteUrl, hash) {
  if (!remoteUrl || !hash) return '';
  const info = hostedRepoInfo(remoteUrl);
  if (!info || !info.slug) return '';
  if (info.vendor === 'github') {
    return info.baseUrl + '/' + info.slug + '/commit/' + encodeURIComponent(hash);
  }
  if (info.vendor === 'gitlab') {
    return info.baseUrl + '/' + info.slug + '/-/commit/' + encodeURIComponent(hash);
  }
  if (info.vendor === 'bitbucket') {
    return info.baseUrl + '/' + info.slug + '/commits/' + encodeURIComponent(hash);
  }
  return '';
}

function hostedRepoInfo(remoteUrl) {
  let value = String(remoteUrl).trim().replace(/\.git$/, '').replace(/\/$/, '');
  let host = '';
  let slug = '';

  const sshMatch = value.match(/^[^@]+@([^:]+):(.+)$/);
  if (sshMatch) {
    host = sshMatch[1];
    slug = sshMatch[2];
  } else {
    const httpsMatch = value.match(/^https?:\/\/([^/]+)\/(.+)$/);
    if (httpsMatch) {
      host = httpsMatch[1];
      slug = httpsMatch[2];
    }
  }

  if (!host || !slug) return null;
  const cleanSlug = slug.split('/').filter(Boolean).join('/');
  const lowerHost = host.toLowerCase();
  let vendor = '';
  if (lowerHost === 'github.com') vendor = 'github';
  if (lowerHost.includes('gitlab')) vendor = 'gitlab';
  if (lowerHost === 'bitbucket.org') vendor = 'bitbucket';
  if (!vendor) return null;

  return {
    vendor,
    baseUrl: 'https://' + host,
    slug: cleanSlug
  };
}

async function rescanRepo() {
  try {
    const result = await apiFetch('/api/repos/' + repoId + '/scan', { method: 'POST' });
    showToast(result.success ? 'Scan complete!' : 'Scan had issues', result.success ? 'success' : 'error');
    loadDetail();
  } catch (err) {
    showToast('Scan failed', 'error');
  }
}

async function copyPath(path) {
  try { await navigator.clipboard.writeText(path); showToast('Path copied!', 'success'); }
  catch (e) { prompt('Copy path:', path); }
}

async function copyStatusSummary() {
  try {
    if (!currentRepo) { showToast('No repo data loaded', 'error'); return; }
    const repo = currentRepo;
    const summary = [
      'Repo: ' + (repo.display_name || repo.name),
      'Path: ' + repo.path,
      'Branch: ' + (repo.branch || 'N/A'),
      'Status: ' + (repo.is_clean === 1 ? 'Clean' : 'Dirty'),
      'Remote: ' + (repo.remote_url || 'None'),
      'Ahead: ' + (repo.ahead_count || 0),
      'Behind: ' + (repo.behind_count || 0),
      'Dependabot alerts: ' + (Number(repo.dependabot_alert_count) >= 0 ? repo.dependabot_alert_count : 'Unavailable'),
      'Latest: ' + (repo.latest_commit_message || 'N/A'),
      'Last Scan: ' + (repo.scanned_at || 'Never')
    ].join('\n');
    await navigator.clipboard.writeText(summary);
    showToast('Status copied!', 'success');
  } catch (e) { showToast('Failed to copy', 'error'); }
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

function escAttr(str) {
  return escHtml(str).replace(/'/g, '&#39;');
}

function showToast(message, type) {
  const toast = document.createElement('div');
  toast.className = 'toast toast-' + (type || 'success');
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function showError(msg) {
  document.getElementById('loading-state').classList.add('hidden');
  document.getElementById('error-state').classList.remove('hidden');
  document.getElementById('error-msg').textContent = msg;
}
