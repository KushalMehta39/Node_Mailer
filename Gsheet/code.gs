function onEdit(e) {
  const sheetName = "Entry"; // Source sheet
  const targetSheetName = "Trades"; // Target sheet
  const transferColumnName = "Transfer"; // Column to monitor

  const sheet = e.source.getActiveSheet();
  if (sheet.getName() !== sheetName) return;

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const transferColumnIndex = headers.indexOf(transferColumnName) + 1;

  if (transferColumnIndex === 0) {
    SpreadsheetApp.getUi().alert(`Column "${transferColumnName}" not found.`);
    return;
  }

  const row = e.range.getRow();
  const col = e.range.getColumn();

  if (col === transferColumnIndex && row > 1 && e.value === "Yes") {
    const tradeSheet = e.source.getSheetByName(targetSheetName);
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
