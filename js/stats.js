// ============================================
// 悠遊白書 － 盟友統計頁邏輯
// ============================================

const lockedGate = document.getElementById('locked-gate');
const statsContent = document.getElementById('stats-content');
const statsStatus = document.getElementById('stats-status');
const statsBody = document.getElementById('stats-body');

let chartInstance = null;

function setStatsStatus(text, type) {
  statsStatus.textContent = text;
  statsStatus.className = 'status-msg' + (type ? ' ' + type : '');
}

function toBool(v) {
  return v === true || v === 'TRUE' || v === 'true' || v === 1;
}

async function apiGet(action) {
  const res = await fetch(`${WEB_APP_URL}?action=${action}`);
  return res.json();
}

// ---------- 統計計算 ----------
function buildStats(members, groups) {
  // 以「組別」工作表的順序為主，確保沒有人報名的組別也會顯示（人數為 0）
  const order = groups && groups.length ? groups.slice() : [];
  const stats = {};
  order.forEach(g => { stats[g] = { 一般: 0, 高戰: 0 }; });

  members.forEach(m => {
    const g = m['組別'] || '未分類';
    if (!stats[g]) { stats[g] = { 一般: 0, 高戰: 0 }; order.push(g); }
    if (toBool(m['是否高戰'])) stats[g]['高戰']++;
    else stats[g]['一般']++;
  });

  return order.map(g => ({
    group: g,
    normal: stats[g]['一般'],
    veteran: stats[g]['高戰'],
    total: stats[g]['一般'] + stats[g]['高戰']
  }));
}

// ---------- 圖表 ----------
function renderChart(rows) {
  const ctx = document.getElementById('group-chart').getContext('2d');
  const labels = rows.map(r => r.group);
  const normalData = rows.map(r => r.normal);
  const veteranData = rows.map(r => r.veteran);

  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: '一般',
          data: normalData,
          backgroundColor: '#6B7F60',
          borderRadius: 3,
          maxBarThickness: 56
        },
        {
          label: '高戰',
          data: veteranData,
          backgroundColor: '#A6321C',
          borderRadius: 3,
          maxBarThickness: 56
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'top',
          labels: { font: { family: "'Noto Sans TC', sans-serif" }, color: '#2E2A22' }
        },
        tooltip: {
          callbacks: {
            footer: (items) => {
              const total = items.reduce((s, it) => s + it.parsed.y, 0);
              return `總計：${total} 人`;
            }
          }
        }
      },
      scales: {
        x: {
          stacked: true,
          ticks: { font: { family: "'Noto Sans TC', sans-serif" }, color: '#4A453B' },
          grid: { display: false }
        },
        y: {
          stacked: true,
          beginAtZero: true,
          ticks: { precision: 0, font: { family: "'Noto Sans TC', sans-serif" }, color: '#4A453B' },
          grid: { color: 'rgba(140,122,91,0.15)' }
        }
      }
    }
  });
}

// ---------- 表格 ----------
function renderTable(rows) {
  if (!rows.length) {
    statsBody.innerHTML = '<tr class="empty-row"><td colspan="4">目前沒有任何盟友資料</td></tr>';
    return;
  }
  const totalRow = rows.reduce((acc, r) => ({
    normal: acc.normal + r.normal,
    veteran: acc.veteran + r.veteran,
    total: acc.total + r.total
  }), { normal: 0, veteran: 0, total: 0 });

  statsBody.innerHTML = rows.map(r => `
    <tr>
      <td><span class="tag tag-group">${escapeHtml(r.group)}</span></td>
      <td>${r.normal}</td>
      <td>${r.veteran}</td>
      <td><strong>${r.total}</strong></td>
    </tr>
  `).join('') + `
    <tr style="background:rgba(140,122,91,0.15); font-weight:700;">
      <td>總計</td>
      <td>${totalRow.normal}</td>
      <td>${totalRow.veteran}</td>
      <td>${totalRow.total}</td>
    </tr>
  `;
}

function escapeHtml(v) {
  if (v === undefined || v === null) return '';
  return String(v)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

// ---------- 載入 ----------
async function loadStats() {
  setStatsStatus('載入中…', '');
  try {
    const [members, groups] = await Promise.all([apiGet('list'), apiGet('groups')]);
    const rows = buildStats(Array.isArray(members) ? members : [], Array.isArray(groups) ? groups : DEFAULT_GROUPS);
    renderChart(rows);
    renderTable(rows);
    setStatsStatus(`共 ${rows.reduce((s, r) => s + r.total, 0)} 位盟友，${rows.length} 個組別`, 'ok');
  } catch (err) {
    setStatsStatus('讀取失敗，請檢查 Google Apps Script 部署設定', 'err');
    statsBody.innerHTML = '<tr class="empty-row"><td colspan="4">無法讀取資料</td></tr>';
  }
}

document.getElementById('refresh-btn').addEventListener('click', loadStats);

// ---------- 鎖定畫面控制 ----------
function showLockedGate() {
  lockedGate.style.display = '';
  statsContent.style.display = 'none';
}
function showStatsContent() {
  lockedGate.style.display = 'none';
  statsContent.style.display = '';
}

document.getElementById('locked-gate-unlock').addEventListener('click', ybsShowUnlockModal);

// ---------- 初始化 ----------
(async function init() {
  ybsInitAuthUI('stats', async (unlocked) => {
    if (unlocked) {
      showStatsContent();
      await loadStats();
    } else {
      showLockedGate();
    }
  });

  if (ybsIsUnlocked()) {
    showStatsContent();
    await loadStats();
  } else {
    showLockedGate();
  }
})();
