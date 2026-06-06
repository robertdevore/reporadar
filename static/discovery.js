// RepoRadar — Discovery Page

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-discover-start').addEventListener('click', startDiscovery);
  document.getElementById('btn-add-selected').addEventListener('click', addSelected);
});

async function apiFetch(url, options = {}) {
  try {
    const resp = await fetch(url, options);
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    return await resp.json();
  } catch (err) { throw err; }
}

async function startDiscovery() {
  const path = document.getElementById('discover-path').value.trim();
  if (!path) {
    showToast('Please enter a directory path', 'error');
    return;
  }

  document.getElementById('discover-loading').classList.remove('hidden');
  document.getElementById('discover-results').classList.add('hidden');
  document.getElementById('btn-add-selected').style.display = 'none';

  try {
    const data = await apiFetch('/api/discover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: path, max_depth: 4, include_hidden: 0 })
    });

    document.getElementById('discover-loading').classList.add('hidden');
    document.getElementById('discover-results').classList.remove('hidden');

    const newRepos = data.new_repos || [];
    document.getElementById('result-title').textContent =
      'Found ' + data.total_found + ' repos (' + newRepos.length + ' new, ' + data.already_tracked + ' already tracked)';

    if (newRepos.length > 0) {
      document.getElementById('btn-add-selected').style.display = 'inline-flex';
      document.getElementById('select-all-row').style.display = 'block';
      renderResultList(newRepos);
    } else {
      document.getElementById('result-list').innerHTML =
        '<p style="color:var(--text-muted);padding:12px;">All found repos are already tracked.</p>';
    }
  } catch (err) {
    document.getElementById('discover-loading').classList.add('hidden');
    showToast('Discovery failed: ' + err.message, 'error');
  }
}

function renderResultList(repos) {
  const container = document.getElementById('result-list');
  container.innerHTML = repos.map((r, i) => `
    <div class="result-item">
      <input type="checkbox" class="result-checkbox repo-check" data-index="${i}" checked>
      <div>
        <div class="result-name">${escHtml(r.name)}</div>
        <div class="result-path">${escHtml(r.path)}</div>
      </div>
    </div>
  `).join('');
}

function toggleSelectAll() {
  const checked = document.getElementById('select-all').checked;
  document.querySelectorAll('.repo-check').forEach(cb => cb.checked = checked);
}

async function addSelected() {
  const checkboxes = document.querySelectorAll('.repo-check:checked');
  if (checkboxes.length === 0) {
    showToast('No repos selected', 'error');
    return;
  }

  // We need to get the repo data. Re-fetch discovery to get the list.
  const path = document.getElementById('discover-path').value.trim();
  let data;
  try {
    data = await apiFetch('/api/discover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: path, max_depth: 4, include_hidden: 0 })
    });
  } catch (err) {
    showToast('Failed to get repo list', 'error');
    return;
  }

  const newRepos = data.new_repos || [];
  const selectedIndices = new Set();
  checkboxes.forEach(cb => selectedIndices.add(parseInt(cb.dataset.index)));

  const reposToAdd = [];
  selectedIndices.forEach(i => {
    if (i < newRepos.length) reposToAdd.push(newRepos[i]);
  });

  try {
    const result = await apiFetch('/api/repos/bulk-add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repos: reposToAdd })
    });

    showToast('Added ' + result.added + ' repos, skipped ' + result.skipped, 'success');
    document.getElementById('btn-add-selected').style.display = 'none';
    document.getElementById('select-all-row').style.display = 'none';
    document.getElementById('result-list').innerHTML =
      '<p style="color:var(--accent-green);padding:12px;">✓ Added ' + result.added + ' repositories</p>';
  } catch (err) {
    showToast('Failed to add repos: ' + err.message, 'error');
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
