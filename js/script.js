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

function normalizeExpenseEntries(entries) {
    if (!Array.isArray(entries)) return [];

    return entries
        .map((entry, index) => ({
            id: Number(entry.id) || (Date.now() + index),
            category: String(entry.category || 'Others'),
            amount: Number(entry.amount) || 0
        }))
        .filter((entry) => entry.amount > 0);
}

function normalizeState(rawState) {
    return {
        income: Math.max(0, Number(rawState?.income) || 0),
        budget: Math.max(0, Number(rawState?.budget) || 0),
        expenseEntries: normalizeExpenseEntries(rawState?.expenseEntries),
        theme: rawState?.theme === 'dark' ? 'dark' : 'light'
    };
}

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

function getTotalExpense() {
    return state.expenseEntries.reduce((sum, item) => sum + Number(item.amount || 0), 0);
}

function getExpensesByCategory() {
    return state.expenseEntries.reduce((map, item) => {
        map[item.category] = (map[item.category] || 0) + Number(item.amount || 0);
        return map;
    }, {});
}

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

    document.getElementById('incomeValue').innerText = `₹${state.income}`;
    document.getElementById('expenseValue').innerText = `₹${totalExpense}`;
    document.getElementById('savingsValue').innerText = `₹${savings}`;

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

function formatDateForFileName(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function downloadReport() {
    if (!window.jspdf || !window.jspdf.jsPDF) {
        window.alert('PDF library not loaded. Please refresh and try again.');
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
    const savingsPercent = income > 0 ? (savings / income) * 100 : 0;
    const healthScore = calculateHealthScore(income, totalExpense, savings);
    const expensesByCategory = getExpensesByCategory();
    const insightText = document.getElementById('insightText').innerText;

    let y = 18;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Personal Finance Report', 14, y);

    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(`Generated on: ${reportDate}`, 14, y);

    y += 12;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Summary', 14, y);

    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(`Income: INR ${income.toFixed(2)}`, 14, y);
    y += 7;
    doc.text(`Total Expenses: INR ${totalExpense.toFixed(2)}`, 14, y);
    y += 7;
    doc.text(`Savings: INR ${savings.toFixed(2)}`, 14, y);
    y += 7;
    doc.text(`Savings %: ${savingsPercent.toFixed(2)}%`, 14, y);
    y += 7;
    doc.text(`Financial Health Score: ${healthScore}/100`, 14, y);

    y += 12;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Category Breakdown', 14, y);

    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);

    const categories = Object.keys(expensesByCategory);
    if (categories.length === 0) {
        doc.text('No expenses recorded.', 14, y);
        y += 7;
    } else {
        categories.forEach((category) => {
            const value = expensesByCategory[category];
            const percentage = totalExpense > 0 ? (value / totalExpense) * 100 : 0;

            if (y > 272) {
                doc.addPage();
                y = 18;
            }

            doc.text(`${category}: INR ${value.toFixed(2)} (${percentage.toFixed(2)}%)`, 14, y);
            y += 7;
        });
    }

    y += 6;
    if (y > 270) {
        doc.addPage();
        y = 18;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Investment Insight', 14, y);

    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);

    const wrappedInsight = doc.splitTextToSize(insightText, 180);
    doc.text(wrappedInsight, 14, y);

    doc.save(`Finance_Report_${fileDate}.pdf`);
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

function renderAll() {
    updateCharts();
    updateDashboard();
    renderExpenseList();
    renderExpenseBreakdown();
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

function applyTheme() {
    if (state.theme === 'dark') {
        document.body.classList.add('dark');
    } else {
        document.body.classList.remove('dark');
    }

    const btn = document.querySelector('.theme-toggle');
    btn.innerText = document.body.classList.contains('dark')
        ? '☀️ Light Mode'
        : '🌙 Dark Mode';
}

function toggleTheme() {
    document.body.classList.toggle('dark');
    state.theme = document.body.classList.contains('dark') ? 'dark' : 'light';
    saveState();
    applyTheme();
}

function initializeApp() {
    loadState();
    initializeCharts();
    document.getElementById('budgetInput').value = state.budget || '';
    applyTheme();
    renderAll();
}

initializeApp();
