// js/recurring.js

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
    
    // Set default next date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    document.querySelector('input[name="next_date"]').value = tomorrow.toISOString().split('T')[0];

    loadRecurring();
});

async function loadRecurring() {
    try {
        const recurring = await API.fetch('getRecurringExpenses');
        renderRecurring(recurring);
    } catch (err) {
        Utils.showToast("Failed to load recurring expenses", "error");
    }
}

function renderRecurring(recurring) {
    const container = document.getElementById('recurring-list');
    
    if (!recurring || recurring.length === 0) {
        container.innerHTML = `
            <div class="empty-state-container">
                <div class="empty-state-icon">🔄</div>
                <div class="empty-state-title">No recurring expenses</div>
                <p>Add rent, Wi-Fi, or subscriptions.</p>
            </div>`;
        return;
    }

    container.innerHTML = recurring.map(r => `
        <div class="card" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 16px;">
            <div style="flex: 1;">
                <h3 style="margin-bottom: 4px;">${r.description}</h3>
                <div style="color: var(--text-secondary); font-size: 14px;">
                    ${r.frequency} • Paid by ${CONFIG.USERS[r.paid_by]?.name || r.paid_by}
                </div>
                <div style="color: var(--primary); font-size: 13px; margin-top: 4px;">
                    Next: ${new Date(r.next_date).toLocaleDateString()}
                </div>
            </div>
            <div style="text-align: right; display: flex; align-items: center; gap: 16px;">
                <div style="font-weight: 700; font-size: 18px;">${Utils.formatCurrency(r.amount)}</div>
                <button class="btn btn-sm btn-outline" style="color:var(--danger); border-color:var(--danger);" onclick="deleteRecurring('${r.recurring_id}')">Delete</button>
            </div>
        </div>
    `).join('');
}

async function handleAddRecurring(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerText;
    btn.disabled = true; btn.innerText = "Saving...";

    const payload = {
        description: e.target.description.value,
        amount: parseFloat(e.target.amount.value),
        frequency: e.target.frequency.value,
        paid_by: e.target.paid_by.value,
        next_date: e.target.next_date.value,
        split_type: 'equal' // Defaulting to equal for recurring
    };

    try {
        await API.fetch('addRecurringExpense', payload);
        Utils.showToast("Recurring expense added");
        closeModal('recurring-modal');
        e.target.reset();
        loadRecurring();
    } catch (err) {
        Utils.showToast(err.message, "error");
    } finally {
        btn.disabled = false; btn.innerText = originalText;
    }
}

async function deleteRecurring(id) {
    if(!confirm("Delete this recurring expense?")) return;
    
    try {
        await API.fetch('deleteRecurringExpense', { id: id });
        Utils.showToast("Deleted");
        loadRecurring();
    } catch (err) {
        Utils.showToast(err.message, "error");
    }
}

function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }
function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }
function logout() { localStorage.removeItem('flatsplit_user'); window.location.href = './index.html'; }
