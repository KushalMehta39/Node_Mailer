function onEdit(e) {
  const sheet = e.source.getActiveSheet();
  const editedCell = e.range;
  
  // Check if the edited cell is in Column 3, Row 2 of the "Inventory" sheet
  if (sheet.getName() === "Inventory" && editedCell.getColumn() == 3 && editedCell.getRow() == 2 && editedCell.getValue() === "Count") {
    // Run the manualRun function when "Count" is written in Column 3, Row 2 of the "Inventory" sheet
    manualRun();
  }
}

function manualRun() {
  const sheetName = "Entry";  // Name of the sheet where entries are made
  const processedColumn = 19;  // The column index where "Processed" flag will be (6th column, for example)

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  let row = 2;  // Start from the second row
  let lastRow = sheet.getLastRow();  // Get the last row of the sheet

  // Loop through each row in the "Entry" sheet
  while (row <= lastRow) {
    const scriptName = sheet.getRange(row, headers.indexOf("Script Name") + 1).getValue().trim();
    const buySell = sheet.getRange(row, headers.indexOf("Buy/Sell") + 1).getValue();
    const qty = sheet.getRange(row, headers.indexOf("Qty") + 1).getValue();
    const processedFlag = sheet.getRange(row, headers.indexOf("Processed") + 1).getValue();
    
    // Skip if the row is already processed
    if (processedFlag === true || !scriptName || !qty) {
      Logger.log(`Skipping row ${row} due to missing Script Name or Qty or already processed.`);
      row++;
      continue;
    }

    Logger.log(`Processing row ${row}: Script Name: ${scriptName}, Buy/Sell: ${buySell}, Qty: ${qty}`);
    
    // Process Buy/Sell
    if (buySell === 'Buy') {
      // For Buy, increase the qty
      addToInventory(scriptName, qty);
    } else if (buySell === 'Sell') {
      // For Sell, decrease the qty
      subtractFromInventory(scriptName, qty);
    }

    // Mark the row as processed
    sheet.getRange(row, headers.indexOf("Processed") + 1).setValue(true);

    row++;  // Move to the next row
  }
}

function addToInventory(scriptName, qty) {
  const inventorySheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Inventory");
  
  const inventoryData = inventorySheet.getDataRange().getValues();
  let inventoryRowIndex = -1;
  
  // Search for the script name in the Inventory sheet
  for (let i = 1; i < inventoryData.length; i++) {
    if (inventoryData[i][0].trim() === scriptName) {
      inventoryRowIndex = i;
      break;
    }
  }

  if (inventoryRowIndex === -1) {
    // If script is not found, add it
    inventorySheet.appendRow([scriptName, qty]);
    Logger.log(`Added ${scriptName} with Net Qty: ${qty}`);
  } else {
    // If script is found, update the quantity
    const currentInventoryQty = inventoryData[inventoryRowIndex][1];
    const updatedQty = currentInventoryQty + qty;
    inventorySheet.getRange(inventoryRowIndex + 1, 2).setValue(updatedQty);
    Logger.log(`Updated ${scriptName} with new Net Qty: ${updatedQty}`);
  }
}

function subtractFromInventory(scriptName, qty) {
  const inventorySheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Inventory");
  
  const inventoryData = inventorySheet.getDataRange().getValues();
  let inventoryRowIndex = -1;
  
  // Search for the script name in the Inventory sheet
  for (let i = 1; i < inventoryData.length; i++) {
    if (inventoryData[i][0].trim() === scriptName) {
      inventoryRowIndex = i;
      break;
    }
  }

  if (inventoryRowIndex !== -1) {
    // If script is found, update the quantity
    const currentInventoryQty = inventoryData[inventoryRowIndex][1];
    const updatedQty = currentInventoryQty - qty;
    inventorySheet.getRange(inventoryRowIndex + 1, 2).setValue(updatedQty);
    Logger.log(`Updated ${scriptName} with new Net Qty: ${updatedQty}`);
  } else {
    Logger.log(`Script ${scriptName} not found in Inventory to subtract.`);
  }
}
