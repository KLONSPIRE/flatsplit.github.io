document.addEventListener('DOMContentLoaded', () => {
    const user = Utils.getCurrentUser();
    if (!user) return window.location.href = './index.html';
    
    Utils.initTheme();
    lucide.createIcons();
    document.querySelector('#personal-form input[name="date"]').value = new Date().toISOString().split('T')[0];
    loadPersonalExpenses();
});

async function loadPersonalExpenses() {
    const userId = Utils.getCurrentUser();
    const month = new Date().getMonth();
    const year = new Date().getFullYear();
    
    try {
        const expenses = await API.fetch(`getPersonalExpenses&userId=${userId}&month=${month}&year=${year}`);
        
        const total = expenses.reduce((sum, e) => sum + e.amount, 0);
        document.getElementById('stat-total-personal').innerText = Utils.formatCurrency(total);
        document.getElementById('stat-count-personal').innerText = expenses.length;

        const tbody = document.getElementById('personal-tbody');
        const emptyState = document.getElementById('empty-state');
        
        if (expenses.length === 0) {
            tbody.innerHTML = '';
            emptyState.style.display = 'flex';
            return;
        }
        emptyState.style.display = 'none';

        tbody.innerHTML = [...expenses].sort((a,b) => new Date(b.date) - new Date(a.date)).map(e => `
            <tr style="border-bottom: 1px solid var(--border-color);">
                <td data-label="Date" style="padding: 16px;">${new Date(e.date).toLocaleDateString()}</td>
                <td data-label="Description" style="padding: 16px; font-weight: 500;">${e.description}</td>
                <td data-label="Category" style="padding: 16px;">${e.category}</td>
                <td data-label="Amount" style="padding: 16px; font-weight: 600;">${Utils.formatCurrency(e.amount)}</td>
            </tr>
        `).join('');
    } catch (err) {
        Utils.showToast("Failed to load personal expenses", "error");
    }
}

async function handleAddPersonal(e) {
    e.preventDefault();
    const payload = {
        user_id: Utils.getCurrentUser(), // Enforce privacy
        description: e.target.description.value,
        amount: parseFloat(e.target.amount.value),
        category: e.target.category.value,
        date: e.target.date.value
    };
    try {
        await API.addPersonalExpense(payload);
        Utils.showToast('Personal expense added');
        closeModal('personal-modal');
        e.target.reset();
        loadPersonalExpenses();
    } catch (err) {
        Utils.showToast(err.message, 'error');
    }
}

function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }
function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }
function logout() { localStorage.removeItem('flatsplit_user'); window.location.href = './index.html'; }
