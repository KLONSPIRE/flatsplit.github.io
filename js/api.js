// Core API Communication Layer

const API = {
    async fetch(action, payload = null) {
        const url = `${CONFIG.GOOGLE_APPS_SCRIPT_URL}?action=${action}`;
        const options = {
            method: payload ? 'POST' : 'GET',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // Required for Apps Script
            muteHttpExceptions: true // Prevents hard fails on 4xx/5xx
        };

        if (payload) {
            options.body = JSON.stringify({ action, payload });
        }

        try {
            const response = await fetch(url, options);
            const text = await response.text();
            const result = JSON.parse(text);
            
            if (result.success) {
                return result.data;
            } else {
                throw new Error(result.error || "Unknown API Error");
            }
        } catch (error) {
            console.error("API Error:", error);
            // Fallback to cache if offline
            const cachedData = Utils.getCachedData(action);
            if (cachedData) {
                Utils.showToast("You are offline. Showing cached data.", "warning");
                return cachedData;
            }
            Utils.showToast("Failed to connect to database.", "error");
            throw error;
        }
    },

    // Convenience methods
    getDashboard(month, year) {
        return this.fetch(`getDashboard&month=${month}&year=${year}`);
    },
    
    addSharedExpense(data) {
        return this.fetch('addSharedExpense', data);
    },

    addPersonalExpense(data) {
        return this.fetch('addPersonalExpense', data);
    },

    addSettlement(data) {
        return this.fetch('addSettlement', data);
    }
};
