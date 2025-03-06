document.addEventListener('DOMContentLoaded', () => {
    function requestData() {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, { type: "requestData" }, (response) => {
                if (chrome.runtime.lastError) {
                    document.getElementById('dataOutput').textContent = "Error: " + chrome.runtime.lastError.message;
                    return;
                }

                if (response.type === "scrapedData") {
                    const data = response.data;
                    document.getElementById('dataOutput').textContent = JSON.stringify(data, null, 2);
                    document.getElementById('exportBtn').addEventListener('click', () => {
                        downloadCSV(data);
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

function toNumber(value) {
    return parseFloat(value.replace(/,/g, "")) || 0; // Convert to number, remove commas
}

function downloadCSV(data) {
    const headers = ["Stock", "Last", "High", "Low", "Chg", "Chg%", "Volume", "Time", "Daily", "1Week", "1Month", "YTD", "1 Year", "3 Years", "Hourly", "Daily", "Weekly", "Monthly", "Avg Vol", "Market Cap", "Revenue", "P/E Ratio", "Beta"];
    const rows = [headers.join(",")];

    data.price.forEach((row, index) => {
        rows.push([
            `"${row.stock}"`,
            toNumber(row.last),
            toNumber(row.high),
            toNumber(row.low),
            toNumber(row.chg),
            toNumber(row.chgPct),
            `"${row.volume}"`,
            row.time,
            `"${data.performance[index]?.daily || "N/A"}"`,
            `"${data.performance[index]?.week || "N/A"}"`,
            `"${data.performance[index]?.month || "N/A"}"`,
            `"${data.performance[index]?.ytd || "N/A"}"`,
            `"${data.performance[index]?.oneYear || "N/A"}"`,
            `"${data.performance[index]?.threeYears || "N/A"}"`,
            `"${data.technical[index]?.hourly || "N/A"}"`,
            `"${data.technical[index]?.daily || "N/A"}"`,
            `"${data.technical[index]?.weekly || "N/A"}"`,
            `"${data.technical[index]?.monthly || "N/A"}"`,
            toNumber(data.fundamental[index]?.avgVolume3m || "0"),
            toNumber(data.fundamental[index]?.marketCap || "0"),
            toNumber(data.fundamental[index]?.revenue || "0"),
            toNumber(data.fundamental[index]?.peRatio || "0"),
            toNumber(data.fundamental[index]?.beta || "0")
        ].join(","));
    });

    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "stock_data.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
