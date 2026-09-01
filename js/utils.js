// Utilities: Toasts, Formatters, Local Storage

const Utils = {
    formatCurrency(amount) {
        return `${CONFIG.CURRENCY}${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
    },

    showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <span>${type === 'success' ? '✓' : type === 'error' ? '✕' : '⚠'}</span>
            <span>${message}</span>
        `;
        container.appendChild(toast);
        
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    getCurrentUser() {
        return localStorage.getItem('flatsplit_user') || null;
    },

    setCurrentUser(userId) {
        localStorage.setItem('flatsplit_user', userId);
    },

    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('flatsplit_theme', theme);
    },

    initTheme() {
        const saved = localStorage.getItem('flatsplit_theme') || 'light';
        this.setTheme(saved);
    },

    // Simple caching for offline resilience
    cacheData(key, data) {
        localStorage.setItem(`cache_${key}`, JSON.stringify({ data, timestamp: Date.now() }));
    },

    getCachedData(key) {
        const cached = localStorage.getItem(`cache_${key}`);
        if (cached) {
            return JSON.parse(cached).data;
        }
        return null;
    }
};
