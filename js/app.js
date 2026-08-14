// ============================================
// 悠遊白書 － 盟友報名表單邏輯
// ============================================

const groupSelect = document.getElementById('group');
const form = document.getElementById('signup-form');
const submitBtn = document.getElementById('submit-btn');
const statusMsg = document.getElementById('status-msg');

function fillGroupOptions(groups) {
  const list = (groups && groups.length) ? groups : DEFAULT_GROUPS;
  list.forEach(g => {
    const opt = document.createElement('option');
    opt.value = g;
    opt.textContent = g;
    groupSelect.appendChild(opt);
  });
}

async function loadGroups() {
  try {
    const res = await fetch(`${WEB_APP_URL}?action=groups`);
    const data = await res.json();
    fillGroupOptions(Array.isArray(data) ? data : DEFAULT_GROUPS);
  } catch (err) {
    // 讀取失敗時使用預設備援清單，不阻擋使用者填表
    fillGroupOptions(DEFAULT_GROUPS);
  }
}

function setStatus(text, type) {
  statusMsg.textContent = text;
  statusMsg.className = 'status-msg' + (type ? ' ' + type : '');
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  setStatus('', '');

  const gameName = document.getElementById('gameName').value.trim();
  const lineName = document.getElementById('lineName').value.trim();
  const group = document.getElementById('group').value;
  const newGameName = document.getElementById('newGameName').value.trim();

  if (!gameName) { setStatus('請填寫遊戲名稱', 'err'); return; }
  if (!group) { setStatus('請選擇組別', 'err'); return; }

  submitBtn.disabled = true;
  setStatus('送出中…', '');

  const payload = {
    action: 'add',
    data: {
      '遊戲名稱': gameName,
      'LineID': lineName,
      '組別': group,
      '新遊戲名稱': newGameName
    }
  };

  try {
    // 使用 text/plain 避免觸發瀏覽器的 CORS 預檢請求（Apps Script 對 OPTIONS 支援不佳的常見繞法）
    const res = await fetch(WEB_APP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();

    if (result.success) {
      setStatus('登記成功！已加入同盟名冊 ✓', 'ok');
      form.reset();
    } else {
      setStatus('送出失敗：' + (result.error || '未知錯誤'), 'err');
    }
  } catch (err) {
    setStatus('送出失敗，請確認網路連線或稍後再試', 'err');
  } finally {
    submitBtn.disabled = false;
  }
});

loadGroups();
