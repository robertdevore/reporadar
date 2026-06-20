// RepoRadar — Dashboard Frontend App

const API_BASE = '';

let allRepos = [];
let sortColumn = 'name';
let sortOrder = 'asc';
let currentFilter = 'all';
let initialViewLoaded = false;

// === Init ===
document.addEventListener('DOMContentLoaded', () => {
  applyViewFromUrl();
  setupEventListeners();
  initPage();
});

async function initPage() {
  await Promise.all([loadRepos(), loadSummary()]);
  loadFilterOptions();
  applyViewFromUrl();
  initialViewLoaded = true;
  renderTable();
}

// === Event Listeners ===
function setupEventListeners() {
  document.getElementById('btn-scan-all').addEventListener('click', startBulkScan);
  document.getElementById('btn-add-repo').addEventListener('click', () => openModal('modal-add'));
  document.getElementById('btn-add-first').addEventListener('click', () => openModal('modal-add'));
  document.getElementById('btn-discover').addEventListener('click', () => window.location.href = '/discovery.html');
  document.getElementById('btn-add-confirm').addEventListener('click', addRepo);
  document.getElementById('btn-edit-confirm').addEventListener('click', saveEdit);

  document.getElementById('search-input').addEventListener('input', debounce(renderTable, 300));
  document.getElementById('filter-status').addEventListener('change', renderTable);
  document.getElementById('filter-group').addEventListener('change', renderTable);
  document.getElementById('filter-tag').addEventListener('change', renderTable);
  document.getElementById('btn-copy-view').addEventListener('click', copyCurrentViewLink);
  document.getElementById('btn-reset-view').addEventListener('click', resetView);
  window.addEventListener('popstate', () => {
    applyViewFromUrl();
    renderTable(false);
  });

  // Sortable columns
  document.querySelectorAll('.repo-table th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const col = th.dataset.sort;
      if (sortColumn === col) {
        sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
      } else {
        sortColumn = col;
        sortOrder = 'asc';
      }
      renderTable();
    });
  });
}

// === API Calls ===
async function apiFetch(url, options = {}) {
  try {
    const resp = await fetch(API_BASE + url, options);
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    return await resp.json();
  } catch (err) {
    console.error('API error:', err);
    throw err;
  }
}

async function loadRepos() {
  try {
    const data = await apiFetch('/api/repos');
    allRepos = data.repos || [];
    document.getElementById('loading-state').classList.add('hidden');

    if (allRepos.length === 0) {
      document.getElementById('empty-state').classList.remove('hidden');
      document.getElementById('repo-table').classList.add('hidden');
    } else {
      document.getElementById('empty-state').classList.add('hidden');
      document.getElementById('repo-table').classList.remove('hidden');
      renderTable();
    }
  } catch (err) {
    document.getElementById('loading-state').classList.add('hidden');
    document.getElementById('error-state').classList.remove('hidden');
    document.getElementById('error-state').querySelector('p').textContent =
      'We could not load repository data. Check that the local server is running and try again.';
  }
}

async function loadSummary() {
  try {
    const data = await apiFetch('/api/dashboard/summary');
    const s = data.summary || {};
    document.getElementById('sum-total').textContent = s.total || 0;
    document.getElementById('sum-clean').textContent = s.clean || 0;
    document.getElementById('sum-dirty').textContent = s.dirty || 0;
    document.getElementById('sum-ahead').textContent = s.ahead || 0;
    document.getElementById('sum-behind').textContent = s.behind || 0;
    document.getElementById('sum-diverged').textContent = s.diverged || 0;
    document.getElementById('sum-noremote').textContent = s.no_remote || 0;
    document.getElementById('sum-errors').textContent = s.errors || 0;
    document.getElementById('sum-stale').textContent = s.stale || 0;
    document.getElementById('sum-alerts').textContent = s.dependabot_alerts || 0;
  } catch (err) {
    // Silently fail
  }
}

async function loadFilterOptions() {
  try {
    const groups = new Set();
    const tags = new Set();
    allRepos.forEach(r => {
      splitTokens(r.group_name).forEach(g => groups.add(g));
      splitTokens(r.tags).forEach(t => tags.add(t));
    });
    const groupSel = document.getElementById('filter-group');
    const tagSel = document.getElementById('filter-tag');
    const selectedGroup = groupSel.value;
    const selectedTag = tagSel.value;
    groupSel.innerHTML = '<option value="">All Groups</option>';
    [...groups].sort().forEach(g => {
      const opt = document.createElement('option');
      opt.value = g;
      opt.textContent = g;
      groupSel.appendChild(opt);
    });
    tagSel.innerHTML = '<option value="">All Tags</option>';
    [...tags].sort().forEach(t => {
      const opt = document.createElement('option');
      opt.value = t;
      opt.textContent = t;
      tagSel.appendChild(opt);
    });
    groupSel.value = selectedGroup;
    tagSel.value = selectedTag;
  } catch (err) {}
}

function applyViewFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const status = params.get('status') || params.get('filter') || 'all';
  const group = params.get('group') || params.get('project') || '';
  const tag = params.get('tag') || '';
  const query = params.get('q') || params.get('search') || '';
  const sort = params.get('sort') || 'name';
  const dir = params.get('dir') || 'asc';

  setElementValue('filter-status', status);
  setElementValue('filter-group', group);
  setElementValue('filter-tag', tag);
  setElementValue('search-input', query);
  sortColumn = sort;
  sortOrder = dir === 'desc' ? 'desc' : 'asc';
}

function updateUrlFromView() {
  const params = new URLSearchParams();
  const status = document.getElementById('filter-status').value;
  const group = document.getElementById('filter-group').value;
  const tag = document.getElementById('filter-tag').value;
  const query = document.getElementById('search-input').value.trim();

  if (status && status !== 'all') params.set('status', status);
  if (group) params.set('group', group);
  if (tag) params.set('tag', tag);
  if (query) params.set('q', query);
  if (sortColumn !== 'name') params.set('sort', sortColumn);
  if (sortOrder !== 'asc') params.set('dir', sortOrder);

  const queryString = params.toString();
  const nextUrl = window.location.pathname + (queryString ? '?' + queryString : '');
  if (nextUrl !== window.location.pathname + window.location.search) {
    window.history.replaceState({}, '', nextUrl);
  }
}

function resetView() {
  document.getElementById('filter-status').value = 'all';
  document.getElementById('filter-group').value = '';
  document.getElementById('filter-tag').value = '';
  document.getElementById('search-input').value = '';
  sortColumn = 'name';
  sortOrder = 'asc';
  renderTable();
}

async function copyCurrentViewLink() {
  updateUrlFromView();
  const href = window.location.href;
  try {
    await navigator.clipboard.writeText(href);
    showToast('View link copied', 'success');
  } catch (err) {
    prompt('Copy view link:', href);
  }
}

function updateViewSummary(filteredCount) {
  const countEl = document.getElementById('filtered-count');
  if (countEl) {
    countEl.textContent = filteredCount + ' of ' + allRepos.length + ' repos';
  }

  const chip = document.getElementById('view-chip');
  if (!chip) return;
  const parts = [];
  const status = document.getElementById('filter-status').value;
  const group = document.getElementById('filter-group').value;
  const tag = document.getElementById('filter-tag').value;
  const query = document.getElementById('search-input').value.trim();
  if (status && status !== 'all') parts.push(status);
  if (group) parts.push('group: ' + group);
  if (tag) parts.push('tag: ' + tag);
  if (query) parts.push('search: ' + query);
  chip.textContent = parts.length > 0 ? parts.join(' / ') : '';
  chip.classList.toggle('hidden', parts.length === 0);
}

function setElementValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value || '';
}

function splitTokens(value) {
  if (!value) return [];
  return String(value)
    .split(',')
    .map(v => v.trim())
    .filter(Boolean);
}

function hasToken(value, wanted) {
  const needle = String(wanted || '').trim().toLowerCase();
  if (!needle) return true;
  return splitTokens(value).some(token => token.toLowerCase() === needle);
}

// === CRUD Operations ===
async function addRepo() {
  const path = document.getElementById('add-path').value.trim();
  if (!path) {
    showError('add-error', 'Path is required');
    return;
  }
  const data = {
    path: path,
    display_name: document.getElementById('add-name').value.trim(),
    group_name: document.getElementById('add-group').value.trim(),
    tags: document.getElementById('add-tags').value.trim(),
    notes: document.getElementById('add-notes').value.trim()
  };
  try {
    const result = await apiFetch('/api/repos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (result.success) {
      closeModal('modal-add');
      clearAddForm();
      showToast('Repository added successfully!', 'success');
      loadRepos();
      loadSummary();
      loadFilterOptions();
    } else {
      showError('add-error', result.error);
    }
  } catch (err) {
    showError('add-error', 'Failed to add repository. Check server connection.');
  }
}

async function scanRepo(repoId) {
  try {
    const result = await apiFetch('/api/repos/' + repoId + '/scan', { method: 'POST' });
    if (result.success) {
      showToast('Scan complete', 'success');
    } else {
      showToast('Scan failed: ' + (result.scan_result?.error || 'Unknown error'), 'error');
    }
    loadRepos();
    loadSummary();
  } catch (err) {
    showToast('Scan failed', 'error');
  }
}

async function removeRepo(repoId, name) {
  if (!confirm('Remove "' + name + '" from tracking? (No files will be deleted)')) return;
  try {
    const result = await apiFetch('/api/repos/' + repoId, { method: 'DELETE' });
    if (result.success) {
      showToast('Repository removed from tracking', 'success');
      loadRepos();
      loadSummary();
      loadFilterOptions();
    } else {
      showToast(result.error, 'error');
    }
  } catch (err) {
    showToast('Failed to remove repository', 'error');
  }
}

function removeRepoById(repoId) {
  const repo = findRepoById(repoId);
  if (!repo) return;
  removeRepo(repo.id, repo.display_name || repo.name || 'this repository');
}

function openEditModal(repo) {
  document.getElementById('edit-id').value = repo.id;
  document.getElementById('edit-name').value = repo.display_name || repo.name || '';
  document.getElementById('edit-group').value = repo.group_name || '';
  document.getElementById('edit-tags').value = repo.tags || '';
  document.getElementById('edit-notes').value = repo.notes || '';
  openModal('modal-edit');
}

function openEditModalById(repoId) {
  const repo = findRepoById(repoId);
  if (repo) openEditModal(repo);
}

async function saveEdit() {
  const repoId = document.getElementById('edit-id').value;
  const data = {
    display_name: document.getElementById('edit-name').value.trim(),
    group_name: document.getElementById('edit-group').value.trim(),
    tags: document.getElementById('edit-tags').value.trim(),
    notes: document.getElementById('edit-notes').value.trim()
  };
  try {
    const result = await apiFetch('/api/repos/' + repoId, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (result.success) {
      closeModal('modal-edit');
      showToast('Repository updated', 'success');
      loadRepos();
      loadSummary();
      loadFilterOptions();
    } else {
      showError('edit-error', result.error);
    }
  } catch (err) {
    showError('edit-error', 'Failed to update repository');
  }
}

// === Bulk Scan ===
async function startBulkScan() {
  if (allRepos.length === 0) {
    showToast('No repos to scan', 'error');
    return;
  }

  const scanButton = document.getElementById('btn-scan-all');
  scanButton.disabled = true;
  scanButton.innerHTML = '<span style="margin-right:6px;">⏳</span> Scanning...';

  openModal('modal-scan');
  document.getElementById('progress-bar').style.width = '0%';
  document.getElementById('scan-current').textContent = 'Starting scan...';
  document.getElementById('scan-stats').textContent = '';

  try {
    const result = await apiFetch('/api/scan/bulk', { method: 'POST' });
    document.getElementById('progress-bar').style.width = '100%';
    document.getElementById('scan-current').textContent = 'Scan complete!';
    document.getElementById('scan-stats').textContent =
      result.scanned + ' scanned, ' + (result.clean || 0) + ' clean, ' + (result.dirty || 0) + ' dirty, ' + result.errors + ' errors out of ' + result.total + ' repos';

    setTimeout(() => {
      closeModal('modal-scan');
      loadRepos();
      loadSummary();
    }, 2000);
  } catch (err) {
    document.getElementById('scan-current').textContent = 'Scan failed';
    document.getElementById('scan-stats').textContent = 'Server connection error';
  } finally {
    scanButton.disabled = false;
    scanButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg> Scan All';
  }
}

function clearAddForm() {
  document.getElementById('add-path').value = '';
  document.getElementById('add-name').value = '';
  document.getElementById('add-group').value = '';
  document.getElementById('add-tags').value = '';
  document.getElementById('add-notes').value = '';
  document.getElementById('add-error').classList.add('hidden');
}

// === Table Rendering ===
function renderTable(syncUrl = true) {
  let repos = [...allRepos];

  // Apply filter
  const statusFilter = document.getElementById('filter-status').value;
  const groupFilter = document.getElementById('filter-group').value;
  const tagFilter = document.getElementById('filter-tag').value;

  if (statusFilter !== 'all') {
    repos = repos.filter(r => matchStatusFilter(r, statusFilter));
  }
  if (groupFilter) {
    repos = repos.filter(r => hasToken(r.group_name, groupFilter));
  }
  if (tagFilter) {
    repos = repos.filter(r => hasToken(r.tags, tagFilter));
  }

  // Apply search
  const query = document.getElementById('search-input').value.toLowerCase();
  if (query) {
    repos = repos.filter(r => matchSearch(r, query));
  }

  // Apply sort
  repos.sort((a, b) => {
    let av = getSortValue(a, sortColumn);
    let bv = getSortValue(b, sortColumn);
    if (av < bv) return sortOrder === 'asc' ? -1 : 1;
    if (av > bv) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // Update sort indicators
  document.querySelectorAll('.repo-table th.sortable').forEach(th => {
    th.classList.toggle('sorted', th.dataset.sort === sortColumn);
  });

  // Render rows
  const tbody = document.getElementById('repo-tbody');
  if (repos.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="15" style="text-align:center;padding:32px;color:var(--text-muted);">
          No repositories match the current filters.
        </td>
      </tr>
    `;
  } else {
    tbody.innerHTML = repos.map(r => renderRow(r)).join('');
  }

  // Update counts
  currentFilter = statusFilter;
  updateViewSummary(repos.length);
  if (syncUrl && initialViewLoaded) {
    updateUrlFromView();
  }
}

function matchStatusFilter(repo, filter) {
  switch (filter) {
    case 'clean': return repo.is_clean === 1;
    case 'dirty': return repo.is_clean === 0;
    case 'staged': return (repo.staged_count || 0) > 0;
    case 'unstaged': return (repo.unstaged_count || 0) > 0;
    case 'untracked': return (repo.untracked_count || 0) > 0;
    case 'ahead': return (repo.ahead_count || 0) > 0 && (repo.behind_count || 0) === 0;
    case 'behind': return (repo.behind_count || 0) > 0 && (repo.ahead_count || 0) === 0;
    case 'diverged': return repo.is_diverged === 1;
    case 'no-remote': return repo.has_remote === 0 || repo.has_remote === null;
    case 'error': return repo.scan_error && repo.scan_error !== '';
    case 'stale': {
      const staleDays = 14;
      if (!repo.latest_commit_date) return true;
      const commitDate = new Date(repo.latest_commit_date);
      const now = new Date();
      const diffDays = (now - commitDate) / (1000 * 60 * 60 * 24);
      return diffDays > staleDays;
    }
    default: return true;
  }
}

function matchSearch(repo, query) {
  const fields = [
    repo.name, repo.display_name, repo.path,
    repo.group_name, repo.tags, repo.branch,
    repo.latest_commit_hash, repo.latest_commit_short_hash,
    repo.latest_commit_message, repo.remote_url,
    repo.dependabot_alert_count
  ];
  return fields.some(f => f !== null && f !== undefined && String(f).toLowerCase().includes(query));
}

function getSortValue(repo, col) {
  const v = repo[col];
  if (v === null || v === undefined) return '';
  return typeof v === 'string' ? v.toLowerCase() : v;
}

function renderRow(repo) {
  let rowClass = 'row-clean';
  let statusDot = 'clean';
  let stateBadge = '<span class="badge badge-clean">Clean</span>';

  if (repo.scan_error && repo.scan_error !== '') {
    rowClass = 'row-error';
    statusDot = 'error';
    stateBadge = '<span class="badge badge-error">Error</span>';
  } else if (repo.is_clean === 0) {
    rowClass = 'row-dirty';
    statusDot = 'dirty';
    stateBadge = '<span class="badge badge-dirty">Dirty</span>';
  }

  if (repo.pinned === 1) rowClass += ' row-pinned';

  const name = repo.display_name || repo.name || '?';
  const branch = repo.branch || (repo.is_detached === 1 ? '(detached)' : '-');
  const commitDate = repo.latest_commit_date ? formatDate(repo.latest_commit_date) : '-';
  const scanDate = repo.scanned_at ? formatDate(repo.scanned_at) : 'Never';
  const ahead = repo.ahead_count || 0;
  const behind = repo.behind_count || 0;
  const commitUrl = hostedCommitUrl(repo.remote_url, repo.latest_commit_hash);
  const commitLabel = repo.latest_commit_short_hash || '';
  const commitHtml = commitLabel
    ? (commitUrl ? '<a href="' + escAttr(commitUrl) + '" target="_blank" rel="noopener" class="commit-hash-link">' + escHtml(commitLabel) + '</a>' : '<span class="commit-hash">' + escHtml(commitLabel) + '</span>')
    : '';
  const lastCommitHtml = commitDate === '-' && !commitHtml ? '-' : (commitHtml ? commitHtml + '<span class="muted-cell"> ' + commitDate + '</span>' : commitDate);
  const alertHtml = renderDependabotAlerts(repo.dependabot_alert_count);
  const repoId = Number(repo.id) || 0;

  const tags = (repo.tags || '').split(',').filter(t => t.trim()).map(t =>
    '<span class="tag">' + escHtml(t.trim()) + '</span>'
  ).join('');

  let aheadHtml = ahead > 0 ? '<span class="badge badge-ahead">' + ahead + '</span>' : '-';
  let behindHtml = behind > 0 ? '<span class="badge badge-behind">' + behind + '</span>' : '-';
  if (repo.is_diverged === 1) {
    aheadHtml = '<span class="badge badge-diverged">' + ahead + '</span>';
    behindHtml = '<span class="badge badge-diverged">' + behind + '</span>';
  }

  return `
    <tr class="${rowClass}">
      <td><span class="status-dot ${statusDot}" title="${statusDot}"></span></td>
      <td>
        <a href="/detail.html?id=${repoId}" class="repo-link">${escHtml(name)}</a>
        ${repo.pinned === 1 ? '<span class="badge badge-pinned">★</span>' : ''}
      </td>
      <td>${escHtml(repo.group_name || '-')}</td>
      <td>${tags || '-'}</td>
      <td>${escHtml(branch)}</td>
      <td>${stateBadge}</td>
      <td>${repo.staged_count || 0}</td>
      <td>${repo.unstaged_count || 0}</td>
      <td>${repo.untracked_count || 0}</td>
      <td>${aheadHtml}</td>
      <td>${behindHtml}</td>
      <td>${alertHtml}</td>
      <td title="${escAttr(repo.latest_commit_message || '')}">${lastCommitHtml}</td>
      <td>${scanDate}</td>
      <td class="action-cell">
        <button class="btn btn-sm btn-secondary" onclick="scanRepo(${repoId})" title="Scan"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg></button>
        <button class="btn btn-sm btn-secondary" onclick="openEditModalById(${repoId})" title="Edit"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 21h8"/><path d="m15 5 4 4"/><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/></svg></button>
        <button class="btn btn-sm btn-secondary" onclick="removeRepoById(${repoId})" title="Remove"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
      </td>
    </tr>
  `;
}

function renderDependabotAlerts(count) {
  if (count === null || count === undefined || count === '' || Number(count) < 0) {
    return '<span class="muted-cell" title="Dependabot alert count unavailable">-</span>';
  }
  const n = Number(count);
  if (n === 0) {
    return '<span class="badge badge-clean" title="No open Dependabot alerts found">0</span>';
  }
  return '<span class="badge badge-alert" title="' + n + ' open Dependabot alerts">' + n + '</span>';
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

// === Utility Functions ===
function formatDate(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return diffMins + 'm ago';
    if (diffHours < 24) return diffHours + 'h ago';
    if (diffDays < 7) return diffDays + 'd ago';
    return d.toLocaleDateString();
  } catch (e) {
    return dateStr;
  }
}

function escHtml(str) {
  if (!str) return '';
  str = String(str);
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escAttr(str) {
  return escHtml(str).replace(/'/g, '&#39;');
}

function findRepoById(repoId) {
  const wanted = Number(repoId);
  return allRepos.find(r => Number(r.id) === wanted);
}

function openModal(id) {
  document.getElementById(id).classList.remove('hidden');
}

function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
  if (id === 'modal-add') clearAddForm();
}

function showError(elementId, message) {
  const el = document.getElementById(elementId);
  if (el) {
    el.textContent = message;
    el.classList.remove('hidden');
  }
}

function showToast(message, type) {
  const toast = document.createElement('div');
  toast.className = 'toast toast-' + (type || 'success');
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function debounce(fn, delay) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

// Close modals on backdrop click
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal')) {
    e.target.classList.add('hidden');
  }
});
