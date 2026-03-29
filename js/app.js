function initializeApp() {
    populateDropdowns();
    loadState();
    initializeCharts();

    const budgetInput = document.getElementById('budgetInput');
    if (budgetInput) budgetInput.value = state.budget || '';

    applyTheme();
    renderAll();

    if (typeof registerPWA === 'function') registerPWA();
    detectSpendingAnomalies();
}

function populateDropdowns() {
    const categories = ['Food', 'Rent', 'Travel', 'Shopping', 'Utilities', 'Groceries', 'Transport', 'Entertainment', 'Healthcare', 'Education', 'Debt', 'Insurance', 'Subscriptions', 'Gifts', 'Maintenance', 'Others'];
    const optionsHTML = categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
    document.querySelectorAll('#transactionCategory, #category').forEach(select => { if (select) select.innerHTML = optionsHTML; });
}

function renderAll() {
    updateDashboardCards(); renderTransactions(); renderGoals(); renderInvestments(); renderSubscriptions(); renderExpenseBreakdown();
    if (summaryChart) updateSummaryChart();
    if (expenseChart) updateExpenseChart();
    if (forecastChart) updateForecastChart();
    if (budgetChart) updateBudgetChart();
    if (networthChart) updateNetWorthChart();
}

function updateDashboardCards() {
    const totalIncome = getCalculatedIncome(); 
    const totalExpense = getTotalExpense(); 
    const savings = totalIncome - totalExpense;
    
    state.income = totalIncome;
    
    const incEl = document.getElementById('incomeValue'); 
    const expEl = document.getElementById('expenseValue'); 
    const savEl = document.getElementById('savingsValue');
    
    // Use the new UI animation function
    if (incEl) animateValue(incEl, totalIncome);
    if (expEl) animateValue(expEl, totalExpense);
    if (savEl) animateValue(savEl, savings);
    
    updateInsights(totalIncome, savings); 
    updateBudgetWarning(totalExpense); 
    updateSavingsGoal(totalIncome, savings); 
    updateFinancialHealthScore(totalIncome, totalExpense, savings);
}

function updateInsights(income, savings) {
    const el = document.getElementById('insightText'); if (!el) return;
    if (income <= 0) return el.innerText = 'Add income and expenses to unlock AI insights.';
    if (savings < 0) return el.innerText = '🚨 Critical Warning: You are spending more than you earn. Review your transaction history immediately.';
    if (state.budget > 0 && getTotalExpense() > state.budget) return el.innerText = '⚠️ Budget breached. Reduce discretionary spending to recover your savings rate.';
    el.innerText = 'Your cashflow is healthy. Consider routing excess savings into the Investment Portfolio view.';
}

function updateBudgetWarning(totalExpense) {
    const el = document.getElementById('budgetWarning'); if (!el) return;
    if (state.budget <= 0) return el.innerText = 'Set a monthly budget to unlock tracking.';
    if (totalExpense > state.budget) { el.innerText = `⚠️ Over budget by ₹${(totalExpense - state.budget).toLocaleString()}`; el.style.color = 'var(--danger)'; }
    else { el.innerText = `Remaining: ₹${(state.budget - totalExpense).toLocaleString()}`; el.style.color = 'var(--text-muted)'; }
}

function updateSavingsGoal(income, savings) {
    const fill = document.getElementById('savingsGoalProgress'); const text = document.getElementById('savingsGoalText'); if (!fill || !text) return;
    if (income <= 0) { fill.style.width = '0%'; text.innerText = 'Pending income data...'; return; }
    const ratio = (savings / income) * 100; const progress = Math.max(0, Math.min(100, (ratio / SAVINGS_GOAL_RATIO) * 100));
    fill.style.width = `${progress}%`; text.innerText = `Status: ${progress.toFixed(0)}% to target (${ratio.toFixed(1)}% saved).`;
}

function updateFinancialHealthScore(income, totalExpense, savings) {
    const valEl = document.getElementById('healthScoreValue'); const ringEl = document.getElementById('healthRing'); const labelEl = document.getElementById('healthScoreLabel');
    if (!valEl || !ringEl || !labelEl) return;
    if (income <= 0) return valEl.innerText = '0';
    let score = 50;
    if (savings > 0) score += 20; if (state.budget > 0 && totalExpense <= state.budget) score += 30; if (savings < 0) score -= 40;
    score = Math.max(0, Math.min(100, score)); valEl.innerText = score; ringEl.style.setProperty('--score-angle', `${(score / 100) * 360}deg`);
    labelEl.innerText = score > 75 ? 'Excellent financial health.' : score > 40 ? 'Stable, but needs optimization.' : 'Urgent attention required.';
}

function renderExpenseBreakdown() {
    const container = document.getElementById('expenseBreakdown'); if (!container) return;
    const map = getExpensesByCategory(); const total = getTotalExpense();
    if (total <= 0) return container.innerHTML = '<p class="empty-state">Add expenses to see breakdown.</p>';
    container.innerHTML = Object.entries(map).map(([cat, amt]) => `<div class="breakdown-row"><span class="breakdown-label">${cat}</span><div class="breakdown-track"><div class="breakdown-fill" style="width: ${((amt / total) * 100).toFixed(1)}%"></div></div><span class="breakdown-value">${((amt / total) * 100).toFixed(1)}%</span></div>`).join('');
}

function resetDashboard() {
    if (!confirm(`This will clear ${state.transactions.length} transactions and all data. Continue?`)) return;
    state = getDefaultState(); state.theme = document.body.classList.contains('dark') ? 'dark' : 'light';
    saveState(); renderAll();
}

function monthlyReset() {
    const monthAgo = new Date(); monthAgo.setMonth(monthAgo.getMonth() - 1);
    const removable = state.transactions.filter(t => new Date(t.date) <= monthAgo);
    if (removable.length === 0) return alert('No transactions older than 30 days to clear.');
    if (!confirm(`Clear ${removable.length} transaction(s) older than 30 days?`)) return;
    state.transactions = state.transactions.filter(t => new Date(t.date) > monthAgo); state.lastReset = new Date().toISOString();
    saveState(); renderAll();
}

function registerPWA() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            const swUrl = URL.createObjectURL(new Blob([`self.addEventListener('install', (e) => { e.waitUntil(caches.open('finance-v1').then((cache) => cache.addAll(['/']))); }); self.addEventListener('fetch', (e) => { e.respondWith(caches.match(e.request).then((response) => response || fetch(e.request))); });`], { type: 'application/javascript' }));
            navigator.serviceWorker.register(swUrl).catch(err => console.log('SW failed: ', err));
        });
    }
}

// Boot Sequence
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    document.getElementById('searchTransactions')?.addEventListener('input', renderTransactions);
    document.getElementById('filterCategory')?.addEventListener('change', renderTransactions);
    init3DInteractions();
    initHeaderOnScroll();
    initButtonRipples();
    initCardShortcuts();
    initFloatingInsight();
    
});
