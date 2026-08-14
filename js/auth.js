// ============================================
// 悠遊白書 － 共用權限控制（導覽列 + 解鎖狀態）
// ============================================
// 未解鎖：只顯示「盟友報名」導覽連結
// 已解鎖：同時顯示「盟友報名」與「盟友清單」導覽連結
// 解鎖狀態存在 sessionStorage，僅在目前分頁有效，關閉分頁即失效

const YBS_AUTH_KEY = 'ybs_admin_password';

function ybsGetPassword() {
  return sessionStorage.getItem(YBS_AUTH_KEY);
}
function ybsIsUnlocked() {
  return !!ybsGetPassword();
}
function ybsSetPassword(pw) {
  sessionStorage.setItem(YBS_AUTH_KEY, pw);
}
function ybsClearPassword() {
  sessionStorage.removeItem(YBS_AUTH_KEY);
}

async function ybsVerifyPassword(pw) {
  try {
    const res = await fetch(WEB_APP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'verify', password: pw })
    });
    const data = await res.json();
    return !!data.success;
  } catch (err) {
    return false;
  }
}

// ---------- 導覽列 ----------
function ybsRenderNav(activePage) {
  const nav = document.getElementById('site-nav');
  if (!nav) return;
  const unlocked = ybsIsUnlocked();
  let html = `<a href="index.html" class="${activePage === 'index' ? 'active' : ''}">S27盟友報名</a>`;
  if (unlocked) {
    html += `<a href="list.html" class="${activePage === 'list' ? 'active' : ''}">盟友清單</a>`;
  }
  nav.innerHTML = html;
}

function ybsRenderLockUI() {
  const el = document.getElementById('admin-lock');
  if (!el) return;
  const unlocked = ybsIsUnlocked();
  const label = document.getElementById('admin-lock-label');
  const btn = document.getElementById('admin-lock-btn');
  el.classList.toggle('unlocked', unlocked);
  label.textContent = unlocked ? '管理權限：已解鎖' : '管理權限：未解鎖';
  btn.textContent = unlocked ? '鎖定' : '解鎖';
}

function ybsShowUnlockModal() {
  document.getElementById('unlock-password').value = '';
  document.getElementById('unlock-error').textContent = '';
  document.getElementById('unlock-modal').classList.add('show');
  document.getElementById('unlock-password').focus();
}
function ybsHideUnlockModal() {
  document.getElementById('unlock-modal').classList.remove('show');
}

/**
 * 初始化頁首的解鎖／導覽互動
 * @param {'index'|'list'} activePage 目前頁面
 * @param {(unlocked: boolean) => void} onChange 解鎖狀態改變時的回呼
 */
function ybsInitAuthUI(activePage, onChange) {
  ybsRenderNav(activePage);
  ybsRenderLockUI();

  const lockBtn = document.getElementById('admin-lock-btn');
  lockBtn.addEventListener('click', () => {
    if (ybsIsUnlocked()) {
      ybsClearPassword();
      ybsRenderNav(activePage);
      ybsRenderLockUI();
      if (onChange) onChange(false);
      if (activePage === 'list') {
        // 在清單頁鎖定後，導回報名頁（清單頁本身僅限已解鎖時瀏覽）
        window.location.href = 'index.html';
      }
    } else {
      ybsShowUnlockModal();
    }
  });

  document.getElementById('unlock-confirm').addEventListener('click', async () => {
    const pw = document.getElementById('unlock-password').value;
    if (!pw) { document.getElementById('unlock-error').textContent = '請輸入密碼'; return; }
    const ok = await ybsVerifyPassword(pw);
    if (ok) {
      ybsSetPassword(pw);
      ybsRenderNav(activePage);
      ybsRenderLockUI();
      ybsHideUnlockModal();
      if (onChange) onChange(true);
    } else {
      document.getElementById('unlock-error').textContent = '密碼錯誤';
    }
  });

  document.querySelectorAll('[data-close="unlock-modal"]').forEach(b => {
    b.addEventListener('click', ybsHideUnlockModal);
  });
}
