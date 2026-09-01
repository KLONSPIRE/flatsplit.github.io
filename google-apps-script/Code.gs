// FlatSplit Google Apps Script Backend
const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

function doGet(e) {
  try {
    const action = e.parameter.action;
    let result;
    
    switch(action) {
      case 'getDashboard':
        result = getDashboardData(e.parameter.month, e.parameter.year);
        break;
      case 'getSharedExpenses':
        result = getSharedExpenses(e.parameter.month, e.parameter.year);
        break;
      case 'getPersonalExpenses':
        result = getPersonalExpenses(e.parameter.userId, e.parameter.month, e.parameter.year);
        break;
      case 'getSettlements':
        result = getSettlements();
        break;
      default:
        result = { success: false, error: "Invalid GET action" };
    }
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({success: false, error: error.message}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    let result;
    
    switch(data.action) {
      case 'addSharedExpense':
        result = addSharedExpense(data.payload);
        break;
      case 'addPersonalExpense':
        result = addPersonalExpense(data.payload);
        break;
      case 'addSettlement':
        result = addSettlement(data.payload);
        break;
      case 'initSpreadsheet':
        result = initSpreadsheet();
        break;
      default:
        result = { success: false, error: "Invalid POST action" };
    }
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({success: false, error: error.message}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// --- INITIALIZATION ---
function initSpreadsheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ["SharedExpenses", "PersonalExpenses", "Settlements", "RecurringExpenses", "Settings"];
  
  sheets.forEach(name => {
    if (!ss.getSheetByName(name)) {
      ss.insertSheet(name);
    }
  });
  
  // Setup Headers
  const seSheet = ss.getSheetByName("SharedExpenses");
  if(seSheet.getLastRow() === 0) {
    seSheet.appendRow(["expense_id", "date", "description", "category", "amount", "paid_by", "split_type", "person1_share", "person2_share", "notes", "created_at"]);
  }
  
  const peSheet = ss.getSheetByName("PersonalExpenses");
  if(peSheet.getLastRow() === 0) {
    peSheet.appendRow(["expense_id", "date", "user_id", "category", "description", "amount", "notes", "created_at"]);
  }
  
  const setSheet = ss.getSheetByName("Settlements");
  if(setSheet.getLastRow() === 0) {
    setSheet.appendRow(["settlement_id", "date", "from_user", "to_user", "amount", "created_at"]);
  }

  return { success: true, message: "Spreadsheet initialized" };
}

// --- SHARED EXPENSES LOGIC ---
function getDashboardData(month, year) {
  const expenses = getSharedExpenses(month, year);
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  const fairShare = total / 2;
  
  let user1Paid = 0, user2Paid = 0;
  expenses.forEach(e => {
    if(e.paid_by === 'user1') user1Paid += e.amount;
    if(e.paid_by === 'user2') user2Paid += e.amount;
  });
  
  // Calculate Balance (Who owes whom)
  let balance = 0;
  let owedTo = "";
  if (user1Paid > fairShare) {
    balance = user1Paid - fairShare;
    owedTo = "user1"; // user2 owes user1
  } else if (user2Paid > fairShare) {
    balance = user2Paid - fairShare;
    owedTo = "user2"; // user1 owes user2
  }

  return {
    success: true,
    data: {
      totalShared: total,
      user1Paid, user2Paid,
      fairShare,
      balance, owedTo,
      expenses
    }
  };
}

function getSharedExpenses(month, year) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("SharedExpenses");
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  const headers = data.shift();
  return data
    .filter(row => {
      if(!row[1]) return false;
      const d = new Date(row[1]);
      return d.getMonth() == month && d.getFullYear() == year;
    })
    .map(row => {
      let obj = {};
      headers.forEach((h, i) => obj[h] = row[i]);
      obj.amount = parseFloat(obj.amount);
      obj.person1_share = parseFloat(obj.person1_share);
      obj.person2_share = parseFloat(obj.person2_share);
      return obj;
    });
}

function addSharedExpense(payload) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("SharedExpenses");
  const id = `EXP-${Date.now()}`;
  const p1Share = payload.split_type === 'equal' ? payload.amount/2 : payload.person1_share;
  const p2Share = payload.split_type === 'equal' ? payload.amount/2 : payload.person2_share;
  
  if(payload.split_type === 'custom' && (p1Share + p2Share !== payload.amount)) {
    return { success: false, error: "Custom split must equal total amount" };
  }

  sheet.appendRow([
    id, payload.date, payload.description, payload.category, 
    payload.amount, payload.paid_by, payload.split_type, 
    p1Share, p2Share, payload.notes || "", new Date().toISOString()
  ]);
  
  return { success: true, id };
}

// --- PERSONAL EXPENSES LOGIC ---
function getPersonalExpenses(userId, month, year) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("PersonalExpenses");
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  const headers = data.shift();
  return data
    .filter(row => {
      if(!row[1] || row[2] !== userId) return false;
      const d = new Date(row[1]);
      return d.getMonth() == month && d.getFullYear() == year;
    })
    .map(row => {
      let obj = {};
      headers.forEach((h, i) => obj[h] = row[i]);
      obj.amount = parseFloat(obj.amount);
      return obj;
    });
}

function addPersonalExpense(payload) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("PersonalExpenses");
  const id = `PER-${Date.now()}`;
  
  sheet.appendRow([
    id, payload.date, payload.user_id, payload.category, 
    payload.description, payload.amount, payload.notes || "", new Date().toISOString()
  ]);
  
  return { success: true, id };
}

// --- SETTLEMENTS LOGIC ---
function addSettlement(payload) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Settlements");
  const id = `SET-${Date.now()}`;
  
  sheet.appendRow([
    id, payload.date, payload.from_user, payload.to_user, payload.amount, new Date().toISOString()
  ]);
  
  return { success: true, id };
}

function getSettlements() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Settlements");
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data.shift();
  return data.map(row => {
    let obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    obj.amount = parseFloat(obj.amount);
    return obj;
  }).reverse(); // Latest first
}
