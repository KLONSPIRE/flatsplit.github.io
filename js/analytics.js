// js/analytics.js
let catChart, trendChart;

document.addEventListener('DOMContentLoaded', () => {
    const user = Utils.getCurrentUser();
    if (!user) return window.location.href = './index.html';
    Utils.initTheme();
    lucide.createIcons();
    loadAnalytics('shared');
});

async function loadAnalytics(type) {
    // Update Tab UI
    document.querySelectorAll('.btn-analytics-tab').forEach(btn => {
        btn.className = btn.textContent.trim().toLowerCase() === type ? 'btn btn-primary btn-analytics-tab' : 'btn btn-outline btn-analytics-tab';
    });

    const month = new Date().getMonth();
    const year = new Date().getFullYear();

    try {
        let data;
        if (type === 'shared') {
            data = await API.getDashboard(month, year);
            renderCharts(data.expenses);
        } else {
            const userId = Utils.getCurrentUser();
            data = await API.fetch(`getPersonalExpenses&userId=${userId}&month=${month}&year=${year}`);
            renderCharts(data);
        }
    } catch (err) {
        Utils.showToast("Failed to load analytics", "error");
    }
}

function renderCharts(expenses) {
    // Category Chart
    const catData = {};
    expenses.forEach(e => { catData[e.category] = (catData[e.category] || 0) + e.amount; });

    if (catChart) catChart.destroy();
    catChart = new Chart(document.getElementById('catChart'), {
        type: 'doughnut',
        data: {
            labels: Object.keys(catData),
            datasets: [{ data: Object.values(catData), backgroundColor: ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'], borderWidth: 0 }]
        },
        options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
    });

    // Trend Chart (Mock monthly trend for current year based on single month data for demo)
    // In a real app, you'd fetch all year data and group by month.
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const currentMonth = new Date().getMonth();
    const mockTrend = new Array(12).fill(0);
    const totalThisMonth = expenses.reduce((sum, e) => sum + e.amount, 0);
    mockTrend[currentMonth] = totalThisMonth; // Just showing current month for accuracy

    if (trendChart) trendChart.destroy();
    trendChart = new Chart(document.getElementById('trendChart'), {
        type: 'bar',
        data: {
            labels: months,
            datasets: [{ label: 'Spending', data: mockTrend, backgroundColor: '#4F46E5', borderRadius: 4 }]
        },
        options: { responsive: true, scales: { y: { beginAtZero: true } } }
    });
}

function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }
function logout() { localStorage.removeItem('flatsplit_user'); window.location.href = './index.html'; }
