// js/recurring.js
// Note: For true recurring automation, a time-driven trigger in Apps Script is required. 
// This UI manages the list and adding to local storage / API.

document.addEventListener('DOMContentLoaded', () => {
    const user = Utils.getCurrentUser();
    if (!user) return window.location.href = './index.html';
    Utils.initTheme();
    lucide.createIcons();
    
    const otherUser = user === 'user1' ? 'user2' : 'user1';
    document.getElementById('paid-by-select').innerHTML = `
        <option value="${user}">${CONFIG.USERS[user].name} (You)</option>
        <option value="${otherUser}">${CONFIG.USERS[otherUser].name}</option>
    `;
    
    renderRecurring();
});

function renderRecurring() {
    // Fetching from API requires 'getRecurringExpenses' action in Code.gs
    // Using localStorage fallback for UI demonstration
    let recurring = JSON.parse(localStorage.getItem('flatsplit_recurring') || '[]');
    const container = document.getElementById('recurring-list');
    
    if (recurring.length === 0) {
        container.innerHTML = `<div class="empty-state-container"><div class="empty-state-icon">🔄</div><div class="empty-state-title">No recurring expenses</div><p>Add rent, Wi-Fi, or subscriptions.</p></div>`;
        return;
    }

    container.innerHTML = recurring.map((r, i) => `
        <div class="card" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <div>
                <h3 style="margin-bottom: 4px;">${r.description}</h3>
                <div style="color: var(--text-secondary); font-size: 14px;">${r.frequency} • Paid by ${CONFIG.USERS[r.paid_by]?.name || r.paid_by}</div>
            </div>
            <div style="text-align: right;">
                <div style="font-weight: 700; font-size: 18px;">${Utils.formatCurrency(r.amount)}</div>
                <button class="btn btn-sm btn-outline" style="color:var(--danger); border-color:var(--danger); margin-top: 8px;" onclick="deleteRecurring(${i})">Delete</button>
            </div>
        </div>
    `).join('');
}

function handleAddRecurring(e) {
    e.preventDefault();
    let recurring = JSON.parse(localStorage.getItem('flatsplit_recurring') || '[]');
    
    recurring.push({
        id: `REC-${Date.now()}`,
        description: e.target.description.value,
        amount: parseFloat(e.target.amount.value),
        frequency: e.target.frequency.value,
        paid_by: e.target.paid_by.value
    });

    localStorage.setItem('flatsplit_recurring', JSON.stringify(recurring));
    Utils.showToast("Recurring expense added");
    closeModal('recurring-modal');
    e.target.reset();
    renderRecurring();
}

function deleteRecurring(index) {
    if(!confirm("Delete this recurring expense?")) return;
    let recurring = JSON.parse(localStorage.getItem('flatsplit_recurring') || '[]');
    recurring.splice(index, 1);
    localStorage.setItem('flatsplit_recurring', JSON.stringify(recurring));
    renderRecurring();
}

function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }
function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }
function logout() { localStorage.removeItem('flatsplit_user'); window.location.href = './index.html'; }
