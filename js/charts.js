let expenseChart, summaryChart, forecastChart, budgetChart, networthChart;

function drillDownToTransactionsCategory(category) {
    if (!category) return;

    if (typeof switchView === 'function') switchView('transactions-view');

    // Let view switch settle, then apply transaction filter.
    setTimeout(() => {
        const searchBox = document.getElementById('searchTransactions');
        if (searchBox) searchBox.value = '';

        if (typeof updateFilterCategories === 'function') updateFilterCategories();
        const categoryFilter = document.getElementById('filterCategory');

        let categoryApplied = false;
        if (categoryFilter) {
            const optionExists = Array.from(categoryFilter.options).some((opt) => opt.value === category);
            if (optionExists) {
                categoryFilter.value = category;
                categoryApplied = true;
            }
        }

        // Fallback: search by text if exact option match is not ready.
        if (!categoryApplied && searchBox) {
            searchBox.value = category;
        }

        if (typeof renderTransactions === 'function') renderTransactions();
    }, 30);
}

function bindExpenseChartDrilldown(chart) {
    if (!chart || chart.__drilldownBound) return;
    chart.__drilldownBound = true;

    const canvas = chart.canvas;
    if (!canvas) return;

    const handlePointer = (event) => {
        const points = chart.getElementsAtEventForMode(event, 'nearest', { intersect: false }, true);
        if (!points || points.length === 0) return;

        const index = points[0].index;
        const category = chart?.data?.labels?.[index];
        drillDownToTransactionsCategory(category);
    };

    canvas.addEventListener('click', handlePointer);
    canvas.addEventListener('touchend', handlePointer, { passive: true });
}

function initializeCharts() {
    Chart.defaults.color = 'rgba(148, 163, 184, 0.8)';
    Chart.defaults.font.family = '"Segoe UI", system-ui, sans-serif';

    const ctxSummary = document.getElementById('summaryChart');
    if (ctxSummary) {
        summaryChart = new Chart(ctxSummary, {
            type: 'bar',
            data: { labels: ['Income', 'Expenses', 'Savings'], datasets: [{ data: [0, 0, 0], backgroundColor: ['#2ecc71', '#e74c3c', '#3498db'], borderRadius: 6, barPercentage: 0.4, categoryPercentage: 0.5 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    }

    const ctxExpense = document.getElementById('expenseChart');
    if (ctxExpense) {
        expenseChart = new Chart(ctxExpense, {
            type: 'pie',
            data: { labels: [], datasets: [{ data: [], backgroundColor: ['#f1c40f', '#e67e22', '#1abc9c', '#9b59b6', '#e74c3c', '#34495e', '#8e44ad'] }] },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                const value = context.parsed || 0;
                                const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                                const percent = total ? ((value / total) * 100).toFixed(1) : 0;
                                return `${context.label || ''}: ₹${value.toLocaleString()} (${percent}%)`;
                            }
                        }
                    }
                },
                onClick: function (_event, elements, chart) {
                    if (!elements || elements.length === 0) return;

                    const index = elements[0].index;
                    const category = chart?.data?.labels?.[index];
                    drillDownToTransactionsCategory(category);
                }
            }
        });

        bindExpenseChartDrilldown(expenseChart);
    }

    const ctxForecast = document.getElementById('forecastChart');
    if (ctxForecast) {
        forecastChart = new Chart(ctxForecast, {
            type: 'line',
            data: { labels: ['This Month', 'Next Month', 'Month 3'], datasets: [{ label: 'Cashflow', data: [0, 0, 0], borderColor: '#4f7cff', backgroundColor: 'rgba(79, 124, 255, 0.1)', fill: true, tension: 0.4 }] },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    const ctxBudget = document.getElementById('budgetChart');
    if (ctxBudget) {
        budgetChart = new Chart(ctxBudget, {
            type: 'doughnut',
            data: {
                labels: ['Spent', 'Remaining', 'Over Budget'],
                datasets: [{ data: [50, 50, 0], backgroundColor: ['#3b82f6', '#22c55e', '#ef4444'], borderWidth: 0 }]
            },
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
    const inc = getCalculatedIncome(); const exp = getTotalExpense();
    summaryChart.data.datasets[0].data = [inc, exp, inc - exp]; summaryChart.update();
}

function updateExpenseChart() {
    const map = getExpensesByCategory();
    expenseChart.data.labels = Object.keys(map);
    expenseChart.data.datasets[0].data = Object.values(map); expenseChart.update();
}

function getRecentMonthlyCashflows(limit = 6) {
    if (!Array.isArray(state.transactions) || state.transactions.length === 0) return [];

    const monthMap = new Map();
    state.transactions.forEach((t) => {
        const amount = Number(t.amount || 0);
        const date = new Date(t.date);
        if (!Number.isFinite(amount) || Number.isNaN(date.getTime())) return;

        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!monthMap.has(key)) monthMap.set(key, { income: 0, expense: 0 });

        const bucket = monthMap.get(key);
        if (t.type === 'income') bucket.income += amount;
        else if (t.type === 'expense') bucket.expense += amount;
    });

    return [...monthMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-limit)
        .map(([, value]) => value.income - value.expense);
}

function updateForecastChart() {
    if (!forecastChart) return;

    const recentCashflows = getRecentMonthlyCashflows(6);

    if (recentCashflows.length === 0) {
        const base = getCalculatedIncome() - getTotalExpense();
        forecastChart.data.datasets[0].data = [
            base,
            base * 0.96,
            base * 1.02
        ];
        forecastChart.update('none');
        return;
    }

    const last = recentCashflows[recentCashflows.length - 1];
    const avg = recentCashflows.reduce((sum, value) => sum + value, 0) / recentCashflows.length;
    const momentum = recentCashflows.length > 1
        ? (recentCashflows[recentCashflows.length - 1] - recentCashflows[0]) / (recentCashflows.length - 1)
        : 0;
    const variance = recentCashflows.reduce((sum, value) => sum + Math.pow(value - avg, 2), 0) / recentCashflows.length;
    const volatility = Math.sqrt(variance);

    const seasonalAmplitude = Math.max(volatility * 0.35, Math.abs(avg) * 0.03);
    const projectMonth = (step) => {
        const trend = last + (momentum * step);
        const curve = momentum * 0.25 * (step * step);
        const seasonal = seasonalAmplitude * Math.sin((recentCashflows.length + step) * 1.15);
        const meanReversion = (avg - last) * (0.12 * step);
        return Math.round((trend + curve + seasonal + meanReversion) * 100) / 100;
    };

    forecastChart.data.datasets[0].data = [
        Math.round(last * 100) / 100,
        projectMonth(1),
        projectMonth(2)
    ];
    forecastChart.update('none');
}

function updateBudgetChart() {
    if (!budgetChart) return;
    const exp = getTotalExpense();
    if (state.budget > 0) {
        const spent = Math.min(exp, state.budget);
        const remaining = Math.max(0, state.budget - exp);
        const over = Math.max(0, exp - state.budget);
        budgetChart.data.datasets[0].data = [spent, remaining, over];
    } else {
        // Fallback when budget is not set: show expenses only with a minimal remainder ring.
        const spent = Math.max(exp, 1);
        budgetChart.data.datasets[0].data = [spent, Math.max(spent * 0.15, 1), 0];
    }
    budgetChart.update('none');
}

function updateNetWorthChart() {
    if (!networthChart || !state.netWorthHistory || state.netWorthHistory.length === 0) return;
    networthChart.data.labels = state.netWorthHistory.map(h => new Date(h.date).toLocaleDateString('short'));
    networthChart.data.datasets[0].data = state.netWorthHistory.map(h => h.value);
    networthChart.update();
}
