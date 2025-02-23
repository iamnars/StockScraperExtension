// Updated content.js to rearrange tabs and set Fundamentals as default
let scrapedData = null;

function extractTableData() {
  const data = {
    price: [],
    performance: [],
    technical: [],
    fundamental: []
  };

  const waitForTabs = setInterval(() => {
    const tabs = document.querySelectorAll('[role="tab"]');
    if (tabs.length >= 4) {
      clearInterval(waitForTabs);
      
      // Click tabs in new order: Price, Performance, Technical, Fundamentals
      const tabOrder = [0, 1, 2, 3];
      tabOrder.forEach((index, arrIndex) => {
        setTimeout(() => {
          tabs[index].click();
          setTimeout(() => {
            const table = document.querySelector('tbody.datatable-v2_body__8TXQk');
            if (!table) return;
            
            const rows = table.querySelectorAll('tr.datatable-v2_row__hkEus');
            const tabData = [];
            
            rows.forEach(row => {
              const cells = Array.from(row.querySelectorAll('td')).slice(1);
              const stockName = cells[0]?.textContent.trim() || 'N/A';
              let rowData = { stock: stockName };
              
              if (index === 3) { // Price tab
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
              } else if (index === 2) { // Performance
                rowData = {
                  stock: stockName,
                  daily: cells[1]?.textContent.trim() || 'N/A',
                  week: cells[2]?.textContent.trim() || 'N/A',
                  month: cells[3]?.textContent.trim() || 'N/A',
                  ytd: cells[4]?.textContent.trim() || 'N/A'
                };
              } else if (index === 1) { // Technical
                rowData = {
                  stock: stockName,
                  daily: cells[1]?.textContent.trim() || 'N/A',
                  weekly: cells[2]?.textContent.trim() || 'N/A',
                  monthly: cells[3]?.textContent.trim() || 'N/A'
                };
              } else if (index === 0) { // Fundamentals
                rowData = {
                  stock: stockName,
                  avgVolume3m: cells[1]?.textContent.trim() || 'N/A',
                  marketCap: cells[2]?.textContent.trim() || 'N/A',
                  revenue: cells[3]?.textContent.trim() || 'N/A',
                  peRatio: cells[4]?.textContent.trim() || 'N/A',
                  beta: cells[5]?.textContent.trim() || 'N/A'
                };
              }
              
              tabData.push(rowData);
            });
            
            if (index === 3) data.price = tabData;
            else if (index === 2) data.performance = tabData;
            else if (index === 1) data.technical = tabData;
            else if (index === 0) data.fundamental = tabData;
            
            if (arrIndex === tabOrder.length - 1) {
              tabs[3].click(); // Set Fundamentals as active tab
              scrapedData = data;
              console.log("Data scraped and stored:", scrapedData);
            }
          }, 1000);
        }, arrIndex * 2000);
      });
    }
  }, 2000);
}

window.addEventListener('load', () => {
  extractTableData();
});
