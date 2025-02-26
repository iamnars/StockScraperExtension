console.log("Content script loaded on:", window.location.href);
let scrapedData = null;

async function extractTableData() {
    const data = {
        price: [],
        performance: [],
        technical: [],
        fundamental: []
    };

    // Wait for tabs to load
    await waitForElement('[role="tab"]', 4);
    const tabs = document.querySelectorAll('[role="tab"]');
    console.log("Found tabs:", tabs.length);

    // Load all stock data by clicking "Load More"
    await loadAllData();

    // Process each tab in order: Price, Performance, Technical, Fundamentals
    const tabOrder = [0, 1, 2, 3];
    for (let arrIndex = 0; arrIndex < tabOrder.length; arrIndex++) {
        const index = tabOrder[arrIndex];
        tabs[index].click();
        console.log(`Switched to tab: ${index}`);

        // Wait for table to update after tab switch
        await new Promise(resolve => setTimeout(resolve, 1000));
        const table = document.querySelector('tbody.datatable-v2_body__8TXQk');
        if (!table) {
            console.log("Table not found for tab:", index);
            continue;
        }

        const rows = table.querySelectorAll('tr.datatable-v2_row__hkEus');
        const tabData = [];

        rows.forEach(row => {
            const cells = Array.from(row.querySelectorAll('td')).slice(1);
            const stockName = cells[0]?.textContent.trim() || 'N/A';
            let rowData = { stock: stockName };

            if (index === 3) { // Fundamentals tab
                rowData = {
                    stock: stockName,
                    avgVolume3m: cells[1]?.textContent.trim() || 'N/A',
                    marketCap: cells[2]?.textContent.trim() || 'N/A',
                    revenue: cells[3]?.textContent.trim() || 'N/A',
                    peRatio: cells[4]?.textContent.trim() || 'N/A',
                    beta: cells[5]?.textContent.trim() || 'N/A'
                };
            } else if (index === 2) { // Technical
                rowData = {
                    stock: stockName,
                    hourly: cells[1]?.textContent.trim() || 'N/A',
                    daily: cells[2]?.textContent.trim() || 'N/A',
                    weekly: cells[3]?.textContent.trim() || 'N/A',
                    monthly: cells[4]?.textContent.trim() || 'N/A'
                };
            } else if (index === 1) { // Performance
                rowData = {
                    stock: stockName,
                    daily: cells[1]?.textContent.trim() || 'N/A',
                    week: cells[2]?.textContent.trim() || 'N/A',
                    month: cells[3]?.textContent.trim() || 'N/A',
                    ytd: cells[4]?.textContent.trim() || 'N/A',
                    oneYear: cells[5]?.textContent.trim() || 'N/A',
                    threeYears: cells[6]?.textContent.trim() || 'N/A'
                };
            } else if (index === 0) { // Price
                rowData = {
                    stock: stockName,
                    last: cells[1]?.textContent.trim() || 'N/A',
                    high: cells[2]?.textContent.trim() || 'N/A',
                    low: cells[3]?.textContent.trim() || 'N/A',
                    chg: cells[4]?.textContent.trim() || 'N/A',
                    chgPct: cells[5]?.textContent.trim() || 'N/A',
                    volume: cells[6]?.textContent.trim() || 'N/A',
                    time: cells[7]?.textContent.trim() || 'N/A'
                };
            }

            tabData.push(rowData);
        });

        if (index === 0) data.price = tabData;
        else if (index === 1) data.performance = tabData;
        else if (index === 2) data.technical = tabData;
        else if (index === 3) data.fundamental = tabData;

        if (arrIndex === tabOrder.length - 1) {
            tabs[3].click(); // Set Fundamentals as active tab
            scrapedData = data;
            console.log("Data scraped and stored:", scrapedData);
        }
    }
}

// Helper function to wait for elements
function waitForElement(selector, minCount = 1, timeout = 10000) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        const checkExist = setInterval(() => {
            const elements = document.querySelectorAll(selector);
            if (elements.length >= minCount) {
                clearInterval(checkExist);
                resolve();
            } else if (Date.now() - startTime > timeout) {
                clearInterval(checkExist);
                reject(new Error(`Timeout waiting for ${selector}`));
            }
        }, 500);
    });
}

// Function to click "Load More" until all data is loaded
async function loadAllData() {
    // Adjust this selector based on the actual "Load More" button's HTML
    const loadMoreButtonSelector = 'button[class*="load-more"]'; // Example; inspect the button to confirm
    let loadMoreButton = document.querySelector(loadMoreButtonSelector);

    while (loadMoreButton && !loadMoreButton.disabled) {
        console.log("Clicking Load More button...");
        loadMoreButton.click();

        // Wait for new rows to load
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Check if more data loaded or button disappeared/disabled
        loadMoreButton = document.querySelector(loadMoreButtonSelector);
        const table = document.querySelector('tbody.datatable-v2_body__8TXQk');
        if (!table) continue;
        const rowCount = table.querySelectorAll('tr.datatable-v2_row__hkEus').length;
        console.log(`Current row count: ${rowCount}`);
    }
    console.log("All data loaded or no more Load More button.");
}

// Listen for messages from popup.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "requestData") {
        if (scrapedData) {
            sendResponse({ type: "scrapedData", data: scrapedData });
        } else {
            sendResponse({ type: "noData", message: "No data available yet. Please wait or refresh the page." });
        }
    }
    return true; // Indicates asynchronous response
});

window.addEventListener('load', () => {
    extractTableData().catch(err => console.error("Extraction failed:", err));
});