// RepoRadar — Discovery Page

let lastDiscoveryData = null;
let excludedRepos = [];
let exclusionBusy = false;

const discoverButtonLabel = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m13 13.5 2-2.5-2-2.5"/><path d="m21 21-4.3-4.3"/><path d="M9 8.5 7 11l2 2.5"/><circle cx="11" cy="11" r="8"/></svg> Scan Directory';

document.addEventListener('DOMContentLoaded', () => {
  loadExcluded();
  document.getElementById('btn-exclude-selected').addEventListener('click', () => {
    const indices = [...document.querySelectorAll('.repo-check:checked')].map(cb => Number(cb.dataset.index));
    updateExclusions('exclude', indices.map(i => lastDiscoveryData.new_repos[i].path));
  });
  document.getElementById('result-list').addEventListener('click', event => {
    const button = event.target.closest('[data-exclude]');
    if (button) updateExclusions('exclude', [lastDiscoveryData.new_repos[Number(button.dataset.exclude)].path]);
  });
  document.getElementById('excluded-list').addEventListener('click', event => {
    const button = event.target.closest('[data-restore]');
    if (button) updateExclusions('restore', [excludedRepos[Number(button.dataset.restore)].path]);
  });
  document.getElementById('btn-discover-start').addEventListener('click', startDiscovery);
  document.getElementById('btn-add-selected').addEventListener('click', addSelected);
  document.getElementById('discover-path').addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      startDiscovery();
    }
  });
});

async function apiFetch(url, options = {}) {
  try {
    const resp = await fetch(url, options);
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    return await resp.json();
  } catch (err) { throw err; }
}

async function startDiscovery() {
  if (exclusionBusy) return;
  const path = document.getElementById('discover-path').value.trim();
  if (!path) {
    showToast('Please enter a directory path', 'error');
    return;
  }

  document.getElementById('discover-loading').classList.remove('hidden');
  document.getElementById('discover-results').classList.add('hidden');
  document.getElementById('btn-exclude-selected').style.display = 'none';
  document.getElementById('btn-add-selected').style.display = 'none';
  document.getElementById('btn-add-selected').disabled = true;
  document.getElementById('btn-discover-start').disabled = true;
  document.getElementById('btn-discover-start').textContent = 'Scanning...';

  try {
    const data = await apiFetch('/api/discover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: path, max_depth: 4, include_hidden: 0 })
    });

    document.getElementById('discover-loading').classList.add('hidden');
    document.getElementById('discover-results').classList.remove('hidden');
    lastDiscoveryData = data;

    renderDiscovery();
  } catch (err) {
    document.getElementById('discover-loading').classList.add('hidden');
    showToast('Discovery failed: ' + err.message, 'error');
  } finally {
    document.getElementById('btn-discover-start').disabled = false;
    document.getElementById('btn-discover-start').innerHTML = discoverButtonLabel;
    document.getElementById('btn-add-selected').disabled = false;
  }
}

function renderResultList(repos) {
  const container = document.getElementById('result-list');
  container.innerHTML = repos.map((r, i) => `
    <div class="result-item">
      <input type="checkbox" class="result-checkbox repo-check" data-index="${i}" checked>
      <div class="result-description">
        <div class="result-name">${escHtml(r.name)}</div>
        <div class="result-path">${escHtml(r.path)}</div>
      </div>
      <button class="btn btn-ghost" data-exclude="${i}" aria-label="Hide ${escHtml(r.name)} from discovery">Hide</button>
    </div>
  `).join('');
}

function toggleSelectAll() {
  const checked = document.getElementById('select-all').checked;
  document.querySelectorAll('.repo-check').forEach(cb => cb.checked = checked);
}

async function addSelected() {
  if (exclusionBusy) return;
  const checkboxes = document.querySelectorAll('.repo-check:checked');
  if (checkboxes.length === 0) {
    showToast('No repos selected', 'error');
    return;
  }

  if (!lastDiscoveryData) {
    showToast('Run discovery again before adding repos', 'error');
    return;
  }

  const newRepos = lastDiscoveryData.new_repos || [];
  const selectedIndices = new Set();
  checkboxes.forEach(cb => selectedIndices.add(parseInt(cb.dataset.index)));

  const reposToAdd = [];
  selectedIndices.forEach(i => {
    if (i < newRepos.length) reposToAdd.push(newRepos[i]);
  });

  try {
    document.getElementById('btn-add-selected').disabled = true;
    const result = await apiFetch('/api/repos/bulk-add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repos: reposToAdd })
    });

    showToast('Added ' + result.added + ' repos, skipped ' + result.skipped, 'success');
    document.getElementById('btn-exclude-selected').style.display = 'none';
  document.getElementById('btn-add-selected').style.display = 'none';
    document.getElementById('select-all-row').style.display = 'none';
    document.getElementById('result-list').innerHTML =
      '<p style="color:var(--success);padding:12px;"><span class="badge badge-clean">Added</span> ' + result.added + ' repositories</p>';
    lastDiscoveryData = null;
  } catch (err) {
    showToast('Failed to add repos: ' + err.message, 'error');
  } finally {
    document.getElementById('btn-add-selected').disabled = false;
  }
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

function renderDiscovery() {
  const data = lastDiscoveryData;
  const repos = data.new_repos || [];
  document.getElementById('result-title').textContent =
    (data.truncated ? 'Incomplete scan — narrow your directory. ' : '') +
    repos.length + ' new, ' + data.already_tracked + ' already tracked, ' + (data.excluded_count || 0) + ' hidden';
  document.getElementById('btn-add-selected').style.display = repos.length ? 'inline-flex' : 'none';
  document.getElementById('btn-exclude-selected').style.display = repos.length ? 'inline-flex' : 'none';
  document.getElementById('select-all-row').style.display = repos.length ? 'block' : 'none';
  document.getElementById('select-all').checked = true;
  renderResultList(repos);
  if (!repos.length) document.getElementById('result-list').textContent = 'No new repositories to add. Check Hidden repositories below to restore excluded paths.';
}

function renderExcluded(repos) {
  excludedRepos = repos;
  document.getElementById('excluded-count').textContent = '(' + repos.length + ')';
  document.getElementById('excluded-list').innerHTML = repos.length ? repos.map((repo, i) => `
    <div class="result-item">
      <div class="result-description"><div class="result-path">${escHtml(repo.path)}</div></div>
      <button class="btn btn-secondary" data-restore="${i}">Restore</button>
    </div>`).join('') : '<p>No hidden repositories.</p>';
}

async function loadExcluded() {
  try { renderExcluded((await apiFetch('/api/discovery/exclusions')).excluded); }
  catch (err) { document.getElementById('excluded-list').textContent = 'Could not load hidden repositories. Reload to retry.'; }
}

async function updateExclusions(action, paths) {
  if (exclusionBusy || document.getElementById('btn-discover-start').disabled) return;
  if (!paths.length) { showToast('No repos selected', 'error'); return; }
  exclusionBusy = true;
  try {
    const data = await apiFetch('/api/discovery/exclusions', {
      method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({action, paths})
    });
    renderExcluded(data.excluded);
    if (action === 'exclude' && lastDiscoveryData) {
      lastDiscoveryData.new_repos = lastDiscoveryData.new_repos.filter(repo => !paths.includes(repo.path));
      lastDiscoveryData.excluded_count = (lastDiscoveryData.excluded_count || 0) + paths.length;
      renderDiscovery();
    }
    showToast(action === 'exclude' ? 'Hidden from future discovery scans' : 'Restored. Scan the directory again to discover it.', 'success');
  } catch (err) { showToast('Could not update hidden repositories: ' + err.message, 'error'); }
  finally { exclusionBusy = false; }
}
