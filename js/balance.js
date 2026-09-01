// js/balance.js
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
    
    // Use the exact shares calculated by the backend (handles 50/50 and custom splits)
    const myPaid = data[user === 'user1' ? 'user1Paid' : 'user2Paid'];
    const myShare = data[user === 'user1' ? 'user1Share' : 'user2Share'];
    const myBalance = myPaid - myShare;

    // Central Display Logic
    const balText = document.getElementById('balance-text');
    const balAmount = document.getElementById('balance-amount');
    const settleBtn = document.getElementById('settle-btn');

    if (myBalance < 0) {
        balText.innerText = `You owe ${CONFIG.USERS[otherUser].name}`;
        balAmount.innerText = Utils.formatCurrency(Math.abs(myBalance));
        balAmount.style.color = 'var(--danger)';
        settleBtn.style.display = 'inline-flex'; // Show button
        window._pendingSettlement = { from: user, to: otherUser, amount: Math.abs(myBalance) };
    } else if (myBalance > 0) {
        balText.innerText = `${CONFIG.USERS[otherUser].name} owes you`;
        balAmount.innerText = Utils.formatCurrency(myBalance);
        balAmount.style.color = 'var(--success)';
        settleBtn.style.display = 'inline-flex'; // Show button
        window._pendingSettlement = { from: otherUser, to: user, amount: myBalance };
    } else {
        balText.innerText = "All settled up!";
        balAmount.innerText = Utils.formatCurrency(0);
        balAmount.style.color = 'var(--text-secondary)';
        settleBtn.style.display = 'none'; // Hide button if 0
        window._pendingSettlement = null;
    }

    // Detailed Breakdown Cards
    document.getElementById('det-p1-name').innerText = CONFIG.USERS.user1.name;
    document.getElementById('det-p2-name').innerText = CONFIG.USERS.user2.name;
    
    document.getElementById('det-p1-paid').innerText = Utils.formatCurrency(data.user1Paid);
    document.getElementById('det-p2-paid').innerText = Utils.formatCurrency(data.user2Paid);
    
    // Show exact share instead of generic "fair share"
    document.getElementById('det-p1-share').innerText = Utils.formatCurrency(data.user1Share);
    document.getElementById('det-p2-share').innerText = Utils.formatCurrency(data.user2Share);

    // Calculate and display raw balances (Green/Red)
    const p1Balance = data.user1Paid - data.user1Share;
    const p2Balance = data.user2Paid - data.user2Share;
    
    const detP1Bal = document.getElementById('det-p1-bal');
    detP1Bal.innerText = `${p1Balance > 0 ? '+' : ''}${Utils.formatCurrency(p1Balance)}`;
    detP1Bal.style.color = p1Balance > 0 ? 'var(--success)' : p1Balance < 0 ? 'var(--danger)' : 'inherit';

    const detP2Bal = document.getElementById('det-p2-bal');
    detP2Bal.innerText = `${p2Balance > 0 ? '+' : ''}${Utils.formatCurrency(p2Balance)}`;
    detP2Bal.style.color = p2Balance > 0 ? 'var(--success)' : p2Balance < 0 ? 'var(--danger)' : 'inherit';
}

async function loadSettlements() {
    try {
        const settlements = await API.fetch('getSettlements');
        const container = document.getElementById('settlement-history');
        
        if (!settlements || settlements.length === 0) {
            container.innerHTML = `<div style="text-align:center; color:var(--text-secondary); padding: 24px;">No settlements yet.</div>`;
            return;
        }

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
    } catch (err) {
        console.error("Failed to load settlements", err);
    }
}

function openSettleModal() {
    if (!window._pendingSettlement) return;
    
    document.getElementById('settle-text').innerText = `${CONFIG.USERS[window._pendingSettlement.from].name} will pay ${CONFIG.USERS[window._pendingSettlement.to].name}`;
    document.getElementById('settle-amount').innerText = Utils.formatCurrency(window._pendingSettlement.amount);
    
    openModal('settle-modal');
}

async function confirmSettlement() {
    if (!window._pendingSettlement) return;
    
    try {
        await API.addSettlement({ 
            ...window._pendingSettlement, 
            date: new Date().toISOString().split('T')[0] 
        });
        
        Utils.showToast('Settlement recorded successfully!');
        closeModal('settle-modal');
        
        // Refresh data to show new balance
        loadBalance();
        loadSettlements();
    } catch (err) {
        Utils.showToast(err.message || "Failed to record settlement", "error");
    }
}

// --- UI Helpers ---
function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }
function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }
function logout() { localStorage.removeItem('flatsplit_user'); window.location.href = './index.html'; }

// Close modal on overlay click
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('active');
    }
});
