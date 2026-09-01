// Dedicated file for initial Spreadsheet structure setup

function setupSpreadsheetStructure() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  const sheetsConfig = {
    'SharedExpenses': ['expense_id', 'date', 'description', 'category', 'amount', 'paid_by', 'split_type', 'person1_share', 'person2_share', 'notes', 'created_at'],
    'PersonalExpenses': ['expense_id', 'date', 'user_id', 'category', 'description', 'amount', 'notes', 'created_at'],
    'Settlements': ['settlement_id', 'date', 'from_user', 'to_user', 'amount', 'created_at'],
    'RecurringExpenses': ['recurring_id', 'description', 'amount', 'category', 'paid_by', 'split_type', 'person1_share', 'person2_share', 'frequency', 'next_date', 'active', 'notes'],
    'Settings': ['setting', 'value']
  };

  for (const sheetName in sheetsConfig) {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }
    
    // Only add headers if the sheet is completely empty
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, sheetsConfig[sheetName].length).setValues([sheetsConfig[sheetName]]);
      // Bold the headers
      sheet.getRange(1, 1, 1, sheetsConfig[sheetName].length).setFontWeight("bold");
    }
  }
  
  // Delete default Sheet1 if it exists and is empty
  const defaultSheet = ss.getSheetByName('Sheet1');
  if (defaultSheet && defaultSheet.getLastRow() === 0) {
    ss.deleteSheet(defaultSheet);
  }
}
