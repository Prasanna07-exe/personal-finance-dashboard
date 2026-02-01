let income = 0;
let expenses = {};
let totalExpense = 0;

const expenseCtx = document.getElementById('expenseChart');
const summaryCtx = document.getElementById('summaryChart');

let expenseChart = new Chart(expenseCtx, {
    type: 'pie',
    data: {
        labels: [],
        datasets: [{
            data: [],
            backgroundColor: ['#f1c40f','#e67e22','#1abc9c','#9b59b6','#e74c3c']
        }]
    }
});

let summaryChart = new Chart(summaryCtx, {
    type: 'bar',
    data: {
        labels: ['Income', 'Expenses', 'Savings'],
        datasets: [{
            data: [0,0,0],
            backgroundColor: ['#2ecc71','#e74c3c','#3498db']
        }]
    }
});

function addIncome(){
    const value = Number(document.getElementById('incomeInput').value);
    if (value <= 0) return;
    income += value;
    updateDashboard();
}

function addExpense(){
    const category = document.getElementById('category').value;
    const value = Number(document.getElementById('expenseInput').value);
    if (value <= 0) return;

    expenses[category] = (expenses[category] || 0) + value;
    totalExpense += value;

    updateCharts();
    updateDashboard();
}

function updateDashboard(){
    const savings = income - totalExpense;

    document.getElementById('incomeValue').innerText = `₹${income}`;
    document.getElementById('expenseValue').innerText = `₹${totalExpense}`;
    document.getElementById('savingsValue').innerText = `₹${savings}`;

    summaryChart.data.datasets[0].data = [income, totalExpense, savings];
    summaryChart.update();

    updateInsights(savings);
}

function updateCharts(){
    expenseChart.data.labels = Object.keys(expenses);
    expenseChart.data.datasets[0].data = Object.values(expenses);
    expenseChart.update();
}

function updateInsights(savings){
    let text = "Good job managing your finances!";
    const ratio = (savings / income) * 100;

    if (ratio < 10) text = "⚠️ Reduce expenses to improve savings.";
    else if (ratio < 30) text = "✅ You can consider Mutual Funds or SIPs.";
    else text = "🚀 Strong savings! Explore stocks and long-term investments.";

    document.getElementById('insightText').innerText = text;
}
function toggleTheme(){
    document.body.classList.toggle("dark");

    const btn = document.querySelector(".theme-toggle");
    btn.innerText = document.body.classList.contains("dark")
        ? "☀️ Light Mode"
        : "🌙 Dark Mode";
}
