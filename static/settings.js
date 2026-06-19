// RepoRadar — Settings Page

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  document.getElementById('btn-save-settings').addEventListener('click', saveSettings);
  document.getElementById('btn-export-json').addEventListener('click', exportJSON);
  document.getElementById('btn-export-db').addEventListener('click', exportDB);
});

async function apiFetch(url, options = {}) {
  try {
    const resp = await fetch(url, options);
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    return await resp.json();
  } catch (err) { throw err; }
}

async function loadSettings() {
  try {
    const data = await apiFetch('/api/settings');
    document.getElementById('loading-state').classList.add('hidden');
    document.getElementById('settings-content').classList.remove('hidden');

    const s = data.settings || {};
    document.getElementById('stale-threshold').value = s.stale_threshold_days || '14';
    document.getElementById('activity-window').value = s.default_activity_window || '7';
    document.getElementById('ignored-folders').value = s.ignored_folders || 'node_modules,vendor,.cache,dist,build,.git';
    document.getElementById('enable-write').checked = s.enable_write_actions === 'true';
    document.getElementById('enable-dependabot').checked = s.enable_dependabot_alerts === 'true';
  } catch (err) {
    document.getElementById('loading-state').classList.add('hidden');
    showToast('Failed to load settings', 'error');
  }
}

async function saveSettings() {
  const settings = {
    stale_threshold_days: document.getElementById('stale-threshold').value,
    default_activity_window: document.getElementById('activity-window').value,
    ignored_folders: document.getElementById('ignored-folders').value,
    enable_write_actions: document.getElementById('enable-write').checked ? 'true' : 'false',
    enable_dependabot_alerts: document.getElementById('enable-dependabot').checked ? 'true' : 'false'
  };

  try {
    await apiFetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: settings })
    });
    showToast('Settings saved!', 'success');
  } catch (err) {
    showToast('Failed to save settings', 'error');
  }
}

function exportJSON() {
  window.open('/api/export', '_blank');
  showToast('Export started...', 'success');
}

function exportDB() {
  window.open('/api/export/db', '_blank');
  showToast('Database backup started...', 'success');
}

async function handleImport(event) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    const data = JSON.parse(text);

    const result = await apiFetch('/api/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (result.success) {
      showToast('Imported ' + result.imported + ' repos, skipped ' + result.skipped, 'success');
    } else {
      showToast('Import failed: ' + (result.error || 'Unknown error'), 'error');
    }
  } catch (err) {
    showToast('Import failed: Invalid file format', 'error');
  }

  event.target.value = '';
}

function showToast(message, type) {
  const toast = document.createElement('div');
  toast.className = 'toast toast-' + (type || 'success');
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
