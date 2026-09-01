let currentBalanceData = null;

document.addEventListener('DOMContentLoaded', () => {
    const user = Utils.getCurrentUser();
    if (!user) return window.location.href = './index.html';
    Utils.initTheme();
    lucide.createIcons();
    loadBalance();
    loadSettlements();
});

async function loadBalance() {
    const month = new Date().getMonth();
    const year = new Date().getFullYear();
    try {
        currentBalanceData = await API.getDashboard(month, year);
        renderBalance(currentBalanceData);
    } catch (err) {
        Utils.showToast("Failed to load balance", "error");
    }
}

function renderBalance(data) {
    const user = Utils.getCurrentUser();
    const otherUser = user === 'user1' ? 'user2' : 'user1';
    const myPaid = data[user === 'user1' ? 'user1Paid' : 'user2Paid'];
    const myBalance = myPaid - data.fairShare;

    // Central Display
    const balText = document.getElementById('balance-text');
    const balAmount = document.getElementById('balance-amount');

    if (myBalance < 0) {
        balText.innerText = `You owe ${CONFIG.USERS[otherUser].name}`;
        balAmount.innerText = Utils.formatCurrency(Math.abs(myBalance));
        balAmount.style.color = 'var(--danger)';
        window._pendingSettlement = { from: user, to: otherUser, amount: Math.abs(myBalance) };
    } else if (myBalance > 0) {
        balText.innerText = `${CONFIG.USERS[otherUser].name} owes you`;
        balAmount.innerText = Utils.formatCurrency(myBalance);
        balAmount.style.color = 'var(--success)';
        window._pendingSettlement = { from: otherUser, to: user, amount: myBalance };
    } else {
        balText.innerText = "All settled up!";
        balAmount.innerText = "₹0.00";
        balAmount.style.color = 'var(--text-secondary)';
        document.querySelector('.card [onclick="openSettleModal()"]').style.display = 'none';
    }

    // Breakdown
    document.getElementById('det-p1-name').innerText = CONFIG.USERS.user1.name;
    document.getElementById('det-p2-name').innerText = CONFIG.USERS.user2.name;
    document.getElementById('det-p1-paid').innerText = Utils.formatCurrency(data.user1Paid);
    document.getElementById('det-p1-share').innerText = Utils.formatCurrency(data.fairShare);
    document.getElementById('det-p2-paid').innerText = Utils.formatCurrency(data.user2Paid);
    document.getElementById('det-p2-share').innerText = Utils.formatCurrency(data.fairShare);

    const p1Bal = data.user1Paid - data.fairShare;
    const p2Bal = data.user2Paid - data.fairShare;
    
    const detP1Bal = document.getElementById('det-p1-bal');
    detP1Bal.innerText = `${p1Bal > 0 ? '+' : ''}${Utils.formatCurrency(p1Bal)}`;
    detP1Bal.style.color = p1Bal > 0 ? 'var(--success)' : p1Bal < 0 ? 'var(--danger)' : 'inherit';

    const detP2Bal = document.getElementById('det-p2-bal');
    detP2Bal.innerText = `${p2Bal > 0 ? '+' : ''}${Utils.formatCurrency(p2Bal)}`;
    detP2Bal.style.color = p2Bal > 0 ? 'var(--success)' : p2Bal < 0 ? 'var(--danger)' : 'inherit';
}

async function loadSettlements() {
    try {
        const settlements = await API.fetch('getSettlements');
        const container = document.getElementById('settlement-history');
        if (settlements.length === 0) return;

        container.innerHTML = settlements.map(s => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px 0; border-bottom: 1px solid var(--border-color);">
                <div>
                    <div style="font-weight: 600;">${CONFIG.USERS[s.from_user]?.name || s.from_user} → ${CONFIG.USERS[s.to_user]?.name || s.to_user}</div>
                    <div style="font-size: 12px; color: var(--text-secondary);">${new Date(s.date).toLocaleDateString()}</div>
                </div>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <span style="font-weight: 700;">${Utils.formatCurrency(s.amount)}</span>
                    <span style="color: var(--success); font-weight: 600;">✓ Settled</span>
                </div>
            </div>
        `).join('');
    } catch (err) { console.error(err); }
}

function openSettleModal() {
    if (!window._pendingSettlement) return;
    document.getElementById('settle-text').innerText = `${CONFIG.USERS[window._pendingSettlement.from].name} will pay ${CONFIG.USERS[window._pendingSettlement.to].name}`;
    document.getElementById('settle-amount').innerText = Utils.formatCurrency(window._pendingSettlement.amount);
    openModal('settle-modal');
}

async function confirmSettlement() {
    try {
        await API.addSettlement({ ...window._pendingSettlement, date: new Date().toISOString().split('T')[0] });
        Utils.showToast('Settlement recorded!');
        closeModal('settle-modal');
        loadBalance();
        loadSettlements();
    } catch (err) {
        Utils.showToast(err.message, 'error');
    }
}

function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }
function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }
function logout() { localStorage.removeItem('flatsplit_user'); window.location.href = './index.html'; }
