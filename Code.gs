/**
 * ============================================
 * 悠遊白書 － Google Apps Script 後端
 * ============================================
 * 使用方式請參考 README.md「後端設定」章節。
 * 這段程式碼要貼在 Google 試算表的「擴充功能 → Apps Script」編輯器裡。
 */

// 請填入你的 Google 試算表 ID（網址列 /d/ 與 /edit 之間那一串英數字）
const SHEET_ID = '請填入你的Google試算表ID';

// 管理密碼：用來保護「編輯」「刪除」「切換Flag」等操作，請自行更改成一組不容易猜到的密碼
const ADMIN_PASSWORD = '請自行設定一組管理密碼';

const MEMBER_SHEET_NAME = '盟友';
const GROUP_SHEET_NAME = '組別';

// 盟友工作表欄位順序（第一列標題需與此完全一致）
const MEMBER_HEADERS = ['id', '遊戲名稱', 'LineID', '組別', '新遊戲名稱', '是否入選', '是否高戰', '時間戳記'];

function doGet(e) {
  const action = (e.parameter.action || 'list');
  try {
    if (action === 'groups') return jsonResponse(getGroups());
    return jsonResponse(getMembers());
  } catch (err) {
    return jsonResponse({ success: false, error: err.message });
  }
}

function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonResponse({ success: false, error: '請求格式錯誤' });
  }

  const action = body.action;
  try {
    if (action === 'add') {
      addMember(body.data || {});
      return jsonResponse({ success: true });
    }
    if (action === 'verify') {
      checkPassword(body.password);
      return jsonResponse({ success: true });
    }
    if (action === 'update') {
      checkPassword(body.password);
      updateMember(body.id, body.data || {});
      return jsonResponse({ success: true });
    }
    if (action === 'delete') {
      checkPassword(body.password);
      deleteMember(body.id);
      return jsonResponse({ success: true });
    }
    return jsonResponse({ success: false, error: '未知操作：' + action });
  } catch (err) {
    return jsonResponse({ success: false, error: err.message });
  }
}

function checkPassword(password) {
  if (password !== ADMIN_PASSWORD) {
    throw new Error('管理密碼錯誤');
  }
}

function getSheet(name) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(name);
  if (!sheet) throw new Error(`找不到工作表：${name}`);
  return sheet;
}

function getMembers() {
  const sheet = getSheet(MEMBER_SHEET_NAME);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0];
  return values.slice(1)
    .filter(row => row[0]) // 略過沒有 id 的空白列
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => obj[h] = row[i]);
      return obj;
    });
}

function getGroups() {
  const sheet = getSheet(GROUP_SHEET_NAME);
  const values = sheet.getDataRange().getValues();
  return values.slice(1).map(r => r[0]).filter(v => v !== '' && v !== null);
}

function addMember(data) {
  if (!data['遊戲名稱']) throw new Error('遊戲名稱為必填');
  if (!data['組別']) throw new Error('組別為必填');

  const sheet = getSheet(MEMBER_SHEET_NAME);
  sheet.appendRow([
    Utilities.getUuid(),
    data['遊戲名稱'] || '',
    data['LineID'] || '',
    data['組別'] || '',
    data['新遊戲名稱'] || '',
    true,   // 是否入選，預設 True
    false,  // 是否高戰，預設 False
    new Date()
  ]);
}

function updateMember(id, data) {
  if (!id) throw new Error('缺少 id');
  const sheet = getSheet(MEMBER_SHEET_NAME);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idCol = headers.indexOf('id');

  for (let i = 1; i < values.length; i++) {
    if (values[i][idCol] === id) {
      const rowIndex = i + 1;
      Object.keys(data).forEach(key => {
        const col = headers.indexOf(key);
        if (col !== -1) {
          sheet.getRange(rowIndex, col + 1).setValue(data[key]);
        }
      });
      return;
    }
  }
  throw new Error('找不到該筆盟友資料');
}

function deleteMember(id) {
  if (!id) throw new Error('缺少 id');
  const sheet = getSheet(MEMBER_SHEET_NAME);
  const values = sheet.getDataRange().getValues();
  const idCol = values[0].indexOf('id');

  for (let i = 1; i < values.length; i++) {
    if (values[i][idCol] === id) {
      sheet.deleteRow(i + 1);
      return;
    }
  }
  throw new Error('找不到該筆盟友資料');
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
