/* ===========================
   PERSONAL FINANCE DASHBOARD V2
   Enhanced Version (Non-Breaking)
=========================== */

const STORAGE_KEY = 'personal_finance_dashboard_state';
const SAVINGS_GOAL_RATIO = 30;

function getDefaultState() {
    return {
        income: 0,
        budget: 0,
        expenseEntries: [],
        theme: 'light'
    };
}

let state = getDefaultState();

const expenseCtx = document.getElementById('expenseChart');
const summaryCtx = document.getElementById('summaryChart');

let expenseChart;
let summaryChart;

/* ===========================
   Utility Functions
=========================== */

function animateValue(element, start, end, duration = 500) {
    let startTime = null;

    function animation(currentTime) {
        if (!startTime) startTime = currentTime;
        const progress = Math.min((currentTime - startTime) / duration, 1);
        const value = Math.floor(progress * (end - start) + start);
        element.innerText = `₹${value}`;
        if (progress < 1) requestAnimationFrame(animation);
    }

    requestAnimationFrame(animation);
}

function getCurrentMonthKey() {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}`;
}

/* ===========================
   Charts
=========================== */

function initializeCharts() {
    expenseChart = new Chart(expenseCtx, {
        type: 'pie',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: ['#f1c40f', '#e67e22', '#1abc9c', '#9b59b6', '#e74c3c']
            }]
        }
    });

    summaryChart = new Chart(summaryCtx, {
        type: 'bar',
        data: {
            labels: ['Income', 'Expenses', 'Savings'],
            datasets: [{
                data: [0, 0, 0],
                backgroundColor: ['#2ecc71', '#e74c3c', '#3498db']
            }]
        }
    });
}

/* ===========================
   State Helpers
=========================== */

function loadState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
        state = JSON.parse(raw);
    } catch {
        state = getDefaultState();
    }
}

function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getTotalExpense() {
    return state.expenseEntries.reduce((sum, e) => sum + e.amount, 0);
}

function getExpensesByCategory() {
    return state.expenseEntries.reduce((map, e) => {
        map[e.category] = (map[e.category] || 0) + e.amount;
        return map;
    }, {});
}

/* ===========================
   Rendering
=========================== */

function renderExpenseList(filterText = '') {
    const list = document.getElementById('expenseList');
    list.innerHTML = '';

    let entries = [...state.expenseEntries];

    if (filterText) {
        entries = entries.filter(e =>
            e.category.toLowerCase().includes(filterText.toLowerCase())
        );
    }

    if (entries.length === 0) {
        const empty = document.createElement('li');
        empty.innerText = 'No matching expenses.';
        empty.className = 'empty-state';
        list.appendChild(empty);
        return;
    }

    entries.forEach(expense => {
        const item = document.createElement('li');
        item.className = 'expense-item';

        const label = document.createElement('span');
        label.className = 'expense-meta';
        label.innerText = `${expense.category} - ₹${expense.amount}`;

        const deleteBtn = document.createElement('button');
        deleteBtn.innerText = 'Delete';
        deleteBtn.className = 'delete-btn';
        deleteBtn.onclick = () => deleteExpense(expense.id);

        item.appendChild(label);
        item.appendChild(deleteBtn);
        list.appendChild(item);
    });
}

function updateCharts() {
    const data = getExpensesByCategory();
    expenseChart.data.labels = Object.keys(data);
    expenseChart.data.datasets[0].data = Object.values(data);
    expenseChart.update();
}

function updateDashboard() {
    const totalExpense = getTotalExpense();
    const savings = state.income - totalExpense;

    animateValue(document.getElementById('incomeValue'), 0, state.income);
    animateValue(document.getElementById('expenseValue'), 0, totalExpense);
    animateValue(document.getElementById('savingsValue'), 0, savings);

    summaryChart.data.datasets[0].data = [state.income, totalExpense, savings];
    summaryChart.update();

    updateInsights(state.income, savings);
    updateSavingsGoal(state.income, savings);
    updateBudgetWarning(totalExpense);
    updateFinancialHealthScore(state.income, totalExpense, savings);
}

/* ===========================
   Smart Insights v2
=========================== */

function updateInsights(income, savings) {
    const totalExpense = getTotalExpense();
    const savingsRatio = income > 0 ? (savings / income) * 100 : 0;

    let text = '';

    if (income === 0) {
        text = 'Add income to activate financial intelligence.';
    }
    else if (savings < 0) {
        text = '🚨 Negative savings detected. Immediate cost restructuring required.';
    }
    else if (savingsRatio < 15) {
        text = '⚠️ Low savings rate. Cut discretionary expenses and automate investments.';
    }
    else if (savingsRatio > 40) {
        text = '🚀 Strong capital accumulation. Consider diversified long-term investments.';
    }
    else {
        text = '✅ Balanced financial structure. Maintain expense discipline.';
    }

    document.getElementById('insightText').innerText = text;
}

/* ===========================
   CSV Export (NEW)
=========================== */

function exportCSV() {
    if (state.expenseEntries.length === 0) {
        alert('No transactions to export.');
        return;
    }

    let csv = 'Category,Amount,Date\n';

    state.expenseEntries.forEach(e => {
        csv += `${e.category},${e.amount},${e.date || ''}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'finance_data.csv';
    link.click();
}

/* ===========================
   Actions
=========================== */

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
        id: Date.now(),
        category,
        amount: value,
        date: new Date().toISOString(),
        monthKey: getCurrentMonthKey()
    });

    input.value = '';
    saveState();
    renderAll();
}

function deleteExpense(id) {
    state.expenseEntries = state.expenseEntries.filter(e => e.id !== id);
    saveState();
    renderAll();
}

function setBudget() {
    const input = document.getElementById('budgetInput');
    const value = Number(input.value);
    state.budget = value >= 0 ? value : 0;
    saveState();
    renderAll();
}

function renderAll() {
    updateCharts();
    updateDashboard();
    renderExpenseList();
}

/* ===========================
   Theme
=========================== */

function applyTheme() {
    if (state.theme === 'dark') {
        document.body.classList.add('dark');
    } else {
        document.body.classList.remove('dark');
    }
}

function toggleTheme() {
    document.body.classList.toggle('dark');
    state.theme = document.body.classList.contains('dark') ? 'dark' : 'light';
    saveState();
}

/* ===========================
   Init
=========================== */

function initializeApp() {
    loadState();
    initializeCharts();
    applyTheme();
    renderAll();
}

initializeApp();
