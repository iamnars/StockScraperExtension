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
                    setTimeout(requestData, 2000); // Retry after 2 seconds if no data yet
                }
            });
        });
    }
    requestData(); // Initial request
});

async function saveToGoogleSheets(data) {
    try {
        const authToken = await getGoogleAuthToken();
        const spreadsheetId = await createSpreadsheet(authToken);
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
            sheets: [{ properties: { title: "Stock Data" } }] // Explicitly create "Stock Data" sheet
        })
    });
    const data = await response.json();
    if (!response.ok) throw new Error("Failed to create spreadsheet: " + data.error.message);
    return data.spreadsheetId;
}

async function insertDataIntoSheet(authToken, spreadsheetId, data) {
    const sheetName = "Stock Data";
    const values = formatDataForSheets(data);
    const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A1:append?valueInputOption=RAW`,
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
}

function formatDataForSheets(data) {
    const headers = ["Stock", "Last", "High", "Low", "Chg", "Chg%", "Volume", "Time", "Daily", "Weekly", "Monthly", "YTD"];
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
            data.technical[index]?.weekly || "N/A",
            data.technical[index]?.monthly || "N/A",
            data.performance[index]?.ytd || "N/A"
        ]);
    });
    return rows;
}