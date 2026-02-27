const STORAGE_KEY = 'personal_finance_dashboard_state';
const SAVINGS_GOAL_RATIO = 30;

// === STATE MANAGEMENT ===
function getDefaultState() {
    return {
        income: 0,
        budget: 0,
        expenseEntries: [],
        transactions: [],           
        netWorthHistory: [],        
        goals: [],                  
        categoryBudgets: {},        
        theme: 'light',
        lastReset: null,
        recurring: [],
        investments: [],
        subscriptions: []
    };
}

let state = getDefaultState();

// === CHART GLOBALS ===
let expenseChart, summaryChart, forecastChart, budgetChart, networthChart;

// === INITIALIZATION & ROUTER ===
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
    const categories = [
        'Food', 'Rent', 'Travel', 'Shopping', 'Utilities', 
        'Groceries', 'Transport', 'Entertainment', 'Healthcare', 
        'Education', 'Debt', 'Insurance', 'Subscriptions', 
        'Gifts', 'Maintenance', 'Others'
    ];
    
    const optionsHTML = categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
    const selects = document.querySelectorAll('#transactionCategory, #category');
    
    selects.forEach(select => {
        if (select) select.innerHTML = optionsHTML;
    });
}

function switchView(viewId) {
    document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    
    const targetView = document.getElementById(viewId);
    if (targetView) targetView.classList.add('active');
    
    const targetLink = document.querySelector(`[onclick="switchView('${viewId}')"]`);
    if (targetLink) targetLink.classList.add('active');
    
    const viewTitles = {
        'overview': 'Dashboard Overview',
        'transactions-view': 'Transaction History',
        'budget-view': 'Budget & Analytics',
        'wealth-view': 'Net Worth & Goals',
        'investments-view': 'Investment Portfolio',
        'subscriptions-view': 'Fixed Costs & Subscriptions'
    };
    
    const titleEl = document.getElementById('viewTitle');
    if (titleEl) titleEl.innerText = viewTitles[viewId] || 'Dashboard';

    setTimeout(() => {
        Object.values(Chart.instances).forEach(chart => {
            chart.resize();
            chart.update();
        });
    }, 10);

    Object.values(Chart.instances).forEach(chart => chart.resize());
}

// === DATA NORMALIZATION & STORAGE ===
function loadState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            state = { ...getDefaultState(), ...parsed }; 
        }
    } catch (error) {
        console.error("State load failed", error);
        state = getDefaultState();
    }
}

function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// === CORE UTILITIES ===
function getTotalExpense() {
    return state.transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);
}

function getCalculatedIncome() {
    return state.transactions
        .filter(t => t.type === 'income')
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);
}

function getTransactions() {
    return state.transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function getExpensesByCategory() {
    return state.transactions
        .filter(t => t.type === 'expense')
        .reduce((map, item) => {
            map[item.category] = (map[item.category] || 0) + Number(item.amount || 0);
            return map;
        }, {});
}

// === RENDERING ENGINE ===
function renderAll() {
    updateDashboardCards();
    renderTransactions(); 
    renderGoals(); 
    renderInvestments();
    renderSubscriptions();
    renderExpenseBreakdown();
    
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

    if (incEl) incEl.innerText = `₹${totalIncome.toLocaleString()}`;
    if (expEl) expEl.innerText = `₹${totalExpense.toLocaleString()}`;
    if (savEl) savEl.innerText = `₹${savings.toLocaleString()}`;

    updateInsights(totalIncome, savings);
    updateBudgetWarning(totalExpense);
    updateSavingsGoal(totalIncome, savings);
    updateFinancialHealthScore(totalIncome, totalExpense, savings);
}

// === TRANSACTIONS & INPUTS ===
function addTransaction(type = 'expense', amount = 0, category = 'Others', date = new Date().toISOString().split('T')[0], notes = '') {
    const val = Number(amount);
    if (val <= 0) return;

    state.transactions.unshift({
        id: Date.now().toString(),
        date,
        category,
        amount: val,
        type,
        notes
    });
    
    saveState();
    renderAll();
    detectSpendingAnomalies();
}

function addIncome() {
    const input = document.getElementById('incomeInput');
    if (!input || !input.value) return;
    addTransaction('income', input.value, 'Salary', new Date().toISOString().split('T')[0], 'Direct Entry');
    input.value = '';
}

function addExpense() {
    const categoryEl = document.getElementById('category');
    const input = document.getElementById('expenseInput');
    if (!input || !input.value || !categoryEl) return;
    addTransaction('expense', input.value, categoryEl.value, new Date().toISOString().split('T')[0], 'Direct Entry');
    input.value = '';
}

function deleteTransaction(id) {
    state.transactions = state.transactions.filter(t => t.id !== id.toString());
    saveState();
    renderAll();
}

function renderTransactions() {
    const tbody = document.querySelector('#transactionsTable tbody');
    if (!tbody) return;
    
    const searchTerm = document.getElementById('searchTransactions')?.value.toLowerCase() || '';
    const filterCat = document.getElementById('filterCategory')?.value || '';
    
    tbody.innerHTML = '';
    let count = 0;
    
    getTransactions().filter(t => {
        const matchesSearch = !searchTerm || (t.notes && t.notes.toLowerCase().includes(searchTerm)) || t.category.toLowerCase().includes(searchTerm);
        const matchesCategory = !filterCat || t.category === filterCat;
        return matchesSearch && matchesCategory;
    }).forEach(t => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${new Date(t.date).toLocaleDateString('en-IN')}</td>
            <td>${t.category}</td>
            <td style="color: ${t.type === 'income' ? 'var(--success)' : 'var(--danger)'}; font-weight: 600;">₹${t.amount.toLocaleString()}</td>
            <td>${t.type === 'income' ? '➕ Income' : '➖ Expense'}</td>
            <td>${t.notes || '-'}</td>
            <td>
                <button onclick="editTransaction('${t.id}')" class="btn-sm" style="background:#4f7cff;color:white;padding:4px 8px;border-radius:4px;font-size:12px;margin-right:4px;">Edit</button>
                <button onclick="deleteTransaction('${t.id}')" class="btn-sm btn-delete" style="background:#ef4444;color:white;padding:4px 8px;border-radius:4px;font-size:12px;cursor:pointer;">Delete</button>
            </td>
        `;
        count++;
    });
    
    const countEl = document.getElementById('transactionCount');
    if (countEl) countEl.textContent = `${count} transactions`;

    updateFilterCategories();
}

function setBudget() {
    const input = document.getElementById('budgetInput');
    if (!input) return;
    state.budget = Number(input.value) || 0;
    saveState();
    renderAll();
}

// === MODALS: TRANSACTIONS ===
function showAddTransactionModal() {
    document.getElementById('transactionModalTitle').textContent = 'New Transaction';
    document.getElementById('transactionDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('transactionCategory').value = 'Food';
    document.getElementById('transactionAmount').value = '';
    document.getElementById('transactionType').value = 'expense';
    document.getElementById('transactionNotes').value = '';
    document.getElementById('transactionModal').dataset.editingId = '';
    document.getElementById('transactionModal').style.display = 'block';
}

function closeTransactionModal() {
    document.getElementById('transactionModal').style.display = 'none';
}

function editTransaction(id) {
    const transaction = state.transactions.find(t => t.id === id);
    if (!transaction) return;
    
    document.getElementById('transactionModalTitle').textContent = 'Edit Transaction';
    document.getElementById('transactionDate').value = transaction.date;
    document.getElementById('transactionCategory').value = transaction.category;
    document.getElementById('transactionAmount').value = transaction.amount;
    document.getElementById('transactionType').value = transaction.type;
    document.getElementById('transactionNotes').value = transaction.notes;
    document.getElementById('transactionModal').dataset.editingId = id;
    document.getElementById('transactionModal').style.display = 'block';
}

function saveTransaction() {
    const id = document.getElementById('transactionModal').dataset.editingId;
    const date = document.getElementById('transactionDate').value;
    const category = document.getElementById('transactionCategory').value;
    const amount = Number(document.getElementById('transactionAmount').value);
    const type = document.getElementById('transactionType').value;
    const notes = document.getElementById('transactionNotes').value;

    if (amount <= 0 || !category) return alert('Please fill all fields');

    if (id) {
        const index = state.transactions.findIndex(t => t.id === id);
        if (index !== -1) {
            state.transactions[index] = { id, date, category, amount, type, notes };
        }
    } else {
        addTransaction(type, amount, category, date, notes);
    }

    closeTransactionModal();
    saveState();
    renderAll();
    detectSpendingAnomalies();
}

function updateFilterCategories() {
    const select = document.getElementById('filterCategory');
    if (!select) return;
    
    // Get unique categories from current transactions
    const categories = [...new Set(state.transactions.map(t => t.category))].sort();
    
    // Preserve what the user is currently filtering by
    const currentValue = select.value;
    
    select.innerHTML = '<option value="">All Categories</option>' + 
        categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
        
    if (categories.includes(currentValue)) {
        select.value = currentValue;
    }
}

// === CHARTS & VISUALIZATIONS ===
function initializeCharts() {
    Chart.defaults.color = 'rgba(148, 163, 184, 0.8)';
    Chart.defaults.font.family = '"Segoe UI", system-ui, sans-serif';

    const ctxSummary = document.getElementById('summaryChart');
    if (ctxSummary) {
        summaryChart = new Chart(ctxSummary, {
            type: 'bar',
            data: { labels: ['Income', 'Expenses', 'Savings'], datasets: [{ data: [0,0,0], backgroundColor: ['#2ecc71', '#e74c3c', '#3498db'], borderRadius: 6 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    }

    const ctxExpense = document.getElementById('expenseChart');
    if (ctxExpense) {
        expenseChart = new Chart(ctxExpense, {
            type: 'pie',
            data: { labels: [], datasets: [{ data: [], backgroundColor: ['#f1c40f', '#e67e22', '#1abc9c', '#9b59b6', '#e74c3c', '#34495e', '#8e44ad'] }] },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    const ctxForecast = document.getElementById('forecastChart');
    if (ctxForecast) {
        forecastChart = new Chart(ctxForecast, {
            type: 'line',
            data: { labels: ['This Month', 'Next Month', 'Month 3'], datasets: [{ label: 'Cashflow', data: [0,0,0], borderColor: '#4f7cff', backgroundColor: 'rgba(79, 124, 255, 0.1)', fill: true, tension: 0.4 }] },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    const ctxBudget = document.getElementById('budgetChart');
    if (ctxBudget) {
        budgetChart = new Chart(ctxBudget, {
            type: 'doughnut',
            data: { labels: ['Within Budget', 'Over Budget'], datasets: [{ data: [100, 0], backgroundColor: ['#22c55e', '#ef4444'], borderWidth: 0 }] },
            options: { responsive: true, maintainAspectRatio: false, cutout: '70%' }
        });
    }

    const ctxNetworth = document.getElementById('networthTrendChart');
    if (ctxNetworth) {
        networthChart = new Chart(ctxNetworth, {
            type: 'line',
            data: { labels: [], datasets: [{ label: 'Net Worth', data: [], borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.1)', fill: true, tension: 0.3 }] },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
        });
    }
}

function updateSummaryChart() {
    const inc = getCalculatedIncome();
    const exp = getTotalExpense();
    summaryChart.data.datasets[0].data = [inc, exp, inc - exp];
    summaryChart.update();
}

function updateExpenseChart() {
    const map = getExpensesByCategory();
    expenseChart.data.labels = Object.keys(map);
    expenseChart.data.datasets[0].data = Object.values(map);
    expenseChart.update();
}

function updateForecastChart() {
    const inc = getCalculatedIncome();
    const exp = getTotalExpense();
    const cashflow = inc - exp;
    forecastChart.data.datasets[0].data = [cashflow, inc - (exp * 1.05), inc - (exp * 1.10)];
    forecastChart.update('none');
}

function updateBudgetChart() {
    const exp = getTotalExpense();
    const limit = state.budget || 1; 
    const within = state.budget > 0 ? Math.max(0, state.budget - exp) : 100;
    const over = Math.max(0, exp - state.budget);
    budgetChart.data.datasets[0].data = [within, over];
    budgetChart.update('none');
}

function updateNetWorthChart() {
    if (!networthChart || !state.netWorthHistory || state.netWorthHistory.length === 0) return;
    networthChart.data.labels = state.netWorthHistory.map(h => new Date(h.date).toLocaleDateString('short'));
    networthChart.data.datasets[0].data = state.netWorthHistory.map(h => h.value);
    networthChart.update();
}

// === NET WORTH CALCULATOR ===
function calculateNetWorth() {
    const assets = Number(document.getElementById('assetsInput')?.value || 0);
    const liabilities = Number(document.getElementById('liabilitiesInput')?.value || 0);
    const netWorth = assets - liabilities;
    
    const valEl = document.getElementById('netWorthValue');
    const cardEl = document.getElementById('networthCard');
    
    if (valEl) valEl.textContent = `₹${netWorth.toLocaleString()}`;
    if (cardEl) cardEl.style.display = 'block';
    
    state.netWorthHistory = state.netWorthHistory || [];
    state.netWorthHistory.push({
        date: new Date().toISOString().split('T')[0],
        value: netWorth
    });
    
    if (state.netWorthHistory.length > 12) {
        state.netWorthHistory = state.netWorthHistory.slice(-12);
    }
    
    saveState();
    updateNetWorthChart();
}

// === INSIGHTS & WIDGETS ===
function updateInsights(income, savings) {
    const el = document.getElementById('insightText');
    if (!el) return;
    
    if (income <= 0) { el.innerText = 'Add income and expenses to unlock AI insights.'; return; }
    if (savings < 0) { el.innerText = '🚨 Critical Warning: You are spending more than you earn. Review your transaction history immediately.'; return; }
    
    const exp = getTotalExpense();
    if (state.budget > 0 && exp > state.budget) { el.innerText = '⚠️ Budget breached. Reduce discretionary spending to recover your savings rate.'; return; }
    
    el.innerText = 'Your cashflow is healthy. Consider routing excess savings into the Investment Portfolio view.';
}

function updateBudgetWarning(totalExpense) {
    const el = document.getElementById('budgetWarning');
    if (!el) return;
    if (state.budget <= 0) { el.innerText = 'Set a monthly budget to unlock tracking.'; return; }
    if (totalExpense > state.budget) { el.innerText = `⚠️ Over budget by ₹${(totalExpense - state.budget).toLocaleString()}`; el.style.color = 'var(--danger)'; } 
    else { el.innerText = `Remaining: ₹${(state.budget - totalExpense).toLocaleString()}`; el.style.color = 'var(--text-muted)'; }
}

function updateSavingsGoal(income, savings) {
    const fill = document.getElementById('savingsGoalProgress');
    const text = document.getElementById('savingsGoalText');
    if (!fill || !text) return;
    
    if (income <= 0) { fill.style.width = '0%'; text.innerText = 'Pending income data...'; return; }
    
    const ratio = (savings / income) * 100;
    const progress = Math.max(0, Math.min(100, (ratio / SAVINGS_GOAL_RATIO) * 100));
    fill.style.width = `${progress}%`;
    text.innerText = `Status: ${progress.toFixed(0)}% to target (${ratio.toFixed(1)}% saved).`;
}

function updateFinancialHealthScore(income, totalExpense, savings) {
    const valEl = document.getElementById('healthScoreValue');
    const ringEl = document.getElementById('healthRing');
    const labelEl = document.getElementById('healthScoreLabel');
    if (!valEl || !ringEl || !labelEl) return;
    
    if (income <= 0) { valEl.innerText = '0'; return; }
    
    let score = 50;
    if (savings > 0) score += 20;
    if (state.budget > 0 && totalExpense <= state.budget) score += 30;
    if (savings < 0) score -= 40;
    
    score = Math.max(0, Math.min(100, score));
    valEl.innerText = score;
    ringEl.style.setProperty('--score-angle', `${(score / 100) * 360}deg`);
    
    labelEl.innerText = score > 75 ? 'Excellent financial health.' : score > 40 ? 'Stable, but needs optimization.' : 'Urgent attention required.';
}

function renderExpenseBreakdown() {
    const container = document.getElementById('expenseBreakdown');
    if (!container) return;
    
    const map = getExpensesByCategory();
    const total = getTotalExpense();
    
    if (total <= 0) { container.innerHTML = '<p class="empty-state">Add expenses to see breakdown.</p>'; return; }
    
    container.innerHTML = Object.entries(map).map(([cat, amt]) => {
        const pct = ((amt / total) * 100).toFixed(1);
        return `
            <div class="breakdown-row">
                <span class="breakdown-label">${cat}</span>
                <div class="breakdown-track"><div class="breakdown-fill" style="width: ${pct}%"></div></div>
                <span class="breakdown-value">${pct}%</span>
            </div>
        `;
    }).join('');
}

// === NEW MODULES: INVESTMENTS ===
function renderInvestments() {
    const tbody = document.querySelector('#investmentsTable tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    let totalInvested = 0;
    let currentValue = 0;

    (state.investments || []).forEach(asset => {
        const invested = asset.qty * asset.buyPrice;
        const current = asset.qty * asset.currentPrice;
        const pnl = current - invested;
        const pnlPercent = invested > 0 ? ((pnl / invested) * 100).toFixed(2) : 0;
        
        totalInvested += invested;
        currentValue += current;

        const pnlColor = pnl >= 0 ? 'var(--success)' : 'var(--danger)';

        tbody.innerHTML += `
            <tr>
                <td><strong>${asset.ticker}</strong></td>
                <td>${asset.qty}</td>
                <td>₹${asset.buyPrice.toLocaleString()}</td>
                <td>₹${asset.currentPrice.toLocaleString()}</td>
                <td style="color: ${pnlColor}; font-weight: bold;">
                    ₹${pnl.toLocaleString()} (${pnl >= 0 ? '+' : ''}${pnlPercent}%)
                </td>
                <td>
                    <button onclick="updateAssetPrice('${asset.id}')" style="background:#4f7cff; padding:4px 8px; font-size:12px; border-radius:4px; color:white; border:none; cursor:pointer; margin-right:4px;" title="Update Current Price">Update</button>
                    <button onclick="sellAsset('${asset.id}')" style="background:#10b981; padding:4px 8px; font-size:12px; border-radius:4px; color:white; border:none; cursor:pointer; margin-right:4px;" title="Sell & Realize P&L">Sell</button>
                    <button onclick="deleteAsset('${asset.id}')" style="background:#ef4444; padding:4px 8px; font-size:12px; border-radius:4px; color:white; border:none; cursor:pointer;" title="Delete without logging transaction">Del</button>
                </td>
            </tr>
        `;
    });

    const totalInvEl = document.getElementById('totalInvested');
    const portValEl = document.getElementById('portfolioValue');
    
    if (totalInvEl) totalInvEl.innerText = `₹${totalInvested.toLocaleString()}`;
    
    if (portValEl) {
        const totalPnl = currentValue - totalInvested;
        const totalColor = totalPnl >= 0 ? 'var(--success)' : 'var(--danger)';
        portValEl.innerHTML = `₹${currentValue.toLocaleString()} <span style="font-size:1rem; color:${totalColor}">(${totalPnl >= 0 ? '+' : ''}₹${totalPnl.toLocaleString()})</span>`;
    }
}

function showInvestmentModal() {
    const ticker = prompt("Asset Name / Ticker (e.g., NIFTY50, BTC):");
    if (!ticker) return;
    const qtyStr = prompt("Quantity:");
    if (!qtyStr) return;
    const buyPriceStr = prompt("Average Buy Price (₹):");
    if (!buyPriceStr) return;
    
    const qty = Number(qtyStr);
    const buyPrice = Number(buyPriceStr);

    if (qty > 0 && buyPrice > 0) {
        const totalCost = qty * buyPrice;
        const transactionId = Date.now().toString();
        
        // 1. Log the purchase as an expense
        state.transactions.unshift({
            id: transactionId,
            date: new Date().toISOString().split('T')[0],
            category: 'Investments',
            amount: totalCost,
            type: 'expense',
            notes: `Bought ${qty} units of ${ticker} @ ₹${buyPrice}`
        });

        // 2. Add to portfolio
        state.investments = state.investments || [];
        state.investments.push({
            id: transactionId + '_inv',
            ticker,
            qty,
            buyPrice,
            currentPrice: buyPrice
        });
        
        saveState();
        renderAll();
    } else {
        alert("Invalid quantity or price entered.");
    }
}

function updateAssetPrice(id) {
    const asset = state.investments.find(a => a.id === id);
    if (!asset) return;
    
    const newPrice = prompt(`Update current price for ${asset.ticker} (₹):`, asset.currentPrice);
    if (newPrice) {
        asset.currentPrice = Number(newPrice);
        saveState();
        renderInvestments();
    }
}

function sellAsset(id) {
    const assetIndex = state.investments.findIndex(a => a.id === id);
    if (assetIndex === -1) return;
    
    const asset = state.investments[assetIndex];
    
    const sellPriceStr = prompt(`Selling ${asset.qty} units of ${asset.ticker}.\n\nEnter the selling price per unit (₹):`, asset.currentPrice);
    if (!sellPriceStr) return;
    
    const sellPrice = Number(sellPriceStr);
    if (sellPrice < 0 || isNaN(sellPrice)) return alert("Invalid price entered.");
    
    const totalReturn = asset.qty * sellPrice;
    const totalCost = asset.qty * asset.buyPrice;
    const pnl = totalReturn - totalCost;
    
    // 1. Log the sale as income
    const transactionId = Date.now().toString();
    state.transactions.unshift({
        id: transactionId,
        date: new Date().toISOString().split('T')[0],
        category: 'Investments',
        amount: totalReturn,
        type: 'income',
        notes: `Sold ${asset.qty} ${asset.ticker} @ ₹${sellPrice} (P&L: ${pnl >= 0 ? '+' : ''}₹${pnl})`
    });
    
    // 2. Remove asset from portfolio
    state.investments.splice(assetIndex, 1);
    
    // Celebrate if you made a profit!
    if (pnl > 0 && typeof confetti !== 'undefined') {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }
    
    saveState();
    renderAll();
}

function deleteAsset(id) {
    if(!confirm("Remove this asset WITHOUT logging a transaction? (Use this only to fix mistakes)")) return;
    state.investments = state.investments.filter(a => a.id !== id);
    saveState();
    renderAll();
}

// === NEW MODULES: SUBSCRIPTIONS ===
function renderSubscriptions() {
    const container = document.getElementById('subscriptionsList');
    if (!container) return;
    
    let burnRate = 0;
    container.innerHTML = (state.subscriptions || []).map(sub => {
        burnRate += sub.amount;
        return `
            <div class="tool-card" style="display:flex; justify-content:space-between; align-items:center; background: var(--glass-bg); border: 1px solid var(--glass-border); padding: 16px; border-radius: 12px; margin-bottom: 10px;">
                <div>
                    <h4 style="margin-bottom: 4px;">${sub.name}</h4>
                    <p style="color: var(--text-muted); font-size: 0.85rem;">Renews on: ${sub.dueDate} of month</p>
                </div>
                <div style="text-align: right;">
                    <h3 style="color: var(--danger);">₹${sub.amount.toLocaleString()}</h3>
                    <button onclick="deleteSubscription('${sub.id}')" style="background:transparent; border:none; color:var(--text-muted); padding:0; margin-top:5px; cursor:pointer; font-size: 0.85rem; text-decoration: underline;">Remove</button>
                </div>
            </div>
        `;
    }).join('') || '<p class="empty-state">No active subscriptions detected.</p>';

    const burnEl = document.getElementById('monthlyBurn');
    if (burnEl) burnEl.innerText = `₹${burnRate.toLocaleString()}`;
}

function showSubscriptionModal() {
    const name = prompt("Subscription Name (e.g., Netflix, Gym, Rent):");
    if(!name) return;
    const amount = prompt("Monthly Cost (₹):");
    if(!amount) return;
    const dueDate = prompt("Day of the month it renews (1-31):");
    
    if (name && amount && dueDate) {
        state.subscriptions = state.subscriptions || [];
        state.subscriptions.push({
            id: Date.now().toString(),
            name,
            amount: Number(amount),
            dueDate: Number(dueDate)
        });
        saveState();
        renderSubscriptions();
    }
}

function deleteSubscription(id) {
    if(!confirm("Remove this subscription?")) return;
    state.subscriptions = state.subscriptions.filter(s => s.id !== id);
    saveState();
    renderSubscriptions();
}

// === GOALS MANAGEMENT ===
function renderGoals() {
    const container = document.getElementById('goalsList');
    if (!container) return;
    
    container.innerHTML = state.goals.map(goal => {
        const progress = goal.target > 0 ? (goal.current / goal.target) * 100 : 0;
        const daysLeft = goal.deadline ? Math.max(0, Math.ceil((new Date(goal.deadline) - Date.now()) / (1000 * 60 * 60 * 24))) : 0;
        
        return `
            <div class="goal-card" style="background: var(--glass-bg); padding: 20px; border-radius: 16px; border: 1px solid var(--glass-border);">
                <div>
                    <h4>${goal.name}</h4>
                    <div class="goal-progress" style="height: 8px; border-radius: 4px; background: rgba(148,163,184,0.3); margin: 12px 0; overflow: hidden;">
                        <div class="goal-progress-fill" style="height: 100%; background: linear-gradient(90deg, var(--success), var(--accent)); width: ${Math.min(100, progress)}%;"></div>
                    </div>
                    <p style="font-weight: bold; margin-bottom: 4px;">₹${goal.current.toLocaleString()} / ₹${goal.target.toLocaleString()} 
                       <span style="color: ${progress >= 100 ? '#22c55e' : '#94a3b8'}">
                           (${Math.round(progress)}%)
                       </span>
                    </p>
                    ${goal.deadline ? `<small class="goal-timeline" style="color: var(--text-muted);">${daysLeft === 0 ? 'Today!' : `${daysLeft} days left`}</small>` : ''}
                </div>
                <div style="margin-top: 15px; display: flex; gap: 8px;">
                    <button onclick="editGoal(${goal.id})" class="btn-sm" style="background:#10b981; padding: 6px 12px; color: white; border-radius: 6px;">Add ₹100</button>
                    <button onclick="deleteGoal(${goal.id})" class="btn-sm btn-delete" style="background: #ef4444; padding: 6px 12px; color: white; border-radius: 6px;">Delete</button>
                </div>
            </div>
        `;
    }).join('') || '<p class="empty-state">No goals set. Add your first savings goal!</p>';
}

function showGoalModal() {
    const name = prompt('Goal name (e.g., Emergency Fund, Vacation):') || 'New Goal';
    const targetStr = prompt('Target amount (₹):');
    const deadlineStr = prompt('Deadline (YYYY-MM-DD, optional):') || '';
    
    const target = Number(targetStr);
    if (target <= 0 || isNaN(target)) {
        alert('Please enter a valid target amount');
        return;
    }
    
    state.goals.push({
        id: Date.now(),
        name,
        target,
        current: 0,
        deadline: deadlineStr || null
    });
    
    saveState();
    renderGoals();
}

function editGoal(id) {
    const goal = state.goals.find(g => g.id === id);
    if (!goal) return;
    
    const addAmountInput = prompt(`Add to "${goal.name}" (₹):`, '100');
    const amount = Number(addAmountInput);
    
    if (amount <= 0 || isNaN(amount)) return;
    
    const currentSavings = getCalculatedIncome() - getTotalExpense();
    if (amount > currentSavings) {
        alert(`Insufficient funds! Available savings: ₹${currentSavings.toLocaleString()}`);
        return;
    }
    
    const transactionId = Date.now().toString();
    const goalCategory = `Goal: ${goal.name}`;
    
    state.transactions.unshift({
        id: transactionId,
        date: new Date().toISOString().split('T')[0],
        category: goalCategory,
        amount: amount,
        type: 'expense',
        notes: `Contribution to ${goal.name}`
    });
    
    goal.current += amount;
    if (goal.current >= goal.target) {
        goal.current = goal.target;
        if (typeof confetti !== 'undefined') {
            confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
            setTimeout(() => alert(`🎉 Congratulations! You reached your "${goal.name}" goal!`), 500);
        }
    }
    
    saveState();
    renderAll();
}

function deleteGoal(id) {
    if(!confirm("Delete this goal?")) return;
    state.goals = state.goals.filter(g => g.id !== id);
    saveState();
    renderGoals();
}

// === QUICK TOOLS ===
function showQuickTools() {
    const modal = document.getElementById('quickToolsModal');
    if (modal) modal.style.display = 'block';
}

function closeQuickTools() {
    const modal = document.getElementById('quickToolsModal');
    if (modal) modal.style.display = 'none';
}

function showEMICalculator() {
    closeQuickTools();
    const principal = prompt("Enter Loan Amount (₹):", "100000");
    const rate = prompt("Enter Annual Interest Rate (%):", "10");
    const tenure = prompt("⏱Enter Loan Tenure (in months):", "12");
    
    if (principal && rate && tenure) {
        const p = Number(principal);
        const r = Number(rate) / 12 / 100;
        const n = Number(tenure);
        const emi = (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
        alert(`Calculated EMI: ₹${emi.toFixed(2)} per month\nTotal Amount Payable: ₹${(emi * n).toFixed(2)}`);
    }
}

function showCurrencyConverter() {
    closeQuickTools();
    const amount = prompt("Enter Amount in USD to convert to INR ($):", "100");
    if (amount) {
        const rate = 83.12; 
        const converted = Number(amount) * rate;
        alert(`$${amount} USD is approximately ₹${converted.toFixed(2)} INR`);
    }
}

function showDebtPlanner() {
    closeQuickTools();
    alert("Avalanche vs Snowball Planner:\n\nBased on optimal financial modeling, prioritize paying off the highest-interest debt first (Avalanche method) to save the most money over time.");
}

// === EXPORT & IMPORT ===
function exportCSV() {
    const transactions = getTransactions();
    if(transactions.length === 0) return alert("No transactions to export.");
    
    const csv = [
        ['Date', 'Category', 'Amount', 'Type', 'Notes'],
        ...transactions.map(t => [
            new Date(t.date).toLocaleDateString('en-IN'),
            t.category,
            t.amount,
            t.type,
            t.notes
        ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finance_transactions_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
}

function importCSV() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const csv = e.target.result;
            const lines = csv.split('\n').slice(1); 
            lines.forEach(line => {
                if(!line.trim()) return;
                const [date, category, amount, type, ...notes] = line.split(',').map(cell => cell.replace(/"/g, ''));
                if (amount && category) {
                    addTransaction(type.toLowerCase() === 'income' ? 'income' : 'expense', Number(amount), category, new Date().toISOString().split('T')[0], notes.join(','));
                }
            });
        };
        reader.readAsText(file);
    };
    input.click();
}

function downloadReport() {
    if (!window.jspdf || !window.jspdf.jsPDF) return alert('PDF library not loaded. Please refresh and try again.');
    const { jsPDF } = window.jspdf; 
    const doc = new jsPDF(); 
    let y = 18;
    const pageHeight = 280; // Standard A4 page height boundary

    // Helper function for automatic page breaks
    function checkPageBreak(spaceNeeded = 10) {
        if (y + spaceNeeded > pageHeight) {
            doc.addPage();
            y = 18; // Reset Y to top of new page
        }
    }

    // --- 1. Header ---
    doc.setFontSize(20); doc.setFont("helvetica", "bold");
    doc.text('FinancePro Comprehensive Report', 14, y); y += 12;
    doc.setFontSize(10); doc.setFont("helvetica", "normal");
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, y); y += 15;

    // --- 2. Executive Summary ---
    doc.setFontSize(14); doc.setFont("helvetica", "bold");
    doc.text('Executive Summary', 14, y); y += 8;
    doc.setFontSize(11); doc.setFont("helvetica", "normal");
    const inc = getCalculatedIncome();
    const exp = getTotalExpense();
    const sav = inc - exp;
    doc.text(`Total Income: ₹${inc.toLocaleString()}`, 14, y); y += 6;
    doc.text(`Total Expenses: ₹${exp.toLocaleString()}`, 14, y); y += 6;
    doc.text(`Net Savings: ₹${sav.toLocaleString()}`, 14, y); y += 12;

    // --- 3. Net Worth & Assets ---
    checkPageBreak(30);
    doc.setFontSize(14); doc.setFont("helvetica", "bold");
    doc.text('Wealth & Investments', 14, y); y += 8;
    doc.setFontSize(11); doc.setFont("helvetica", "normal");
    const latestNetWorth = (state.netWorthHistory && state.netWorthHistory.length > 0) ? state.netWorthHistory[state.netWorthHistory.length - 1].value : 0;
    doc.text(`Current Net Worth: ₹${latestNetWorth.toLocaleString()}`, 14, y); y += 8;
    
    if (state.investments && state.investments.length > 0) {
        doc.setFont("helvetica", "bold"); doc.text('Portfolio:', 14, y); y += 6; doc.setFont("helvetica", "normal");
        state.investments.forEach(inv => {
            checkPageBreak(8);
            const current = inv.qty * inv.currentPrice;
            const pnl = current - (inv.qty * inv.buyPrice);
            doc.text(`- ${inv.ticker}: ${inv.qty} units | Value: ₹${current.toLocaleString()} | P&L: ₹${pnl.toLocaleString()}`, 14, y); y += 6;
        });
    } else {
        doc.text('No active investments.', 14, y); y += 6;
    }
    y += 6;

    // --- 4. Subscriptions ---
    checkPageBreak(30);
    doc.setFontSize(14); doc.setFont("helvetica", "bold");
    doc.text('Fixed Monthly Costs', 14, y); y += 8;
    doc.setFontSize(11); doc.setFont("helvetica", "normal");
    if (state.subscriptions && state.subscriptions.length > 0) {
        let burnRate = 0;
        state.subscriptions.forEach(sub => {
            checkPageBreak(8);
            burnRate += sub.amount;
            doc.text(`- ${sub.name}: ₹${sub.amount.toLocaleString()}/month (Renews on ${sub.dueDate})`, 14, y); y += 6;
        });
        checkPageBreak(8);
        doc.setFont("helvetica", "bold"); doc.text(`Total Monthly Burn Rate: ₹${burnRate.toLocaleString()}`, 14, y); doc.setFont("helvetica", "normal"); y += 6;
    } else {
        doc.text('No active subscriptions.', 14, y); y += 6;
    }
    y += 6;

    // --- 5. Savings Goals ---
    checkPageBreak(30);
    doc.setFontSize(14); doc.setFont("helvetica", "bold");
    doc.text('Savings Goals Progress', 14, y); y += 8;
    doc.setFontSize(11); doc.setFont("helvetica", "normal");
    if (state.goals && state.goals.length > 0) {
        state.goals.forEach(goal => {
            checkPageBreak(8);
            const prog = goal.target > 0 ? ((goal.current / goal.target) * 100).toFixed(1) : 0;
            doc.text(`- ${goal.name}: ₹${goal.current.toLocaleString()} / ₹${goal.target.toLocaleString()} (${prog}%)`, 14, y); y += 6;
        });
    } else {
        doc.text('No savings goals set.', 14, y); y += 6;
    }
    y += 6;

    // --- 6. Expenses Breakdown ---
    checkPageBreak(30);
    doc.setFontSize(14); doc.setFont("helvetica", "bold");
    doc.text('Expenses by Category', 14, y); y += 8;
    doc.setFontSize(11); doc.setFont("helvetica", "normal");
    const map = getExpensesByCategory();
    if (Object.keys(map).length > 0) {
        Object.entries(map).forEach(([cat, amt]) => { 
            checkPageBreak(8);
            doc.text(`${cat}: ₹${amt.toLocaleString()}`, 14, y); y += 6; 
        });
    } else {
        doc.text('No expenses recorded.', 14, y); y += 6;
    }
    y += 6;

    // --- 7. Recent Transactions ---
    checkPageBreak(40);
    doc.setFontSize(14); doc.setFont("helvetica", "bold");
    doc.text('Transaction History (Latest 30)', 14, y); y += 8;
    doc.setFontSize(10); doc.setFont("helvetica", "normal");

    const txns = getTransactions().slice(0, 30); // Grab top 30
    if (txns.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.text('Date', 14, y); doc.text('Category', 45, y); doc.text('Type', 90, y); doc.text('Amount', 130, y); doc.text('Notes', 165, y);
        y += 6;
        doc.setFont("helvetica", "normal");

        txns.forEach(t => {
            checkPageBreak(8);
            doc.text(new Date(t.date).toLocaleDateString('en-IN'), 14, y);
            doc.text(t.category.substring(0, 18), 45, y);
            doc.text(t.type, 90, y);
            doc.text(`₹${t.amount.toLocaleString()}`, 130, y);
            doc.text((t.notes || '-').substring(0, 20), 165, y);
            y += 6;
        });
    } else {
        doc.text('No transactions recorded.', 14, y);
    }

    doc.save(`FinancePro_Comprehensive_Report_${new Date().toISOString().split('T')[0]}.pdf`);
}

// === THEME, RESET & ANOMALIES ===
function toggleTheme() {
    document.body.classList.toggle('dark');
    state.theme = document.body.classList.contains('dark') ? 'dark' : 'light';
    saveState();
    applyTheme();
}

function applyTheme() {
    if (state.theme === 'dark') document.body.classList.add('dark');
    else document.body.classList.remove('dark');
    const btn = document.querySelector('.theme-toggle');
    if(btn) btn.innerText = state.theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
}

function resetDashboard() {
    if (!confirm('Reset all income, expenses, budget, and insights?')) return;
    state = getDefaultState();
    state.theme = document.body.classList.contains('dark') ? 'dark' : 'light';
    saveState();
    renderAll();
}

function monthlyReset() {
    if (!confirm('Clear all transactions older than 30 days?')) return;
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    state.transactions = state.transactions.filter(t => new Date(t.date) > monthAgo);
    state.lastReset = new Date().toISOString();
    saveState();
    renderAll();
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

function registerPWA() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            const swCode = `
                self.addEventListener('install', (e) => { e.waitUntil(caches.open('finance-v1').then((cache) => cache.addAll(['/']))); });
                self.addEventListener('fetch', (e) => { e.respondWith(caches.match(e.request).then((response) => response || fetch(e.request))); });
            `;
            const blob = new Blob([swCode], { type: 'application/javascript' });
            const swUrl = URL.createObjectURL(blob);
            navigator.serviceWorker.register(swUrl).catch(err => console.log('ServiceWorker failed: ', err));
        });
    }
}

// Boot Up
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    
    // Activate Search & Filter listeners
    const searchInput = document.getElementById('searchTransactions');
    const filterSelect = document.getElementById('filterCategory');
    
    if (searchInput) searchInput.addEventListener('input', renderTransactions);
    if (filterSelect) filterSelect.addEventListener('change', renderTransactions);
});
