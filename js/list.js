// ============================================
// 悠遊白書 － 盟友清單頁邏輯
// ============================================

let allMembers = [];
let filteredMembers = [];
let groupsCache = [];
let sortKey = '時間戳記';
let sortDir = -1; // -1 = 新到舊 / 大到小
let editingId = null; // null = 新增模式
let pendingDeleteId = null;

let adminPassword = sessionStorage.getItem('ybs_admin_password') || null;

// ---------- DOM 參照 ----------
const ledgerBody = document.getElementById('ledger-body');
const listStatus = document.getElementById('list-status');
const filterKeyword = document.getElementById('filter-keyword');
const filterGroup = document.getElementById('filter-group');
const filterSelected = document.getElementById('filter-selected');
const filterVeteran = document.getElementById('filter-veteran');
const adminLockEl = document.getElementById('admin-lock');
const adminLockLabel = document.getElementById('admin-lock-label');
const adminLockBtn = document.getElementById('admin-lock-btn');
const addBtn = document.getElementById('add-btn');

// ---------- 工具 ----------
function setListStatus(text, type) {
  listStatus.textContent = text;
  listStatus.className = 'status-msg' + (type ? ' ' + type : '');
}

function toBool(v) {
  return v === true || v === 'TRUE' || v === 'true' || v === 1;
}

function fmtTime(v) {
  if (!v) return '';
  const d = new Date(v);
  if (isNaN(d.getTime())) return String(v);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${pad(d.getMonth()+1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

async function apiGet(action) {
  const res = await fetch(`${WEB_APP_URL}?action=${action}`);
  return res.json();
}

async function apiPost(payload) {
  const res = await fetch(WEB_APP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

// ---------- 載入資料 ----------
async function loadGroups() {
  try {
    const data = await apiGet('groups');
    groupsCache = Array.isArray(data) && data.length ? data : DEFAULT_GROUPS;
  } catch (err) {
    groupsCache = DEFAULT_GROUPS;
  }
  filterGroup.querySelectorAll('option:not(:first-child)').forEach(o => o.remove());
  const editGroup = document.getElementById('edit-group');
  editGroup.innerHTML = '';
  groupsCache.forEach(g => {
    filterGroup.appendChild(new Option(g, g));
    editGroup.appendChild(new Option(g, g));
  });
}

async function loadMembers() {
  setListStatus('載入中…', '');
  ledgerBody.innerHTML = '<tr class="empty-row"><td colspan="8">載入中…</td></tr>';
  try {
    const data = await apiGet('list');
    allMembers = Array.isArray(data) ? data : [];
    setListStatus(`共 ${allMembers.length} 筆資料`, 'ok');
    applyFilters();
  } catch (err) {
    setListStatus('讀取失敗，請檢查 Google Apps Script 部署設定', 'err');
    ledgerBody.innerHTML = '<tr class="empty-row"><td colspan="8">無法讀取資料</td></tr>';
  }
}

// ---------- 篩選與排序 ----------
function applyFilters() {
  const kw = filterKeyword.value.trim().toLowerCase();
  const g = filterGroup.value;
  const sel = filterSelected.value;
  const vet = filterVeteran.value;

  filteredMembers = allMembers.filter(m => {
    if (kw) {
      const hay = `${m['遊戲名稱']||''} ${m['LineID']||''} ${m['新遊戲名稱']||''}`.toLowerCase();
      if (!hay.includes(kw)) return false;
    }
    if (g && m['組別'] !== g) return false;
    if (sel && toBool(m['是否入選']) !== (sel === 'true')) return false;
    if (vet && toBool(m['是否高戰']) !== (vet === 'true')) return false;
    return true;
  });

  sortMembers();
  render();
}

function sortMembers() {
  if (!sortKey) return;
  filteredMembers.sort((a, b) => {
    let va = a[sortKey], vb = b[sortKey];
    if (sortKey === '是否入選' || sortKey === '是否高戰') {
      va = toBool(va) ? 1 : 0; vb = toBool(vb) ? 1 : 0;
    } else if (sortKey === '時間戳記') {
      va = new Date(va).getTime() || 0; vb = new Date(vb).getTime() || 0;
    } else {
      va = (va || '').toString().toLowerCase();
      vb = (vb || '').toString().toLowerCase();
    }
    if (va < vb) return -1 * sortDir;
    if (va > vb) return 1 * sortDir;
    return 0;
  });
}

document.querySelectorAll('#ledger-table thead th[data-key]').forEach(th => {
  th.addEventListener('click', () => {
    const key = th.dataset.key;
    if (sortKey === key) { sortDir *= -1; } else { sortKey = key; sortDir = 1; }
    document.querySelectorAll('#ledger-table thead th .arrow').forEach(a => a.textContent = '');
    th.querySelector('.arrow').textContent = sortDir === 1 ? '▲' : '▼';
    sortMembers();
    render();
  });
});

[filterKeyword, filterGroup, filterSelected, filterVeteran].forEach(el => {
  el.addEventListener('input', applyFilters);
  el.addEventListener('change', applyFilters);
});

// ---------- 渲染表格 ----------
function render() {
  if (!filteredMembers.length) {
    ledgerBody.innerHTML = '<tr class="empty-row"><td colspan="8">目前沒有符合條件的盟友資料</td></tr>';
    return;
  }
  const unlocked = !!adminPassword;
  ledgerBody.innerHTML = filteredMembers.map(m => {
    const id = m['id'];
    const selected = toBool(m['是否入選']);
    const veteran = toBool(m['是否高戰']);
    return `
      <tr>
        <td>${escapeHtml(m['遊戲名稱'])}</td>
        <td>${escapeHtml(m['LineID'])}</td>
        <td><span class="tag tag-group">${escapeHtml(m['組別'])}</span></td>
        <td>${escapeHtml(m['新遊戲名稱'])}</td>
        <td>
          <label class="flag-toggle ${unlocked ? '' : 'disabled'}">
            <input type="checkbox" data-id="${id}" data-key="是否入選" ${selected ? 'checked' : ''} ${unlocked ? '' : 'disabled'}>
            ${selected ? '入選' : '未入選'}
          </label>
        </td>
        <td>
          <label class="flag-toggle ${unlocked ? '' : 'disabled'}">
            <input type="checkbox" data-id="${id}" data-key="是否高戰" ${veteran ? 'checked' : ''} ${unlocked ? '' : 'disabled'}>
            ${veteran ? '高戰' : '一般'}
          </label>
        </td>
        <td>${fmtTime(m['時間戳記'])}</td>
        <td class="row-actions">
          <button class="btn btn-ghost btn-small" data-action="edit" data-id="${id}" ${unlocked ? '' : 'disabled'}>編輯</button>
          <button class="btn btn-danger-outline btn-small" data-action="delete" data-id="${id}" ${unlocked ? '' : 'disabled'}>刪除</button>
        </td>
      </tr>`;
  }).join('');
}

function escapeHtml(v) {
  if (v === undefined || v === null) return '';
  return String(v)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

// ---------- 表格內互動（Flag 切換／編輯／刪除按鈕） ----------
ledgerBody.addEventListener('change', async (e) => {
  const input = e.target.closest('input[type="checkbox"][data-id]');
  if (!input) return;
  const id = input.dataset.id;
  const key = input.dataset.key;
  const value = input.checked;
  input.disabled = true;
  const result = await apiPost({ action: 'update', id, password: adminPassword, data: { [key]: value } });
  if (result.success) {
    const m = allMembers.find(x => x['id'] === id);
    if (m) m[key] = value;
    applyFilters();
    setListStatus('已更新', 'ok');
  } else {
    setListStatus('更新失敗：' + (result.error || '未知錯誤'), 'err');
    input.checked = !value;
    input.disabled = false;
  }
});

ledgerBody.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const id = btn.dataset.id;
  if (btn.dataset.action === 'edit') openEditModal(id);
  if (btn.dataset.action === 'delete') openDeleteModal(id);
});

// ---------- 匯出 Excel ----------
document.getElementById('export-btn').addEventListener('click', () => {
  const rows = filteredMembers.map(m => ({
    '遊戲名稱': m['遊戲名稱'] || '',
    'Line名稱': m['LineID'] || '',
    '組別': m['組別'] || '',
    '新遊戲名稱': m['新遊戲名稱'] || '',
    '是否入選': toBool(m['是否入選']) ? '是' : '否',
    '是否高戰': toBool(m['是否高戰']) ? '是' : '否',
    '登記時間': fmtTime(m['時間戳記'])
  }));
  if (!rows.length) { setListStatus('目前沒有資料可匯出', 'err'); return; }
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [{wch:16},{wch:16},{wch:14},{wch:16},{wch:10},{wch:10},{wch:18}];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '盟友清單');
  const stamp = new Date().toISOString().slice(0,10);
  XLSX.writeFile(wb, `悠遊白書_盟友清單_${stamp}.xlsx`);
});

// ---------- 解鎖管理權限 ----------
function refreshLockUI() {
  const unlocked = !!adminPassword;
  adminLockEl.classList.toggle('unlocked', unlocked);
  adminLockLabel.textContent = unlocked ? '管理權限：已解鎖' : '管理權限：未解鎖';
  adminLockBtn.textContent = unlocked ? '鎖定' : '解鎖';
  addBtn.disabled = !unlocked;
}

adminLockBtn.addEventListener('click', () => {
  if (adminPassword) {
    adminPassword = null;
    sessionStorage.removeItem('ybs_admin_password');
    refreshLockUI();
    render();
  } else {
    document.getElementById('unlock-password').value = '';
    document.getElementById('unlock-error').textContent = '';
    showModal('unlock-modal');
  }
});

document.getElementById('unlock-confirm').addEventListener('click', async () => {
  const pw = document.getElementById('unlock-password').value;
  if (!pw) { document.getElementById('unlock-error').textContent = '請輸入密碼'; return; }
  const result = await apiPost({ action: 'verify', password: pw });
  if (result.success) {
    adminPassword = pw;
    sessionStorage.setItem('ybs_admin_password', pw);
    refreshLockUI();
    render();
    hideModal('unlock-modal');
  } else {
    document.getElementById('unlock-error').textContent = '密碼錯誤';
  }
});

// ---------- 新增／編輯 Modal ----------
function openEditModal(id) {
  editingId = id;
  const m = allMembers.find(x => x['id'] === id);
  document.getElementById('edit-modal-title').textContent = '編輯盟友資料';
  document.getElementById('edit-gameName').value = m['遊戲名稱'] || '';
  document.getElementById('edit-lineName').value = m['LineID'] || '';
  document.getElementById('edit-group').value = m['組別'] || '';
  document.getElementById('edit-newGameName').value = m['新遊戲名稱'] || '';
  document.getElementById('edit-selected').checked = toBool(m['是否入選']);
  document.getElementById('edit-veteran').checked = toBool(m['是否高戰']);
  document.getElementById('edit-error').textContent = '';
  showModal('edit-modal');
}

addBtn.addEventListener('click', () => {
  editingId = null;
  document.getElementById('edit-modal-title').textContent = '新增盟友';
  document.getElementById('edit-gameName').value = '';
  document.getElementById('edit-lineName').value = '';
  document.getElementById('edit-group').value = groupsCache[0] || '';
  document.getElementById('edit-newGameName').value = '';
  document.getElementById('edit-selected').checked = true;
  document.getElementById('edit-veteran').checked = false;
  document.getElementById('edit-error').textContent = '';
  showModal('edit-modal');
});

document.getElementById('edit-save').addEventListener('click', async () => {
  const gameName = document.getElementById('edit-gameName').value.trim();
  const group = document.getElementById('edit-group').value;
  if (!gameName) { document.getElementById('edit-error').textContent = '請填寫遊戲名稱'; return; }
  if (!group) { document.getElementById('edit-error').textContent = '請選擇組別'; return; }

  const data = {
    '遊戲名稱': gameName,
    'LineID': document.getElementById('edit-lineName').value.trim(),
    '組別': group,
    '新遊戲名稱': document.getElementById('edit-newGameName').value.trim(),
    '是否入選': document.getElementById('edit-selected').checked,
    '是否高戰': document.getElementById('edit-veteran').checked
  };

  const payload = editingId
    ? { action: 'update', id: editingId, password: adminPassword, data }
    : { action: 'add', password: adminPassword, data };

  const result = await apiPost(payload);
  if (result.success) {
    hideModal('edit-modal');
    loadMembers();
  } else {
    document.getElementById('edit-error').textContent = '儲存失敗：' + (result.error || '未知錯誤');
  }
});

// ---------- 刪除 Modal ----------
function openDeleteModal(id) {
  pendingDeleteId = id;
  const m = allMembers.find(x => x['id'] === id);
  document.getElementById('delete-target-name').textContent = `確定要刪除「${m ? m['遊戲名稱'] : ''}」的報名資料嗎？此動作無法復原。`;
  document.getElementById('delete-error').textContent = '';
  showModal('delete-modal');
}

document.getElementById('delete-confirm').addEventListener('click', async () => {
  const result = await apiPost({ action: 'delete', id: pendingDeleteId, password: adminPassword });
  if (result.success) {
    hideModal('delete-modal');
    loadMembers();
  } else {
    document.getElementById('delete-error').textContent = '刪除失敗：' + (result.error || '未知錯誤');
  }
});

// ---------- Modal 共用 ----------
function showModal(id) { document.getElementById(id).classList.add('show'); }
function hideModal(id) { document.getElementById(id).classList.remove('show'); }
document.querySelectorAll('[data-close]').forEach(btn => {
  btn.addEventListener('click', () => hideModal(btn.dataset.close));
});
document.querySelectorAll('.modal-backdrop').forEach(bg => {
  bg.addEventListener('click', (e) => { if (e.target === bg) bg.classList.remove('show'); });
});

document.getElementById('refresh-btn').addEventListener('click', loadMembers);

// ---------- 初始化 ----------
(async function init() {
  refreshLockUI();
  await loadGroups();
  await loadMembers();
})();
