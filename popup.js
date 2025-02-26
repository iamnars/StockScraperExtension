document.addEventListener('DOMContentLoaded', () => {
    function requestData() {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, { type: "requestData" }, async (response) => {
                if (chrome.runtime.lastError) {
                    document.getElementById('dataOutput').textContent = "Error: " + chrome.runtime.lastError.message;
                    return;
                }

                if (response.type === "scrapedData") {
                    const data = response.data;
                    document.getElementById('dataOutput').textContent = JSON.stringify(data, null, 2);
                    document.getElementById('exportBtn').addEventListener('click', async () => {
                        await saveToGoogleSheets(data);
                    });
                } else {
                    document.getElementById('dataOutput').textContent = response.message || "No data available";
                    setTimeout(requestData, 2000);
                }
            });
        });
    }
    requestData();
});

async function saveToGoogleSheets(data) {
    try {
        const authToken = await getGoogleAuthToken();
        const spreadsheetId = await createSpreadsheet(authToken);
        console.log("Spreadsheet created with ID:", spreadsheetId);
        await formatHeaderRow(authToken, spreadsheetId);
        console.log("Inserting data into spreadsheet...");
        await insertDataIntoSheet(authToken, spreadsheetId, data);
        alert("Data successfully saved to Google Sheets");
    } catch (error) {
        console.error("Error saving to Google Sheets:", error);
        document.getElementById('dataOutput').textContent = "Failed to save to Google Sheets: " + error.message;
    }
}

function getGoogleAuthToken() {
    return new Promise((resolve, reject) => {
        chrome.identity.getAuthToken({ interactive: true }, (token) => {
            if (chrome.runtime.lastError) {
                console.error("OAuth Error:", chrome.runtime.lastError);
                reject(new Error(chrome.runtime.lastError.message));
            } else {
                console.log("Auth token retrieved successfully");
                resolve(token);
            }
        });
    });
}

async function createSpreadsheet(authToken) {
    const response = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${authToken}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            properties: { title: "Stock Data " + new Date().toISOString() },
            sheets: [{ properties: { title: "Stock Data" } }]
        })
    });
    const data = await response.json();
    if (!response.ok) throw new Error("Failed to create spreadsheet: " + data.error.message);
    return data.spreadsheetId;
}

async function getSheetId(authToken, spreadsheetId, sheetName) {
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
        headers: {
            "Authorization": `Bearer ${authToken}`
        }
    });
    const spreadsheet = await response.json();
    const sheet = spreadsheet.sheets.find(s => s.properties.title === sheetName);
    return sheet ? sheet.properties.sheetId : 0;
}

async function formatHeaderRow(authToken, spreadsheetId) {
    const sheetId = await getSheetId(authToken, spreadsheetId, "Stock Data");
    console.log("Using sheetId:", sheetId);
    const requests = [
        {
            mergeCells: {
                range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 1, endColumnIndex: 8 },
                mergeType: "MERGE_ALL"
            }
        },
        {
            mergeCells: {
                range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 8, endColumnIndex: 14 },
                mergeType: "MERGE_ALL"
            }
        },
        {
            mergeCells: {
                range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 14, endColumnIndex: 18 },
                mergeType: "MERGE_ALL"
            }
        },
        {
            mergeCells: {
                range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 18, endColumnIndex: 23 },
                mergeType: "MERGE_ALL"
            }
        },
        {
            updateCells: {
                rows: [{
                    values: [
                        { userEnteredValue: { stringValue: "" } },
                        {   userEnteredValue: { stringValue: "Price" },
                            userEnteredFormat: { horizontalAlignment: "CENTER" }
                        },
                        {}, {}, {}, {}, {}, {},
                        { userEnteredValue: { stringValue: "Performance" }, userEnteredFormat: { horizontalAlignment: "CENTER" }} ,
                        {}, {}, {}, {}, {},
                        { userEnteredValue: { stringValue: "Technical" }, userEnteredFormat: { horizontalAlignment: "CENTER" } },
                        {}, {}, {},
                        { userEnteredValue: { stringValue: "Fundamentals"} , userEnteredFormat: { horizontalAlignment: "CENTER" } } 
                    ]
                }],
                fields: "userEnteredValue",
                range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 23 }
            }
        }
    ];

    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${authToken}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ requests })
    });

    const responseData = await response.json();
    if (!response.ok) {
        throw new Error("Failed to format header row: " + responseData.error.message);
    }
    console.log("Header row formatted successfully:", responseData);
}

async function insertDataIntoSheet(authToken, spreadsheetId, data) {
    const sheetName = "Stock Data";
    const values = formatDataForSheets(data);
    console.log("Appending data starting at A2...");
    const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A2:append?valueInputOption=RAW`,
        {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${authToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ values })
        }
    );
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error("Failed to insert data: " + errorData.error.message);
    }
    console.log("Data inserted successfully");
}

function formatDataForSheets(data) {
    const headers = ["Stock", "Last", "High", "Low", "Chg", "Chg%", "Volume", "Time", "Daily", "1Week", "1Month", "YTD","1 Year", "3 Years", 'Hourly','Daily','Weekly','Monthly','Avg Vol','Market Cap','Revenue','P/E Ratio','Beta'];
    const rows = [headers];
    data.price.forEach((row, index) => {
        rows.push([
            row.stock,
            row.last,
            row.high,
            row.low,
            row.chg,
            row.chgPct,
            row.volume,
            row.time,
            data.performance[index]?.daily || "N/A",
            data.performance[index]?.week || "N/A",
            data.performance[index]?.month || "N/A",
            data.performance[index]?.ytd || "N/A",
            data.performance[index]?.oneYear || "N/A",
            data.performance[index]?.threeYears || "N/A",
            data.technical[index]?.hourly || "N/A",
            data.technical[index]?.daily || "N/A",
            data.technical[index]?.weekly || "N/A",
            data.technical[index]?.monthly || "N/A",
            data.fundamental[index]?.avgVolume3m || "N/A",
            data.fundamental[index]?.marketCap || "N/A",
            data.fundamental[index]?.revenue || "N/A",
            data.fundamental[index]?.peRatio || "N/A",
            data.fundamental[index]?.beta || "N/A"
        ]);
    });
    return rows;
}