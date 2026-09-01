// js/reports.js
let reportSharedData = null;
let reportPersonalData = null;

document.addEventListener('DOMContentLoaded', () => {
    const user = Utils.getCurrentUser();
    if (!user) return window.location.href = './index.html';
    Utils.initTheme();
    lucide.createIcons();
    document.getElementById('report-year').value = new Date().getFullYear();
    document.getElementById('report-month').value = new Date().getMonth();
});

async function generateReport() {
    const month = document.getElementById('report-month').value;
    const year = document.getElementById('report-year').value;
    
    try {
        reportSharedData = await API.getDashboard(month, year);
        const userId = Utils.getCurrentUser();
        reportPersonalData = await API.fetch(`getPersonalExpenses&userId=${userId}&month=${month}&year=${year}`);
        
        renderReport();
        document.getElementById('report-output').style.display = 'block';
        Utils.showToast("Report generated");
    } catch (err) {
        Utils.showToast("Failed to generate report", "error");
    }
}

function renderReport() {
    const s = reportSharedData;
    document.getElementById('shared-summary-cards').innerHTML = `
        <div class="card"><div class="card-title">Total Shared</div><div class="card-value">${Utils.formatCurrency(s.totalShared)}</div></div>
        <div class="card"><div class="card-title">Person 1 Paid</div><div class="card-value">${Utils.formatCurrency(s.user1Paid)}</div></div>
        <div class="card"><div class="card-title">Person 2 Paid</div><div class="card-value">${Utils.formatCurrency(s.user2Paid)}</div></div>
        <div class="card"><div class="card-title">Owed To</div><div class="card-value">${s.owedTo ? CONFIG.USERS[s.owedTo].name : 'None'}</div></div>
    `;

    const pTotal = reportPersonalData.reduce((sum, e) => sum + e.amount, 0);
    document.getElementById('personal-summary-cards').innerHTML = `
        <div class="card"><div class="card-title">My Total Personal</div><div class="card-value">${Utils.formatCurrency(pTotal)}</div></div>
        <div class="card"><div class="card-title">Transactions</div><div class="card-value">${reportPersonalData.length}</div></div>
    `;
}

function exportCSV(type) {
    let csvContent = "data:text/csv;charset=utf-8,";
    let data = type === 'shared' ? reportSharedData.expenses : reportPersonalData;
    
    if (!data || data.length === 0) {
        Utils.showToast("No data to export", "warning");
        return;
    }

    const headers = Object.keys(data[0]).join(",");
    const rows = data.map(row => Object.values(row).join(","));
    
    csvContent += headers + "\n" + rows.join("\n");
    
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `flatsplit_${type}_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }
function logout() { localStorage.removeItem('flatsplit_user'); window.location.href = './index.html'; }
