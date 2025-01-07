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
  if (sheetName === "Commission" && range.getColumn() == 10 && range.getRow() == 1 && range.getValue() === "Count") {
    calculateCommissionManually();
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

function calculateCommissionManually() {
  const sheetName = "Entry";  // Change to "Entry" sheet for data
  const commissionSheetName = "Commission";  // The sheet where commissions should be added
  
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  const commissionSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(commissionSheetName);
  
  if (!sheet || !commissionSheet) {
    Logger.log("Sheet not found.");
    return;
  }

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const commissionData = commissionSheet.getDataRange().getValues(); // Get all existing data in the Commission sheet
  
  // Create a set to track unique commission entries in Commission sheet
  const existingEntries = new Set();
  commissionData.forEach(function(row) {
    const uniqueKey = row[1] + row[0] + row[3] + row[2] + row[4] + row[5]; // Broker Name + Time + Deal Date + Client Name + Script Name + Buy/Sell
    existingEntries.add(uniqueKey); // Add combination of fields as unique key
  });

  // Loop through rows starting from 2 and continue until an empty row is found
  let row = 2;  // Start from the second row
  while (true) {
    const time = sheet.getRange(row, headers.indexOf("Time") + 1).getValue(); // Get the Time value
    const brokerName = sheet.getRange(row, headers.indexOf("Broker Name") + 1).getValue();
    const clientName = sheet.getRange(row, headers.indexOf("Client Name") + 1).getValue().trim(); // Remove leading/trailing spaces
    const dealDate = sheet.getRange(row, headers.indexOf("Deal Date") + 1).getValue();
    const scriptName = sheet.getRange(row, headers.indexOf("Script Name") + 1).getValue();
    const buySell = sheet.getRange(row, headers.indexOf("Buy/Sell") + 1).getValue();
    const brokerRate = sheet.getRange(row, headers.indexOf("Broker Rate") + 1).getValue();
    const clientRate = sheet.getRange(row, headers.indexOf("Customer Rate") + 1).getValue();
    const qty = sheet.getRange(row, headers.indexOf("Qty") + 1).getValue();

    // Log the values being fetched from the row for debugging
    Logger.log(`Processing row ${row}: Time: ${time}, Broker Name: ${brokerName}, Client Name: ${clientName}, Deal Date: ${dealDate}`);

    // Check if the necessary fields are filled before calculating commission
    if (brokerRate && clientRate && qty) {
      // Calculate the absolute difference to ensure the commission is always positive
      const difference = Math.abs(clientRate - brokerRate);  // Make the difference positive
      const totalCommission = difference * qty;    // Calculate the total commission

      // Create a unique key for the current row, including Buy/Sell
      const currentKey = brokerName + time + dealDate + clientName + scriptName + buySell;

      // Check if the combination already exists in the Commission sheet
      if (existingEntries.has(currentKey)) {
        Logger.log(`Duplicate entry found for Time: ${time}, Broker Name: ${brokerName}, Client Name: ${clientName}, Script Name: ${scriptName}, Buy/Sell: ${buySell}. Skipping.`);
      } else {
        // Append the calculated commission data to the Commission sheet
        commissionSheet.appendRow([time, brokerName, clientName, dealDate, scriptName, buySell, qty, difference, totalCommission]);
        Logger.log("Commission added to the Commission sheet.");
        existingEntries.add(currentKey);  // Add the new entry to the set of existing entries
      }
    } else {
      Logger.log(`Missing necessary values for commission calculation in row ${row}`);
    }

    // Check if the current row is empty (use clientName or another column that should have data)
    if (!clientName) {
      Logger.log(`No data found in row ${row}, stopping.`);
      break;  // Exit the loop if we encounter an empty row
    }

    row++;  // Move to the next row
  }
}
