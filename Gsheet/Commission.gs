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
