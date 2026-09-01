// js/dashboard.js

let currentDate = new Date();
let currentMonth = currentDate.getMonth();
let currentYear = currentDate.getFullYear();
let categoryChartInstance = null;

document.addEventListener('DOMContentLoaded', () => {
    const user = Utils.getCurrentUser();
    if (!user) {
        window.location.href = './index.html';
        return;
    }

    Utils.initTheme();
    lucide.createIcons();
    setupGreeting(user);
    setupPaidByDropdown(user);
    setDefaultDates();
    updateMonthDisplay();
    loadDashboard();
});

function setupGreeting(userId) {
    const name = CONFIG.USERS[userId].name;
    document.getElementById('user-greeting').innerText = name;
}

function setupPaidByDropdown(userId) {
    const select = document.getElementById('paid-by-select');
    const otherUser = userId === 'user1' ? 'user2' : 'user1';
    
    select.innerHTML = `
        <option value="${userId}">${CONFIG.USERS[userId].name} (You)</option>
        <option value="${otherUser}">${CONFIG.USERS[otherUser].name}</option>
    `;
}

function setDefaultDates() {
    const today = new Date().toISOString().split('T')[0];
    document.querySelector('#shared-form input[name="date"]').value = today;
    document.querySelector('#personal-form input[name="date"]').value = today;
}

function changeMonth(delta) {
    currentMonth += delta;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    updateMonthDisplay();
    loadDashboard();
}

function updateMonthDisplay() {
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    document.getElementById('month-display').innerText = `${monthNames[currentMonth]} ${currentYear}`;
}

async function loadDashboard() {
    showLoading(true);
    
    try {
        const data = await API.getDashboard(currentMonth, currentYear);
        Utils.cacheData(`dashboard_${currentMonth}_${currentYear}`, data);
        
        renderStats(data);
        renderSplitView(data);
        renderChart(data.expenses);
        renderRecentActivity(data.expenses);
        
    } catch (error) {
        console.error("Failed to load dashboard", error);
    } finally {
        showLoading(false);
    }
}

function renderStats(data) {
    const user = Utils.getCurrentUser();
    const myPaid = user === 'user1' ? data.user1Paid : data.user2Paid;
    
    // Trust the backend's final calculated balance (which includes settlements)
    let mySettlement = 0;
    if (data.owedTo === user) {
        mySettlement = data.balance; // I am owed money
    } else if (data.owedTo && data.owedTo !== user) {
        mySettlement = -data.balance; // I owe money
    }

    document.getElementById('stat-total').innerText = Utils.formatCurrency(data.totalShared);
    document.getElementById('stat-i-paid').innerText = Utils.formatCurrency(myPaid);
    
    // Show user their specific fair share
    const myShare = user === 'user1' ? data.user1Share : data.user2Share;
    document.getElementById('stat-fair').innerText = Utils.formatCurrency(myShare);
    
    const settleEl = document.getElementById('stat-settle');
    settleEl.innerText = `${mySettlement > 0 ? '+' : ''}${Utils.formatCurrency(mySettlement)}`;
    settleEl.style.color = mySettlement > 0 ? 'var(--success)' : mySettlement < 0 ? 'var(--danger)' : 'var(--text-primary)';
}

function renderSplitView(data) {
    document.getElementById('split-section').classList.remove('hidden');
    
    // User 1 Display
    document.getElementById('split-p1-name').innerText = CONFIG.USERS.user1.name;
    document.getElementById('split-p1-paid').innerText = Utils.formatCurrency(data.user1Paid);
    document.getElementById('split-p1-fair').innerText = Utils.formatCurrency(data.user1Share);
    
    // User 2 Display
    document.getElementById('split-p2-name').innerText = CONFIG.USERS.user2.name;
    document.getElementById('split-p2-paid').innerText = Utils.formatCurrency(data.user2Paid);
    document.getElementById('split-p2-fair').innerText = Utils.formatCurrency(data.user2Share);

    // Use backend balance logic (factoring in settlements) instead of raw math
    let p1Balance = 0;
    let p2Balance = 0;

    if (data.owedTo === 'user1') {
        p1Balance = data.balance;
        p2Balance = -data.balance;
    } else if (data.owedTo === 'user2') {
        p1Balance = -data.balance;
        p2Balance = data.balance;
    }

    // Render User 1 Status
    const p1Status = document.getElementById('split-p1-status');
    const p1Div = document.getElementById('split-p1');
    p1Div.className = 'split-person ' + (p1Balance > 0 ? 'positive' : p1Balance < 0 ? 'negative' : '');
    p1Status.innerHTML = p1Balance > 0 ? 
        `<span class="text-green">+${Utils.formatCurrency(p1Balance)}</span> Excess Paid` : 
        p1Balance < 0 ? 
        `<span class="text-red">${Utils.formatCurrency(p1Balance)}</span> Less Paid` : 
        `Settled`;

    // Render User 2 Status
    const p2Status = document.getElementById('split-p2-status');
    const p2Div = document.getElementById('split-p2');
    p2Div.className = 'split-person ' + (p2Balance > 0 ? 'positive' : p2Balance < 0 ? 'negative' : '');
    p2Status.innerHTML = p2Balance > 0 ? 
        `<span class="text-green">+${Utils.formatCurrency(p2Balance)}</span> Excess Paid` : 
        p2Balance < 0 ? 
        `<span class="text-red">${Utils.formatCurrency(p2Balance)}</span> Less Paid` : 
        `Settled`;
}

function renderChart(expenses) {
    const canvas = document.getElementById('categoryChart');
    const emptyMsg = document.getElementById('chart-empty');
    
    if (expenses.length === 0) {
        canvas.style.display = 'none';
        emptyMsg.style.display = 'block';
        return;
    }
    
    canvas.style.display = 'block';
    emptyMsg.style.display = 'none';

    const catData = {};
    expenses.forEach(e => {
        catData[e.category] = (catData[e.category] || 0) + e.amount;
    });

    if (categoryChartInstance) categoryChartInstance.destroy();

    categoryChartInstance = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: Object.keys(catData),
            datasets: [{
                data: Object.values(catData),
                backgroundColor: ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { position: 'bottom' } }
        }
    });
}

function renderRecentActivity(expenses) {
    const container = document.getElementById('recent-activity');
    const user = Utils.getCurrentUser();
    
    if (expenses.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding:40px; color:var(--text-secondary);">🧾 No expenses yet</div>`;
        return;
    }

    const sorted = [...expenses].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

    container.innerHTML = sorted.map(e => `
        <div style="display:flex; justify-content:space-between; padding:12px 0; border-bottom:1px solid var(--border-color);">
            <div>
                <div style="font-weight:500;">${e.description}</div>
                <div style="font-size:12px; color:var(--text-secondary);">${e.paid_by === user ? 'You' : CONFIG.USERS[e.paid_by].name} • ${new Date(e.date).toLocaleDateString()}</div>
            </div>
            <div style="font-weight:600;">${Utils.formatCurrency(e.amount)}</div>
        </div>
    `).join('');
}

// --- Form Handlers ---

function toggleCustomSplit() {
    const type = document.querySelector('input[name="split_type"]:checked').value;
    document.getElementById('custom-split-fields').style.display = type === 'custom' ? 'grid' : 'none';
}

async function handleAddShared(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-submit-shared');
    btn.disabled = true; btn.innerText = 'Saving...';
    
    const form = e.target;
    const payload = {
        description: form.description.value,
        amount: parseFloat(form.amount.value),
        category: form.category.value,
        paid_by: form.paid_by.value,
        split_type: form.split_type.value,
        date: form.date.value
    };

    if (payload.split_type === 'custom') {
        payload.person1_share = parseFloat(form.person1_share.value);
        payload.person2_share = parseFloat(form.person2_share.value);
    }

    try {
        await API.addSharedExpense(payload);
        Utils.showToast('Shared expense added successfully');
        closeModal('shared-modal');
        form.reset();
        setDefaultDates();
        loadDashboard(); 
    } catch (err) {
        Utils.showToast(err.message, 'error');
    } finally {
        btn.disabled = false; btn.innerText = 'Add Expense';
    }
}

async function handleAddPersonal(e) {
    e.preventDefault();
    const form = e.target;
    const payload = {
        user_id: Utils.getCurrentUser(), 
        description: form.description.value,
        amount: parseFloat(form.amount.value),
        category: form.category.value,
        date: form.date.value
    };

    try {
        await API.addPersonalExpense(payload);
        Utils.showToast('Personal expense added');
        closeModal('personal-modal');
        form.reset();
        setDefaultDates();
    } catch (err) {
        Utils.showToast(err.message, 'error');
    }
}

// --- Settlement ---

function openSettleModal() {
    // Read the exact text from the stat card we just calculated
    const statSettle = document.getElementById('stat-settle').innerText;
    const amount = parseFloat(statSettle.replace(/[^0-9.-]+/g, ''));
    
    if (amount === 0) {
        Utils.showToast('Balance is already settled!', 'warning');
        return;
    }

    const user = Utils.getCurrentUser();
    const otherUser = user === 'user1' ? 'user2' : 'user1';
    
    if (amount < 0) {
        document.getElementById('settle-text').innerText = `You will pay ${CONFIG.USERS[otherUser].name}`;
        document.getElementById('settle-amount').innerText = Utils.formatCurrency(Math.abs(amount));
        document.getElementById('settle-amount').style.color = 'var(--danger)';
        window._pendingSettlement = { from: user, to: otherUser, amount: Math.abs(amount) };
    } else {
        document.getElementById('settle-text').innerText = `${CONFIG.USERS[otherUser].name} will pay you`;
        document.getElementById('settle-amount').innerText = Utils.formatCurrency(amount);
        document.getElementById('settle-amount').style.color = 'var(--success)';
        window._pendingSettlement = { from: otherUser, to: user, amount: amount };
    }

    openModal('settle-modal');
}

async function confirmSettlement() {
    if (!window._pendingSettlement) return;
    
    try {
        await API.addSettlement({
            ...window._pendingSettlement,
            date: new Date().toISOString().split('T')[0]
        });
        Utils.showToast('Settlement recorded!');
        closeModal('settle-modal');
        loadDashboard(); 
    } catch (err) {
        Utils.showToast(err.message, 'error');
    }
}

// --- UI Helpers ---

function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }
function showLoading(show) {
    document.getElementById('loading-skeleton').style.display = show ? 'grid' : 'none';
    document.getElementById('stats-grid').style.display = show ? 'none' : 'grid';
}
function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }
function logout() { localStorage.removeItem('flatsplit_user'); window.location.href = './index.html'; }

window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('active');
    }
});
