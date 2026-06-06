// RepoRadar — Repo Detail Page

const urlParams = new URLSearchParams(window.location.search);
const repoId = urlParams.get('id');

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
        ${stagedFiles.length > 0 ? '<h4 style="color:var(--accent-green);margin-top:8px;">Staged (' + stagedFiles.length + ')</h4><div class="file-list">' + renderFiles(stagedFiles) + '</div>' : ''}
        ${unstagedFiles.length > 0 ? '<h4 style="color:var(--accent-orange);margin-top:8px;">Unstaged (' + unstagedFiles.length + ')</h4><div class="file-list">' + renderFiles(unstagedFiles) + '</div>' : ''}
        ${untrackedFiles.length > 0 ? '<h4 style="color:var(--text-muted);margin-top:8px;">Untracked (' + untrackedFiles.length + ')</h4><div class="file-list">' + renderFiles(untrackedFiles) + '</div>' : ''}
      </div>
    `;
  }

  let commitSection = '';
  if (commits.length > 0) {
    commitSection = `
      <div class="card card-full">
        <h3>📝 Recent Commits (${commits.length})</h3>
        <div class="commit-list">
          ${commits.slice(0, 20).map(c => `
            <div class="commit-item">
              <span class="commit-hash">${escHtml(c.short_hash)}</span>
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
      <div class="card card-full">
        <h3>📊 Scan History</h3>
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
        <h3>📋 Repository Info</h3>
        <div class="info-row"><span class="info-label">Name</span><span class="info-value">${escHtml(repo.display_name || repo.name)}${pinned}</span></div>
        <div class="info-row"><span class="info-label">Path</span><span class="info-value" style="font-family:monospace;font-size:12px;">${escHtml(repo.path)}</span></div>
        <div class="info-row"><span class="info-label">Group</span><span class="info-value">${escHtml(repo.group_name || '-')}</span></div>
        <div class="info-row"><span class="info-label">Tags</span><span class="info-value">${escHtml(repo.tags || '-')}</span></div>
        <div class="info-row"><span class="info-label">Notes</span><span class="info-value">${escHtml(repo.notes || '-')}</span></div>
        <div class="info-row"><span class="info-label">Created</span><span class="info-value">${formatDate(repo.created_at)}</span></div>
        <div style="margin-top:12px;display:flex;gap:8px;">
          <button class="btn btn-primary" onclick="rescanRepo()">🔄 Rescan</button>
          <button class="btn btn-secondary" onclick="copyPath('${escHtml(repo.path).replace(/'/g, "\\'")}')">📋 Copy Path</button>
          <button class="btn btn-secondary" onclick="copyStatusSummary()">📋 Copy Status</button>
        </div>
      </div>

      <div class="card">
        <h3>🔍 Git Status</h3>
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
      </div>

      <div class="card">
        <h3>💬 Latest Commit</h3>
        <div class="info-row"><span class="info-label">Hash</span><span class="info-value" style="font-family:monospace;font-size:12px;">${escHtml(repo.latest_commit_short_hash || '-')}</span></div>
        <div class="info-row"><span class="info-label">Message</span><span class="info-value">${escHtml(repo.latest_commit_message || '-')}</span></div>
        <div class="info-row"><span class="info-label">Author</span><span class="info-value">${escHtml(repo.latest_commit_author || '-')}</span></div>
        <div class="info-row"><span class="info-label">Date</span><span class="info-value">${repo.latest_commit_date ? formatDate(repo.latest_commit_date) : '-'}</span></div>
      </div>

      <div class="card">
        <h3>⏱ Scan Info</h3>
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
    const data = await apiFetch('/api/repos/' + repoId);
    const repo = data.repo;
    const summary = [
      'Repo: ' + (repo.display_name || repo.name),
      'Path: ' + repo.path,
      'Branch: ' + (repo.branch || 'N/A'),
      'Status: ' + (repo.is_clean === 1 ? 'Clean' : 'Dirty'),
      'Remote: ' + (repo.remote_url || 'None'),
      'Ahead: ' + (repo.ahead_count || 0),
      'Behind: ' + (repo.behind_count || 0),
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
