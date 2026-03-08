# Google Sheets Generic Proxy Webhook Setup

Because Google Sheets API requires OAuth authentication to push data programmatically (even for "Anyone with the link can edit" sheets), Orchable utilizes a generic Google Apps Script Web App as a proxy bridge.

You only need to deploy this Web App **once** for your entire Orchable instance.

## Step 1: Create the Google Apps Script

1. Go to [script.google.com](https://script.google.com/).
2. Click **New Project**.
3. Replace all the code in `Code.gs` with the following:

```javascript
function doPost(e) {
  try {
    var rawTsv = e.postData.contents;
    var sheetUrl = e.parameter.sheetUrl;
    var sheetName = e.parameter.sheetName || "Sheet1";
    
    if (!sheetUrl) {
      throw new Error("Missing sheetUrl parameter");
    }

    // Extract ID from URL if a full URL is provided
    var sheetId = sheetUrl;
    var match = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      sheetId = match[1];
    }
    
    // Parse TSV payload. Utilities.parseCsv uses comma by default, so we specify tab.
    var rows = Utilities.parseCsv(rawTsv, '\t');
    if (!rows || rows.length === 0) {
      return ContentService.createTextOutput(JSON.stringify({success: false, message: "Empty data"}))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    var ss = SpreadsheetApp.openById(sheetId);
    var sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      throw new Error("Sheet name not found: " + sheetName);
    }
    
    // Append rows efficiently using setValues
    var startRow = Math.max(sheet.getLastRow() + 1, 1);
    sheet.getRange(startRow, 1, rows.length, rows[0].length).setValues(rows);
    
    return ContentService.createTextOutput(JSON.stringify({success: true, appendedRows: rows.length}))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(error) {
    return ContentService.createTextOutput(JSON.stringify({success: false, error: error.message}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

## Step 2: Deploy as a Web App

1. At the top right of the Google Apps Script editor, click **Deploy > New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Under **Execute as**, confirm it is set to **Me**.
4. Under **Who has access**, select **Anyone**.
5. Click **Deploy**. (Google will ask you to authorize access; follow the prompts, click "Advanced", and "Go to script (unsafe)").
6. Copy the generated **Web App URL**. It will look something like `https://script.google.com/macros/s/.../exec`.

## Step 3: Configure Orchable

1. Open your Orchable `.env` or `.env.local` file at the root of your project.
2. Add the URL you copied as an environment variable:

```env
VITE_GOOGLE_SHEETS_PROXY_URL=https://script.google.com/macros/s/.../exec
```

1. Restart your dev server (`pnpm dev`).

## Step 4: Using in Orchable

In any Stage Config, under the "Contract" tab -> "Stage Export":
- Switch the **Destination:** to "Google Sheets via Webhook"
- Provide any "anyone can edit" **Google Sheet Link** (or just the sheet ID).
- Provide the **Sheet Name** exactly as it appears on the tab (e.g., `Sheet1`).
- Ensure **Format** is set to **TSV (For Google Sheets)**.

Now, whenever that Stage completes processing a batch or task, it will automatically append the results directly into that Google Sheet!
