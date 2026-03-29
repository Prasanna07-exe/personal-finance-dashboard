let expenseChart, summaryChart, forecastChart, budgetChart, networthChart, weekdayChart;

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
                }
            }
        });
    }

    const ctxForecast = document.getElementById('forecastChart');
    if (ctxForecast) {
        forecastChart = new Chart(ctxForecast, {
            type: 'line',
            data: { labels: ['This Month', 'Next Month', 'Month 3'], datasets: [{ label: 'Cashflow', data: [0, 0, 0], borderColor: '#4f7cff', backgroundColor: 'rgba(79, 124, 255, 0.1)', fill: true, tension: 0.4 }] },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    const ctxWeekday = document.getElementById('weekdayChart');
    if (ctxWeekday) {
        weekdayChart = new Chart(ctxWeekday, {
            type: 'bar',
            data: {
                labels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
                datasets: [{
                    label: 'Expense',
                    data: [0, 0, 0, 0, 0, 0, 0],
                    backgroundColor: '#f97316',
                    borderRadius: 6,
                    barPercentage: 0.5,
                    categoryPercentage: 0.6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
            }
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
    const inc = getCalculatedIncome(); const exp = getTotalExpense();
    summaryChart.data.datasets[0].data = [inc, exp, inc - exp]; summaryChart.update();
}

function updateExpenseChart() {
    const map = getExpensesByCategory();
    expenseChart.data.labels = Object.keys(map);
    expenseChart.data.datasets[0].data = Object.values(map); expenseChart.update();
}

function updateForecastChart() {
    const inc = getCalculatedIncome(); const exp = getTotalExpense();
    forecastChart.data.datasets[0].data = [inc - exp, inc - (exp * 1.05), inc - (exp * 1.10)];
    forecastChart.update('none');
}

function updateBudgetChart() {
    const exp = getTotalExpense();
    const within = state.budget > 0 ? Math.max(0, state.budget - exp) : 100;
    const over = Math.max(0, exp - state.budget);
    budgetChart.data.datasets[0].data = [within, over]; budgetChart.update('none');
}

function updateWeekdayChart() {
    if (!weekdayChart) return;
    const totals = typeof getExpensesByWeekday === 'function' ? getExpensesByWeekday() : [0,0,0,0,0,0,0];
    weekdayChart.data.datasets[0].data = totals;
    weekdayChart.update('none');
}

function updateNetWorthChart() {
    if (!networthChart || !state.netWorthHistory || state.netWorthHistory.length === 0) return;
    networthChart.data.labels = state.netWorthHistory.map(h => new Date(h.date).toLocaleDateString('short'));
    networthChart.data.datasets[0].data = state.netWorthHistory.map(h => h.value);
    networthChart.update();
}
