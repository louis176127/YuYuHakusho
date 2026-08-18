// ============================================
// 悠遊白書 － 分組名冊頁邏輯
// ============================================

const lockedGate = document.getElementById('locked-gate');
const rosterContent = document.getElementById('roster-content');
const rosterStatus = document.getElementById('roster-status');
const rosterHead = document.getElementById('roster-head');
const rosterBody = document.getElementById('roster-body');
const onlySelected = document.getElementById('only-selected');

let cachedMembers = [];
let cachedGroups = [];

function setRosterStatus(text, type) {
  rosterStatus.textContent = text;
  rosterStatus.className = 'status-msg' + (type ? ' ' + type : '');
}

function toBool(v) {
  return v === true || v === 'TRUE' || v === 'true' || v === 1;
}

function escapeHtml(v) {
  if (v === undefined || v === null) return '';
  return String(v)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

async function apiGet(action) {
  const res = await fetch(`${WEB_APP_URL}?action=${action}`);
  return res.json();
}

// ---------- 資料整理 ----------
function buildColumns(members, groups) {
  const order = groups && groups.length ? groups.slice() : [];
  const buckets = {};
  order.forEach(g => { buckets[g] = []; });

  const onlyIn = onlySelected.checked;

  members.forEach(m => {
    if (onlyIn && !toBool(m['是否入選'])) return;
    const g = m['組別'] || '未分類';
    if (!buckets[g]) { buckets[g] = []; order.push(g); }
    buckets[g].push({
      name: m['遊戲名稱'] || '',
      veteran: toBool(m['是否高戰'])
    });
  });

  // 高戰優先排前面，同一階層依遊戲名稱排序，方便查找
  order.forEach(g => {
    buckets[g].sort((a, b) => {
      if (a.veteran !== b.veteran) return a.veteran ? -1 : 1;
      return a.name.localeCompare(b.name, 'zh-Hant');
    });
  });

  return { order, buckets };
}

// ---------- 渲染 ----------
function render() {
  const { order, buckets } = buildColumns(cachedMembers, cachedGroups);

  if (!order.length) {
    rosterHead.innerHTML = '';
    rosterBody.innerHTML = '<tr class="empty-row"><td>目前沒有任何組別資料</td></tr>';
    return;
  }

  rosterHead.innerHTML = order.map(g => {
    const count = buckets[g].length;
    return `<th class="no-sort roster-col-head">${escapeHtml(g)}<span class="roster-count">（${count}）</span></th>`;
  }).join('');

  const maxRows = Math.max(0, ...order.map(g => buckets[g].length));

  if (maxRows === 0) {
    rosterBody.innerHTML = `<tr><td colspan="${order.length}" style="text-align:center; color:var(--bronze); padding:30px;">目前沒有任何盟友資料</td></tr>`;
    return;
  }

  let rowsHtml = '';
  for (let i = 0; i < maxRows; i++) {
    rowsHtml += '<tr>';
    order.forEach(g => {
      const member = buckets[g][i];
      if (!member) {
        rowsHtml += '<td class="roster-empty-cell"></td>';
      } else if (member.veteran) {
        rowsHtml += `<td><span class="roster-name roster-name-vet">${escapeHtml(member.name)}</span></td>`;
      } else {
        rowsHtml += `<td><span class="roster-name">${escapeHtml(member.name)}</span></td>`;
      }
    });
    rowsHtml += '</tr>';
  }
  rosterBody.innerHTML = rowsHtml;
}

// ---------- 載入 ----------
async function loadRoster() {
  setRosterStatus('載入中…', '');
  try {
    const [members, groups] = await Promise.all([apiGet('list'), apiGet('groups')]);
    cachedMembers = Array.isArray(members) ? members : [];
    cachedGroups = Array.isArray(groups) && groups.length ? groups : DEFAULT_GROUPS;
    render();
    setRosterStatus(`共 ${cachedMembers.length} 位盟友，${cachedGroups.length} 個組別`, 'ok');
  } catch (err) {
    setRosterStatus('讀取失敗，請檢查 Google Apps Script 部署設定', 'err');
    rosterBody.innerHTML = '<tr class="empty-row"><td>無法讀取資料</td></tr>';
  }
}

document.getElementById('refresh-btn').addEventListener('click', loadRoster);
onlySelected.addEventListener('change', render);

// ---------- 鎖定畫面控制 ----------
function showLockedGate() {
  lockedGate.style.display = '';
  rosterContent.style.display = 'none';
}
function showRosterContent() {
  lockedGate.style.display = 'none';
  rosterContent.style.display = '';
}

document.getElementById('locked-gate-unlock').addEventListener('click', ybsShowUnlockModal);

// ---------- 初始化 ----------
(async function init() {
  ybsInitAuthUI('roster', async (unlocked) => {
    if (unlocked) {
      showRosterContent();
      await loadRoster();
    } else {
      showLockedGate();
    }
  });

  if (ybsIsUnlocked()) {
    showRosterContent();
    await loadRoster();
  } else {
    showLockedGate();
  }
})();
