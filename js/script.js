const STORAGE_KEY = 'personal_finance_dashboard_state';
const SAVINGS_GOAL_RATIO = 30;

// === ENHANCED STATE (Your existing + NEW features) ===
function getDefaultState() {
    return {
        income: 0,
        budget: 0,
        expenseEntries: [],
        transactions: [],           // NEW: Full transaction history
        netWorthHistory: [],        // NEW: Net worth evolution
        goals: [],                  // NEW: Multiple savings goals
        categoryBudgets: {},        // NEW: Per-category budgets
        theme: 'light',
        lastReset: null,
        recurring: []               // NEW: Recurring transactions
    };
}

let state = getDefaultState();

// === CHART CONTEXTS ===
const expenseCtx = document.getElementById('expenseChart');
const summaryCtx = document.getElementById('summaryChart');
const forecastCtx = document.getElementById('forecastChart');
const budgetCtx = document.getElementById('budgetChart');
const networthCtx = document.getElementById('networthTrendChart');

let expenseChart, summaryChart, forecastChart, budgetChart, networthChart;

// === YOUR EXISTING CHART INITIALIZATION (ENHANCED) ===
function initializeCharts() {
    // YOUR ORIGINAL CHARTS (UNCHANGED)
    expenseChart = new Chart(expenseCtx, {
        type: 'pie',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: ['#f1c40f', '#e67e22', '#1abc9c', '#9b59b6', '#e74c3c']
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    summaryChart = new Chart(summaryCtx, {
        type: 'bar',
        data: {
            labels: ['Income', 'Expenses', 'Savings'],
            datasets: [{
                data: [0, 0, 0],
                backgroundColor: ['#2ecc71', '#e74c3c', '#3498db']
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    // NEW CHARTS
    forecastChart = new Chart(forecastCtx, {
        type: 'line',
        data: {
            labels: ['This Month', 'Next Month', 'Month 3'],
            datasets: [{
                label: 'Cashflow Forecast',
                data: [0, 0, 0],
                borderColor: '#4f7cff',
                backgroundColor: 'rgba(79, 124, 255, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: { responsive: true, scales: { y: { beginAtZero: true } } }
    });

    budgetChart = new Chart(budgetCtx, {
        type: 'doughnut',
        data: {
            labels: ['Within Budget', 'Over Budget'],
            datasets: [{
                data: [100, 0],
                backgroundColor: ['#22c55e', '#ef4444']
            }]
        },
        options: { responsive: true }
    });

    networthChart = new Chart(networthCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Net Worth',
                data: [],
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                fill: true,
                tension: 0.3
            }]
        },
        options: { responsive: true, scales: { y: { beginAtZero: true } } }
    });
}

// === YOUR EXISTING NORMALIZATION (ENHANCED) ===
function normalizeExpenseEntries(entries) {
    if (!Array.isArray(entries)) return [];
    return entries.map((entry, index) => ({
        id: Number(entry.id) || (Date.now() + index),
        category: String(entry.category || 'Others'),
        amount: Number(entry.amount) || 0
    })).filter((entry) => entry.amount > 0);
}

function normalizeState(rawState) {
    return {
        income: Math.max(0, Number(rawState?.income) || 0),
        budget: Math.max(0, Number(rawState?.budget) || 0),
        expenseEntries: normalizeExpenseEntries(rawState?.expenseEntries),
        transactions: Array.isArray(rawState?.transactions) ? rawState.transactions.map(t => ({
            id: t.id || Date.now(),
            date: t.date || new Date().toISOString().split('T')[0],
            category: t.category || 'Others',
            amount: Number(t.amount) || 0,
            type: t.type || 'expense',
            notes: t.notes || ''
        })) : [],
        netWorthHistory: Array.isArray(rawState?.netWorthHistory) ? rawState.netWorthHistory : [],
        goals: Array.isArray(rawState?.goals) ? rawState.goals.map(g => ({
            id: g.id || Date.now(),
            name: g.name || 'New Goal',
            target: Math.max(0, Number(g.target) || 0),
            current: Math.max(0, Number(g.current) || 0),
            deadline: g.deadline || null
        })) : [],
        categoryBudgets: rawState?.categoryBudgets || {},
        theme: rawState?.theme === 'dark' ? 'dark' : 'light',
        lastReset: rawState?.lastReset || null,
        recurring: Array.isArray(rawState?.recurring) ? rawState.recurring : []
    };
}

// === YOUR EXISTING STORAGE (UNCHANGED) ===
function loadState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            state = getDefaultState();
            return;
        }
        state = normalizeState(JSON.parse(raw));
    } catch (error) {
        state = getDefaultState();
    }
}

function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// === CORE UTILITIES ===
function getTotalExpense() {
    return state.expenseEntries.reduce((sum, item) => sum + Number(item.amount || 0), 0);
}

function getTransactions() {
    return state.transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function getExpensesByCategory() {
    return state.expenseEntries.reduce((map, item) => {
        map[item.category] = (map[item.category] || 0) + Number(item.amount || 0);
        return map;
    }, {});
}

// === NEW: Transaction Management ===
function renderTransactions() {
    const tbody = document.querySelector('#transactionsTable tbody');
    const searchTerm = document.getElementById('searchTransactions')?.value.toLowerCase() || '';
    const filterCat = document.getElementById('filterCategory')?.value || '';
    
    tbody.innerHTML = '';
    let count = 0;
    
    getTransactions().filter(t => {
        const matchesSearch = !searchTerm || 
            t.notes?.toLowerCase().includes(searchTerm) || 
            t.category.toLowerCase().includes(searchTerm);
        const matchesCategory = !filterCat || t.category === filterCat;
        return matchesSearch && matchesCategory;
    }).forEach(t => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${new Date(t.date).toLocaleDateString('en-IN')}</td>
            <td>${t.category}</td>
            <td>₹${t.amount.toLocaleString()}</td>
            <td>${t.type === 'income' ? '➕ Income' : '➖ Expense'}</td>
            <td>${t.notes || '-'}</td>
            <td>
                <button onclick="editTransaction(${t.id})" class="btn-sm" style="background:#4f7cff;color:white;padding:4px 8px;border-radius:4px;font-size:12px;">Edit</button>
                <button onclick="deleteTransaction(${t.id})" class="btn-sm btn-delete" style="background:#ef4444;color:white;padding:4px 8px;border-radius:4px;font-size:12px;">Delete</button>
            </td>
        `;
        count++;
    });
    
    document.getElementById('transactionCount').textContent = `${count} transactions`;
    updateFilterCategories();
}

function updateFilterCategories() {
    const select = document.getElementById('filterCategory');
    if (!select) return;
    
    const categories = [...new Set(state.transactions.map(t => t.category))].sort();
    select.innerHTML = '<option value="">All Categories</option>' + 
        categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
}

function addTransaction(type = 'expense', amount = 0, category = 'Others', date = new Date().toISOString().split('T')[0], notes = '') {
    state.transactions.unshift({
        id: Date.now(),
        date,
        category,
        amount: Math.abs(Number(amount)),
        type,
        notes
    });
    
    if (type === 'income') state.income += amount;
    else state.expenseEntries.push({ id: Date.now(), category, amount });
    
    saveState();
    renderAll();
}

function deleteTransaction(id) {
    const transaction = state.transactions.find(t => t.id === id);
    if (!transaction) return;
    
    if (transaction.type === 'income') {
        state.income -= transaction.amount;
        state.income = Math.max(0, state.income);
    } else {
        state.expenseEntries = state.expenseEntries.filter(e => e.id !== id);
    }
    
    state.transactions = state.transactions.filter(t => t.id !== id);
    saveState();
    renderAll();
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

// === NEW: Goals Management ===
function renderGoals() {
    const container = document.getElementById('goalsList');
    if (!container) return;
    
    container.innerHTML = state.goals.map(goal => {
        const progress = goal.target > 0 ? (goal.current / goal.target) * 100 : 0;
        const daysLeft = goal.deadline ? Math.max(0, Math.ceil((new Date(goal.deadline) - Date.now()) / (1000 * 60 * 60 * 24))) : 0;
        
        return `
            <div class="goal-card">
                <div>
                    <h4>${goal.name}</h4>
                    <div class="goal-progress">
                        <div class="goal-progress-fill" style="width: ${Math.min(100, progress)}%"></div>
                    </div>
                    <p>₹${goal.current.toLocaleString()} / ₹${goal.target.toLocaleString()} 
                       <span style="color: ${progress >= 100 ? '#22c55e' : '#94a3b8'}">
                           ${Math.round(progress)}%
                       </span>
                    </p>
                    ${goal.deadline ? `<small class="goal-timeline">${daysLeft === 0 ? 'Today!' : `${daysLeft} days left`}</small>` : ''}
                </div>
                <div>
                    <button onclick="editGoal(${goal.id})" class="btn-sm" style="background:#10b981">Add ₹100</button>
                    <button onclick="deleteGoal(${goal.id})" class="btn-sm btn-delete">🗑️</button>
                </div>
            </div>
        `;
    }).join('') || '<p class="empty-state">No goals set. Add your first savings goal!</p>';
}

function addGoal(name, target, deadline = null) {
    state.goals.push({
        id: Date.now(),
        name,
        target: Number(target),
        current: 0,
        deadline
    });
    saveState();
    renderGoals();
}

// === CSV EXPORT/IMPORT ===
function exportCSV() {
    const transactions = getTransactions();
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
            const lines = csv.split('\n').slice(1); // Skip header
            lines.forEach(line => {
                const [date, category, amount, type, ...notes] = line.split(',').map(cell => cell.replace(/"/g, ''));
                if (amount && category) {
                    addTransaction(type === 'income' ? 'income' : 'expense', amount, category, date, notes.join(','));
                }
            });
        };
        reader.readAsText(file);
    };
    input.click();
}

// === NET WORTH ===
function calculateNetWorth() {
    const assets = Number(document.getElementById('assetsInput')?.value || 0);
    const liabilities = Number(document.getElementById('liabilitiesInput')?.value || 0);
    const netWorth = assets - liabilities;
    
    document.getElementById('netWorthValue').textContent = `₹${netWorth.toLocaleString()}`;
    document.getElementById('networthCard').style.display = 'block';
    
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

function updateNetWorthChart() {
    if (!networthChart || state.netWorthHistory.length === 0) return;
    
    networthChart.data.labels = state.netWorthHistory.map(h => new Date(h.date).toLocaleDateString('short'));
    networthChart.data.datasets[0].data = state.netWorthHistory.map(h => h.value);
    networthChart.update();
}

// === FORECAST & BUDGET CHARTS ===
function updateForecastChart() {
    if (!forecastChart) return;
    
    const currentSavings = state.income - getTotalExpense();
    const avgMonthlySavings = currentSavings * 0.95;
    
    forecastChart.data.datasets[0].data = [currentSavings, avgMonthlySavings, avgMonthlySavings * 1.02];
    forecastChart.update();
}

function updateBudgetChart() {
    if (!budgetChart) return;
    
    const totalExpense = getTotalExpense();
    const withinBudget = state.budget > 0 ? Math.max(0, state.budget - totalExpense) : 100;
    const overBudget = Math.max(0, totalExpense - state.budget);
    
    budgetChart.data.datasets[0].data = [withinBudget, overBudget];
    budgetChart.update();
}

// === YOUR EXISTING FUNCTIONS (100% UNCHANGED) ===
function renderExpenseList() {
    const list = document.getElementById('expenseList');
    list.innerHTML = '';

    if (state.expenseEntries.length === 0) {
        const emptyItem = document.createElement('li');
        emptyItem.innerText = 'No expenses added yet.';
        emptyItem.className = 'empty-state';
        list.appendChild(emptyItem);
        return;
    }

    state.expenseEntries.forEach((expense) => {
        const item = document.createElement('li');
        item.className = 'expense-item';

        const label = document.createElement('span');
        label.className = 'expense-meta';
        label.innerText = `${expense.category} - ₹${expense.amount}`;

        const deleteBtn = document.createElement('button');
        deleteBtn.innerText = 'Delete';
        deleteBtn.className = 'delete-btn';
        deleteBtn.onclick = function () {
            deleteExpense(expense.id);
        };

        item.appendChild(label);
        item.appendChild(deleteBtn);
        list.appendChild(item);
    });
}

function updateCharts() {
    const expensesByCategory = getExpensesByCategory();

    expenseChart.data.labels = Object.keys(expensesByCategory);
    expenseChart.data.datasets[0].data = Object.values(expensesByCategory);
    expenseChart.update();
}

function updateInsights(income, savings) {
    let text = 'Good job managing your finances!';
    const totalExpense = getTotalExpense();
    const savingsRatio = income > 0 ? (savings / income) * 100 : 0;
    const expensesByCategory = getExpensesByCategory();

    let topCategory = null;
    let topCategoryValue = 0;
    Object.keys(expensesByCategory).forEach((category) => {
        const value = expensesByCategory[category];
        if (value > topCategoryValue) {
            topCategoryValue = value;
            topCategory = category;
        }
    });

    if (income <= 0) {
        text = 'Add income and expenses to get insights.';
    } else if (savings < 0) {
        text = '🚨 Critical cash-flow warning: You are spending above income. Pause discretionary spends and rebalance immediately.';
    } else if (state.budget > 0 && totalExpense > state.budget) {
        text = '⚠️ Budget breached this month. Reduce variable costs and set strict category caps for the next 2 weeks.';
    } else {
        if (savingsRatio < 20) {
            text = '⚠️ Moderate warning: Savings are below 20%. Improve by trimming recurring expenses and automating savings first.';
        } else if (savingsRatio > 40) {
            text = '🚀 Excellent savings discipline. Consider long-term allocation across index funds, retirement accounts, and goal-based investments.';
        } else {
            text = '✅ Healthy balance. Continue SIP contributions and keep a 6-month emergency reserve on track.';
        }

        if (topCategory && income > 0) {
            const concentration = (topCategoryValue / income) * 100;
            if (concentration > 25) {
                text += ` Major spend concentration detected in ${topCategory}. Consider optimizing this category for faster wealth growth.`;
            }
        }
    }

    document.getElementById('insightText').innerText = text;
}

function updateBudgetWarning(totalExpense) {
    const warning = document.getElementById('budgetWarning');

    if (state.budget <= 0) {
        warning.innerText = 'Set a monthly budget to track spending limits.';
        return;
    }

    if (totalExpense > state.budget) {
        warning.innerText = `⚠️ Budget exceeded by ₹${totalExpense - state.budget}`;
        return;
    }

    warning.innerText = `✅ Within budget. Remaining: ₹${state.budget - totalExpense}`;
}

function updateDashboard() {
    const totalExpense = getTotalExpense();
    const savings = state.income - totalExpense;

    document.getElementById('incomeValue').innerText = `₹${state.income.toLocaleString()}`;
    document.getElementById('expenseValue').innerText = `₹${totalExpense.toLocaleString()}`;
    document.getElementById('savingsValue').innerText = `₹${savings.toLocaleString()}`;

    summaryChart.data.datasets[0].data = [state.income, totalExpense, savings];
    summaryChart.update();

    updateInsights(state.income, savings);
    updateBudgetWarning(totalExpense);
    updateSavingsGoal(state.income, savings);
    updateFinancialHealthScore(state.income, totalExpense, savings);
}

function updateSavingsGoal(income, savings) {
    const progressEl = document.getElementById('savingsGoalProgress');
    const textEl = document.getElementById('savingsGoalText');

    if (income <= 0) {
        progressEl.style.width = '0%';
        textEl.innerText = 'Add income to track your goal progress.';
        return;
    }

    const savingsRatio = (savings / income) * 100;
    const progress = Math.max(0, Math.min(100, (savingsRatio / SAVINGS_GOAL_RATIO) * 100));
    progressEl.style.width = `${progress}%`;

    if (savingsRatio < 0) {
        textEl.innerText = `Goal status: 0% complete. Savings ratio is ${savingsRatio.toFixed(1)}%.`;
    } else {
        textEl.innerText = `Goal status: ${progress.toFixed(0)}% complete (${savingsRatio.toFixed(1)}% saved).`;
    }
}

function calculateHealthScore(income, totalExpense, savings) {
    if (income <= 0) return 0;

    const savingsRatio = (savings / income) * 100;
    const budgetScore = state.budget > 0
        ? (totalExpense <= state.budget ? 100 : Math.max(0, 100 - ((totalExpense - state.budget) / state.budget) * 120))
        : 65;
    const stabilityScore = Math.max(0, Math.min(100, (1 - Math.abs(totalExpense - income) / Math.max(income, 1)) * 100));
    const savingsScore = Math.max(0, Math.min(100, (savingsRatio + 20) * 1.7));

    const weighted = (savingsScore * 0.5) + (budgetScore * 0.3) + (stabilityScore * 0.2);
    return Math.max(0, Math.min(100, Math.round(weighted)));
}

function updateFinancialHealthScore(income, totalExpense, savings) {
    const score = calculateHealthScore(income, totalExpense, savings);
    const scoreValue = document.getElementById('healthScoreValue');
    const ring = document.getElementById('healthRing');
    const label = document.getElementById('healthScoreLabel');

    scoreValue.innerText = String(score);
    ring.style.setProperty('--score-angle', `${(score / 100) * 360}deg`);

    if (score < 40) {
        label.innerText = 'Needs urgent attention: reduce burn and rebuild savings.';
    } else if (score < 70) {
        label.innerText = 'Stable but improvable: optimize spending to boost resilience.';
    } else {
        label.innerText = 'Strong health: you are in a good position for long-term investing.';
    }
}

function renderExpenseBreakdown() {
    const container = document.getElementById('expenseBreakdown');
    const expensesByCategory = getExpensesByCategory();
    const totalExpense = getTotalExpense();
    container.innerHTML = '';

    if (totalExpense <= 0) {
        const empty = document.createElement('p');
        empty.className = 'empty-state';
        empty.innerText = 'Add expenses to view category percentage split.';
        container.appendChild(empty);
        return;
    }

    Object.keys(expensesByCategory).forEach((category) => {
        const value = expensesByCategory[category];
        const percentage = (value / totalExpense) * 100;

        const row = document.createElement('div');
        row.className = 'breakdown-row';

        const label = document.createElement('span');
        label.className = 'breakdown-label';
        label.innerText = category;

        const track = document.createElement('div');
        track.className = 'breakdown-track';
        const fill = document.createElement('div');
        fill.className = 'breakdown-fill';
        fill.style.width = `${percentage.toFixed(1)}%`;
        track.appendChild(fill);

        const percent = document.createElement('span');
        percent.className = 'breakdown-value';
        percent.innerText = `${percentage.toFixed(1)}%`;

        row.appendChild(label);
        row.appendChild(track);
        row.appendChild(percent);
        container.appendChild(row);
    });
}

// === YOUR EXISTING MAIN FUNCTIONS (UNCHANGED) ===
function renderAll() {
    updateCharts();
    updateDashboard();
    renderExpenseList();
    renderExpenseBreakdown();
    renderTransactions();
    renderGoals();
}

function addIncome() {
    const input = document.getElementById('incomeInput');
    const value = Number(input.value);
    if (value <= 0) return;

    state.income += value;
    input.value = '';

    saveState();
    renderAll();
}

function addExpense() {
    const category = document.getElementById('category').value;
    const input = document.getElementById('expenseInput');
    const value = Number(input.value);
    if (value <= 0) return;

    state.expenseEntries.push({
        id: Date.now() + Math.floor(Math.random() * 1000),
        category,
        amount: value
    });

    input.value = '';

    saveState();
    renderAll();
}

function deleteExpense(id) {
    state.expenseEntries = state.expenseEntries.filter((expense) => expense.id !== id);
    saveState();
    renderAll();
}

function setBudget() {
    const input = document.getElementById('budgetInput');
    const value = Number(input.value);
    if (value < 0) return;

    state.budget = value;
    saveState();
    renderAll();
}

function resetDashboard() {
    const shouldReset = window.confirm('Reset all income, expenses, budget, and insights?');
    if (!shouldReset) return;

    state = getDefaultState();
    state.theme = document.body.classList.contains('dark') ? 'dark' : 'light';

    document.getElementById('incomeInput').value = '';
    document.getElementById('expenseInput').value = '';
    document.getElementById('budgetInput').value = '';

    saveState();
    renderAll();
}

// === YOUR EXISTING PDF REPORT (ENHANCED) ===
function formatDateForFileName(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function downloadReport() {
    if (!window.jspdf || !window.jspdf.jsPDF) {
        alert('PDF library not loaded. Please refresh and try again.');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const now = new Date();
    const reportDate = now.toLocaleDateString();
    const fileDate = formatDateForFileName(now);

    const income = state.income;
    const totalExpense = getTotalExpense();
    const savings = income - totalExpense;
    const healthScore = calculateHealthScore(income, totalExpense, savings);
    const expensesByCategory = getExpensesByCategory();

    let y = 18;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Personal Finance Report', 14, y);
    y += 12;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(`Generated: ${reportDate}`, 14, y); y += 10;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('📊 Summary', 14, y); y += 10;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(`Income: ₹${income.toLocaleString()}`, 14, y); y += 7;
    doc.text(`Expenses: ₹${totalExpense.toLocaleString()}`, 14, y); y += 7;
    doc.text(`Savings: ₹${savings.toLocaleString()}`, 14, y); y += 7;
    doc.text(`Health Score: ${healthScore}/100`, 14, y); y += 15;

    doc.setFont('helvetica', 'bold');
    doc.text('📈 Expenses by Category', 14, y); y += 10;

    doc.setFont('helvetica', 'normal');
    Object.entries(expensesByCategory).forEach(([cat, amt]) => {
        if (y > 270) { doc.addPage(); y = 18; }
        doc.text(`${cat}: ₹${amt.toLocaleString()}`, 14, y);
        y += 7;
    });

    doc.save(`Finance_Report_${fileDate}.pdf`);
}

// === THEME FUNCTIONS (UNCHANGED) ===
function applyTheme() {
    if (state.theme === 'dark') {
        document.body.classList.add('dark');
    } else {
        document.body.classList.remove('dark');
    }

    const btn = document.querySelector('.theme-toggle');
    btn.innerText = document.body.classList.contains('dark') ? '☀️ Light Mode' : '🌙 Dark Mode';
}

function toggleTheme() {
    document.body.classList.toggle('dark');
    state.theme = document.body.classList.contains('dark') ? 'dark' : 'light';
    saveState();
    applyTheme();
}

// === MODAL FUNCTIONS ===
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

function saveTransaction() {
    const id = document.getElementById('transactionModal').dataset.editingId;
    const date = document.getElementById('transactionDate').value;
    const category = document.getElementById('transactionCategory').value;
    const amount = Number(document.getElementById('transactionAmount').value);
    const type = document.getElementById('transactionType').value;
    const notes = document.getElementById('transactionNotes').value;

    if (amount <= 0 || !category) return alert('Please fill all fields');

    if (id) {
        // Update existing
        const transaction = state.transactions.find(t => t.id == id);
        if (transaction) {
            if (transaction.type === 'income') state.income -= transaction.amount;
            else state.expenseEntries = state.expenseEntries.filter(e => e.id !== transaction.id);
            
            state.income += type === 'income' ? amount : 0;
            if (type === 'expense') {
                state.expenseEntries.push({ id: transaction.id, category, amount });
            }
            Object.assign(transaction, { date, category, amount, type, notes });
        }
    } else {
        addTransaction(type, amount, category, date, notes);
    }

    closeTransactionModal();
    renderAll();
}

// === EVENT LISTENERS ===
document.addEventListener('DOMContentLoaded', function() {
    // Search and filter
    document.getElementById('searchTransactions')?.addEventListener('input', renderTransactions);
    document.getElementById('filterCategory')?.addEventListener('change', renderTransactions);
    
    // Close modals on outside click
    window.onclick = function(event) {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    }
});

// === INITIALIZATION ===
function initializeApp() {
    loadState();
    initializeCharts();
    document.getElementById('budgetInput').value = state.budget || '';
    applyTheme();
    renderAll();
    
    // Populate category dropdowns
    const selects = document.querySelectorAll('#transactionCategory, #category');
    selects.forEach(select => {
        select.innerHTML = `
            <option>Food</option><option>Rent</option><option>Travel</option><option>Shopping</option><option>Others</option>
            <option>Utilities</option><option>Groceries</option><option>Transport</option><option>Entertainment</option>
            <option>Healthcare</option><option>Education</option><option>Debt</option><option>Insurance</option>
            <option>Subscriptions</option><option>Gifts</option><option>Maintenance</option>
        `;
    });
}

// === MONTHLY RESET ===
function monthlyReset() {
    if (!confirm('Reset all transactions for this month?')) return;
    
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    
    state.transactions = state.transactions.filter(t => new Date(t.date) > monthAgo);
    state.expenseEntries = [];
    state.lastReset = new Date().toISOString();
    
    saveState();
    renderAll();
}

// Start the app
initializeApp();
