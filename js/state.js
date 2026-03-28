const STORAGE_KEY = 'personal_finance_dashboard_state';
const SAVINGS_GOAL_RATIO = 30;

function getDefaultState() {
    return {
        income: 0, budget: 0, expenseEntries: [], transactions: [],
        netWorthHistory: [], goals: [], categoryBudgets: {},
        theme: 'light', lastReset: null, recurring: [], investments: [], subscriptions: []
    };
}

let state = getDefaultState();

function loadState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) state = { ...getDefaultState(), ...JSON.parse(raw) };
    } catch (error) {
        console.error("State load failed", error);
        state = getDefaultState();
    }
}

function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function setInlineError(elementId, message) {
    const el = document.getElementById(elementId);
    if (el) el.textContent = message || '';
}

function getTotalExpense() {
    return state.transactions.filter(t => t.type === 'expense').reduce((sum, item) => sum + Number(item.amount || 0), 0);
}

function getCalculatedIncome() {
    return state.transactions.filter(t => t.type === 'income').reduce((sum, item) => sum + Number(item.amount || 0), 0);
}

function getTransactions() {
    return state.transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function getExpensesByCategory() {
    return state.transactions.filter(t => t.type === 'expense').reduce((map, item) => {
        map[item.category] = (map[item.category] || 0) + Number(item.amount || 0);
        return map;
    }, {});
}

function detectSpendingAnomalies() {
    const expenses = state.transactions.filter(t => t.type === 'expense');
    if (expenses.length < 5) return;

    const amounts = expenses.map(e => e.amount);
    const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const variance = amounts.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / amounts.length;
    const stdDev = Math.sqrt(variance);
    const anomalies = expenses.filter(e => e.amount > mean + (2 * stdDev));

    if (anomalies.length > 0) {
        const insightText = document.getElementById('insightText');
        if (insightText && !insightText.innerText.includes('Anomaly')) {
            insightText.innerText += `\n\nSystem Alert: Detected an unusually high transaction of ₹${anomalies[0].amount.toLocaleString()} in ${anomalies[0].category}. Review to ensure this aligns with your goals.`;
        }
    }
}
