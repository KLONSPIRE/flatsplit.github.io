// Dashboard Logic & State Management

let currentDate = new Date();
let currentMonth = currentDate.getMonth();
let currentYear = currentDate.getFullYear();
let categoryChartInstance = null;

document.addEventListener('DOMContentLoaded', () => {
    // Auth Check
    const user = Utils.getCurrentUser();
    if (!user) {
        window.location.href = './index.html';
        return;
    }

    // Initialize Theme
    Utils.initTheme();
    
    // Setup UI
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
    
    // Default to current user, but allow selecting roommate
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
        
        // Cache data
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
    const balanceOwed = data.owedTo === user ? data.balance : 0;
    const balanceOwe = data.owedTo !== user && data.balance > 0 ? -data.balance : 0;
    const settlement = balanceOwed > 0 ? balanceOwed : balanceOwe;

    document.getElementById('stat-total').innerText = Utils.formatCurrency(data.totalShared);
    document.getElementById('stat-i-paid').innerText = Utils.formatCurrency(myPaid);
    document.getElementById('stat-fair').innerText = Utils.formatCurrency(data.fairShare);
    
    const settleEl = document.getElementById('stat-settle');
    settleEl.innerText = `${settlement > 0 ? '+' : ''}${Utils.formatCurrency(settlement)}`;
    settleEl.style.color = settlement > 0 ? 'var(--success)' : settlement < 0 ? 'var(--danger)' : 'var(--text-primary)';
}

function renderSplitView(data) {
    document.getElementById('split-section').classList.remove('hidden');
    
    // User 1
    document.getElementById('split-p1-name').innerText = CONFIG.USERS.user1.name;
    document.getElementById('split-p1-paid').innerText = Utils.formatCurrency(data.user1Paid);
    document.getElementById('split-p1-fair').innerText = Utils.formatCurrency(data.fairShare);
    
    const p1Balance = data.user1Paid - data.fairShare;
    const p1Status = document.getElementById('split-p1-status');
    const p1Div = document.getElementById('split-p1');
    
    p1Div.className = 'split-person ' + (p1Balance > 0 ? 'positive' : p1Balance < 0 ? 'negative' : '');
    p1Status.innerHTML = p1Balance > 0 ? 
        `<span class="text-green">+${Utils.formatCurrency(p1Balance)}</span> Excess Paid` : 
        p1Balance < 0 ? 
        `<span class="text-red">${Utils.formatCurrency(p1Balance)}</span> Less Paid` : 
        `Settled`;

    // User 2
    document.getElementById('split-p2-name').innerText = CONFIG.USERS.user2.name;
    document.getElementById('split-p2-paid').innerText = Utils.formatCurrency(data.user2Paid);
    document.getElementById('split-p2-fair').innerText = Utils.formatCurrency(data.fairShare);
    
    const p2Balance = data.user2Paid - data.fairShare;
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

    // Aggregate by category
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
            plugins: {
                legend: { position: 'bottom' }
            }
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

    // Sort by date descending (assume array comes back sorted, but good to ensure)
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
    btn.disabled = true;
    btn.innerText = 'Saving...';
    
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
        loadDashboard(); // Refresh
    } catch (err) {
        Utils.showToast(err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerText = 'Add Expense';
    }
}

async function handleAddPersonal(e) {
    e.preventDefault();
    const form = e.target;
    const payload = {
        user_id: Utils.getCurrentUser(), // Enforce privacy
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
    // We need to know the current balance to populate the modal text
    // Fetching it again briefly or reading from DOM state. 
    // Reading from DOM is faster for UX:
    const statSettle = document.getElementById('stat-settle').innerText;
    const amount = parseFloat(statSettle.replace(/[^0-9.-]+/g, ''));
    
    if (amount === 0) {
        Utils.showToast('Balance is already settled!', 'warning');
        return;
    }

    const user = Utils.getCurrentUser();
    const otherUser = user === 'user1' ? 'user2' : 'user1';
    
    if (amount < 0) {
        // Current user owes
        document.getElementById('settle-text').innerText = `You will pay ${CONFIG.USERS[otherUser].name}`;
        document.getElementById('settle-amount').innerText = Utils.formatCurrency(Math.abs(amount));
        document.getElementById('settle-amount').style.color = 'var(--danger)';
        
        // Store data for confirmation
        window._pendingSettlement = { from: user, to: otherUser, amount: Math.abs(amount) };
    } else {
        // Current user is owed
        document.getElementById('settle-text').innerText = `${CONFIG.USERS[otherUser].name} will pay you`;
        document.getElementById('settle-amount').innerText = Utils.formatCurrency(amount);
        document.getElementById('settle-amount').style.color = 'var(--success)';
        
        // Logically, the other person pays me
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
        loadDashboard(); // Refresh balances
    } catch (err) {
        Utils.showToast(err.message, 'error');
    }
}

// --- UI Helpers ---

function openModal(id) {
    document.getElementById(id).classList.add('active');
}
function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}
function showLoading(show) {
    document.getElementById('loading-skeleton').style.display = show ? 'grid' : 'none';
    document.getElementById('stats-grid').style.display = show ? 'none' : 'grid';
}
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}
function logout() {
    localStorage.removeItem('flatsplit_user');
    window.location.href = './index.html';
}

// Close modals on overlay click
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('active');
    }
});
