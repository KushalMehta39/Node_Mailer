function onEdit(e) {
  var sheet = e.source.getActiveSheet();
  var range = e.range;
  var sheetName = sheet.getName();

  // Handle Payment Status logic (column P)
  if (range.getColumn() === 17 && range.getRow() >= 2 && range.getRow() <= 1000) {
    handlePaymentStatus(e, sheet, range);
  }

  // Handle Transfer logic from "Entry" sheet to "Trades" sheet
  if (sheetName === "Entry" && range.getColumn() === sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].indexOf("Transfer") + 1) {
    handleTransfer(e, sheet, range);
  }

  // Handle Inventory logic (column C, Row 2 of "Inventory" sheet)
  if (sheetName === "Inventory" && range.getColumn() == 3 && range.getRow() == 2 && range.getValue() === "Count") {
    manualRun();
  }
}

// Function to handle Payment Status logic
function handlePaymentStatus(e, sheet, range) {
  var sheetName = sheet.getName();
  var paymentStatus = range.getValue();
  var row = range.getRow();
  var rowData = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];

  var tradeSheet = e.source.getSheetByName("Trades");
  var paySheet = e.source.getSheetByName("Payment");
  var deliverySheet = e.source.getSheetByName("Delivery");
  var allDoneSheet = e.source.getSheetByName("All Done");

  if (paymentStatus === "R" && sheetName !== "Trades") {
    tradeSheet.appendRow(rowData);
    sheet.deleteRow(row);
  } else if (paymentStatus === "P" && sheetName !== "Delivery") {
    deliverySheet.appendRow(rowData);
    sheet.deleteRow(row);
  } else if (paymentStatus === "D" && sheetName !== "Payment") {
    paySheet.appendRow(rowData);
    sheet.deleteRow(row);
  } else if (paymentStatus === "PD" && sheetName !== "All Done") {
    allDoneSheet.appendRow(rowData);
    sheet.deleteRow(row);
    updateInventory(e.source, rowData); // Update inventory for ALL DONE
  }
}

// Function to handle Transfer from "Entry" sheet to "Trades" sheet
function handleTransfer(e, sheet, range) {
  const transferColumnName = "Transfer";
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const transferColumnIndex = headers.indexOf(transferColumnName) + 1;
  
  if (transferColumnIndex === 0) return;

  const row = range.getRow();
  if (range.getColumn() === transferColumnIndex && range.getValue() === "Yes") {
    const tradeSheet = e.source.getSheetByName("Trades");
    const existingData = tradeSheet.getDataRange().getValues();
    const currentRowData = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
    const rowWithoutTransfer = currentRowData.slice(0, transferColumnIndex - 1).concat(currentRowData.slice(transferColumnIndex));

    const isAlreadyCopied = existingData.some(tradeRow => 
      tradeRow.slice(0, rowWithoutTransfer.length).toString() === rowWithoutTransfer.toString()
    );

    if (!isAlreadyCopied) {
      tradeSheet.appendRow(rowWithoutTransfer);
    }
  }
}

// Function to handle manual Run logic for inventory
function manualRun() {
  const sheetName = "Entry";
  const processedColumn = 19;

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  let row = 2;
  let lastRow = sheet.getLastRow();

  while (row <= lastRow) {
    const scriptName = sheet.getRange(row, headers.indexOf("Script Name") + 1).getValue().trim();
    const buySell = sheet.getRange(row, headers.indexOf("Buy/Sell") + 1).getValue();
    const qty = sheet.getRange(row, headers.indexOf("Qty") + 1).getValue();
    const processedFlag = sheet.getRange(row, headers.indexOf("Processed") + 1).getValue();
    
    if (processedFlag === true || !scriptName || !qty) {
      Logger.log(`Skipping row ${row} due to missing Script Name or Qty or already processed.`);
      row++;
      continue;
    }

    Logger.log(`Processing row ${row}: Script Name: ${scriptName}, Buy/Sell: ${buySell}, Qty: ${qty}`);
    
    if (buySell === 'Buy') {
      addToInventory(scriptName, qty);
    } else if (buySell === 'Sell') {
      subtractFromInventory(scriptName, qty);
    }

    sheet.getRange(row, headers.indexOf("Processed") + 1).setValue(true);
    row++;
  }
}

function addToInventory(scriptName, qty) {
  const inventorySheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Inventory");
  
  const inventoryData = inventorySheet.getDataRange().getValues();
  let inventoryRowIndex = -1;
  
  for (let i = 1; i < inventoryData.length; i++) {
    if (inventoryData[i][0].trim() === scriptName) {
      inventoryRowIndex = i;
      break;
    }
  }

  if (inventoryRowIndex === -1) {
    inventorySheet.appendRow([scriptName, qty]);
    Logger.log(`Added ${scriptName} with Net Qty: ${qty}`);
  } else {
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
  
  for (let i = 1; i < inventoryData.length; i++) {
    if (inventoryData[i][0].trim() === scriptName) {
      inventoryRowIndex = i;
      break;
    }
  }

  if (inventoryRowIndex !== -1) {
    const currentInventoryQty = inventoryData[inventoryRowIndex][1];
    const updatedQty = currentInventoryQty - qty;
    inventorySheet.getRange(inventoryRowIndex + 1, 2).setValue(updatedQty);
    Logger.log(`Updated ${scriptName} with new Net Qty: ${updatedQty}`);
  } else {
    Logger.log(`Script ${scriptName} not found in Inventory to subtract.`);
  }
}
