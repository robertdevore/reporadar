// RepoRadar — Dashboard Frontend App

const API_BASE = '';

let allRepos = [];
let sortColumn = 'name';
let sortOrder = 'asc';
let currentFilter = 'all';

// === Init ===
document.addEventListener('DOMContentLoaded', () => {
  loadRepos();
  loadSummary();
  loadGroups();
  setupEventListeners();
});

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
  } catch (err) {
    // Silently fail
  }
}

async function loadGroups() {
  try {
    const groups = new Set();
    allRepos.forEach(r => {
      if (r.group_name) groups.add(r.group_name);
    });
    const sel = document.getElementById('filter-group');
    sel.innerHTML = '<option value="">All Groups</option>';
    [...groups].sort().forEach(g => {
      const opt = document.createElement('option');
      opt.value = g;
      opt.textContent = g;
      sel.appendChild(opt);
    });
  } catch (err) {}
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
      loadGroups();
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
      loadGroups();
    } else {
      showToast(result.error, 'error');
    }
  } catch (err) {
    showToast('Failed to remove repository', 'error');
  }
}

function openEditModal(repo) {
  document.getElementById('edit-id').value = repo.id;
  document.getElementById('edit-name').value = repo.display_name || repo.name || '';
  document.getElementById('edit-group').value = repo.group_name || '';
  document.getElementById('edit-tags').value = repo.tags || '';
  document.getElementById('edit-notes').value = repo.notes || '';
  openModal('modal-edit');
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
      loadGroups();
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
  openModal('modal-scan');
  document.getElementById('progress-bar').style.width = '0%';
  document.getElementById('scan-current').textContent = 'Starting scan...';
  document.getElementById('scan-stats').textContent = '';

  try {
    const result = await apiFetch('/api/scan/bulk', { method: 'POST' });
    document.getElementById('progress-bar').style.width = '100%';
    document.getElementById('scan-current').textContent = 'Scan complete!';
    document.getElementById('scan-stats').textContent =
      result.scanned + ' scanned, ' + result.errors + ' errors out of ' + result.total + ' repos';

    setTimeout(() => {
      closeModal('modal-scan');
      loadRepos();
      loadSummary();
    }, 2000);
  } catch (err) {
    document.getElementById('scan-current').textContent = 'Scan failed';
    document.getElementById('scan-stats').textContent = 'Server connection error';
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
function renderTable() {
  let repos = [...allRepos];

  // Apply filter
  const statusFilter = document.getElementById('filter-status').value;
  const groupFilter = document.getElementById('filter-group').value;

  if (statusFilter !== 'all') {
    repos = repos.filter(r => matchStatusFilter(r, statusFilter));
  }
  if (groupFilter) {
    repos = repos.filter(r => r.group_name === groupFilter);
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
  tbody.innerHTML = repos.map(r => renderRow(r)).join('');

  // Update counts
  currentFilter = statusFilter;
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
    repo.latest_commit_message, repo.remote_url
  ];
  return fields.some(f => f && f.toLowerCase().includes(query));
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
        <a href="/detail.html?id=${repo.id}" class="repo-link">${escHtml(name)}</a>
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
      <td title="${repo.latest_commit_message || ''}">${commitDate}</td>
      <td>${scanDate}</td>
      <td class="action-cell">
        <button class="btn btn-sm btn-secondary" onclick="scanRepo(${repo.id})" title="Scan">🔄</button>
        <button class="btn btn-sm btn-secondary" onclick="openEditModal(${JSON.stringify(repo).replace(/"/g, '&quot;')})" title="Edit">✏</button>
        <button class="btn btn-sm btn-secondary" onclick="removeRepo(${repo.id}, '${escHtml(name).replace(/'/g, "\\'")}')" title="Remove">🗑</button>
      </td>
    </tr>
  `;
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
