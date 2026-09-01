let allExpenses = [];

document.addEventListener('DOMContentLoaded', () => {
    const user = Utils.getCurrentUser();
    if (!user) return window.location.href = './index.html';
    
    Utils.initTheme();
    lucide.createIcons();
    setupPaidByDropdown(user);
    document.querySelector('#shared-form input[name="date"]').value = new Date().toISOString().split('T')[0];
    loadExpenses();
});

function setupPaidByDropdown(userId) {
    const select = document.getElementById('paid-by-select');
    const otherUser = userId === 'user1' ? 'user2' : 'user1';
    select.innerHTML = `
        <option value="${userId}">${CONFIG.USERS[userId].name} (You)</option>
        <option value="${otherUser}">${CONFIG.USERS[otherUser].name}</option>
    `;
}

async function loadExpenses() {
    try {
        // Fetch current month and year (or all time for this page, adjusting query as needed)
        const month = new Date().getMonth();
        const year = new Date().getFullYear();
        allExpenses = await API.fetch(`getSharedExpenses&month=${month}&year=${year}`);
        renderTable(allExpenses);
    } catch (err) {
        Utils.showToast("Failed to load expenses", "error");
    }
}

function renderTable(expenses) {
    const tbody = document.getElementById('expenses-tbody');
    const emptyState = document.getElementById('empty-state');
    
    if (expenses.length === 0) {
        tbody.innerHTML = '';
        emptyState.style.display = 'flex';
        return;
    }
    
    emptyState.style.display = 'none';
    
    // Sort by date descending
    const sorted = [...expenses].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    tbody.innerHTML = sorted.map(e => `
        <tr style="border-bottom: 1px solid var(--border-color);">
            <td data-label="Date" style="padding: 16px;">${new Date(e.date).toLocaleDateString()}</td>
            <td data-label="Description" style="padding: 16px; font-weight: 500;">${e.description}</td>
            <td data-label="Category" style="padding: 16px;">${e.category}</td>
            <td data-label="Amount" style="padding: 16px; font-weight: 600;">${Utils.formatCurrency(e.amount)}</td>
            <td data-label="Paid By" style="padding: 16px; color: var(--text-secondary);">${CONFIG.USERS[e.paid_by]?.name || e.paid_by}</td>
            <td data-label="Actions" style="padding: 16px;">
                <button class="btn btn-sm btn-outline" style="color:var(--danger); border-color:var(--danger);" onclick="deleteExpense('${e.expense_id}')">Delete</button>
            </td>
        </tr>
    `).join('');
}

function filterExpenses() {
    const search = document.getElementById('search-input').value.toLowerCase();
    const cat = document.getElementById('filter-category').value;
    const person = document.getElementById('filter-person').value;

    const filtered = allExpenses.filter(e => {
        const matchSearch = e.description.toLowerCase().includes(search);
        const matchCat = !cat || e.category === cat;
        const matchPerson = !person || e.paid_by === person;
        return matchSearch && matchCat && matchPerson;
    });

    renderTable(filtered);
}

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
        Utils.showToast('Expense added');
        closeModal('shared-modal');
        form.reset();
        loadExpenses();
    } catch (err) {
        Utils.showToast(err.message, 'error');
    } finally {
        btn.disabled = false; btn.innerText = 'Add Expense';
    }
}

function deleteExpense(id) {
    if(confirm("Are you sure you want to delete this expense?")) {
        // Requires implementing deleteExpense in API.gs
        Utils.showToast("Delete API not implemented in backend yet", "warning");
    }
}

function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }
function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }
function logout() { localStorage.removeItem('flatsplit_user'); window.location.href = './index.html'; }
