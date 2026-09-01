// js/settings.js

document.addEventListener('DOMContentLoaded', () => {
    const user = Utils.getCurrentUser();
    if (!user) return window.location.href = './index.html';
    Utils.initTheme();
    lucide.createIcons();
    loadSettings();
    testConnection();
});

function loadSettings() {
    // Note: Config.js values are static. We use localStorage to override them client-side.
    document.getElementById('set-flatname').value = localStorage.getItem('fs_flatname') || '';
    document.getElementById('set-currency').value = CONFIG.CURRENCY;
    document.getElementById('set-user1').value = CONFIG.USERS.user1.name;
    document.getElementById('set-user2').value = CONFIG.USERS.user2.name;
    document.getElementById('set-theme').value = localStorage.getItem('flatsplit_theme') || 'light';
}

function handleThemeChange(theme) {
    Utils.setTheme(theme);
}

async function testConnection() {
    const statusEl = document.getElementById('sync-status');
    statusEl.innerText = "Testing...";
    statusEl.style.color = "var(--warning)";
    
    try {
        // Try a lightweight call
        await API.fetch('getSettlements');
        statusEl.innerText = "Connected & Synced";
        statusEl.style.color = "var(--success)";
    } catch (err) {
        statusEl.innerText = "Connection Failed";
        statusEl.style.color = "var(--danger)";
    }
}

function saveSettings() {
    const flatname = document.getElementById('set-flatname').value;
    const currency = document.getElementById('set-currency').value;
    const user1 = document.getElementById('set-user1').value;
    const user2 = document.getElementById('set-user2').value;

    if (!user1 || !user2) {
        Utils.showToast("User names cannot be empty", "error");
        return;
    }

    // Save to local storage to persist UI changes
    localStorage.setItem('fs_flatname', flatname);
    localStorage.setItem('fs_currency', currency);
    localStorage.setItem('fs_user1', user1);
    localStorage.setItem('fs_user2', user2);
    
    // Update runtime config
    CONFIG.CURRENCY = currency;
    CONFIG.USERS.user1.name = user1;
    CONFIG.USERS.user2.name = user2;

    Utils.showToast("Settings saved locally");
}

function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }
function logout() { localStorage.removeItem('flatsplit_user'); window.location.href = './index.html'; }
