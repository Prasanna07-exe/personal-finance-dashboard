function showEMICalculator() {
    closeQuickTools();
    const p = Number(prompt("Enter Loan Amount (₹):", "100000"));
    const rateInput = Number(prompt("Enter Annual Interest Rate (%):", "10"));
    const n = Number(prompt("⏱Enter Loan Tenure (in months):", "12"));
    if (!isNaN(p) && !isNaN(rateInput) && !isNaN(n) && p > 0 && rateInput > 0 && n > 0) {
        const r = rateInput / 12 / 100;
        const emi = (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
        alert(`Calculated EMI: ₹${emi.toFixed(2)} per month\nTotal Amount Payable: ₹${(emi * n).toFixed(2)}`);
    } else { alert('Please enter valid positive numbers.'); }
}

function showCurrencyConverter() {
    closeQuickTools(); const amount = prompt("Enter Amount in USD to convert to INR ($):", "100");
    if (amount) alert(`$${amount} USD is approximately ₹${(Number(amount) * 83.12).toFixed(2)} INR`);
}

function showDebtPlanner() {
    closeQuickTools(); alert("Avalanche vs Snowball Planner:\n\nBased on optimal financial modeling, prioritize paying off the highest-interest debt first (Avalanche method) to save the most money over time.");
}

function exportCSV() {
    const transactions = getTransactions(); if (transactions.length === 0) return alert("No transactions to export.");
    const csv = [['Date', 'Category', 'Amount', 'Type', 'Notes'], ...transactions.map(t => [new Date(t.date).toLocaleDateString('en-IN'), t.category, t.amount, t.type, t.notes])].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `finance_transactions_${new Date().toISOString().split('T')[0]}.csv`; a.click();
}

function importCSV() {
    const input = document.createElement('input'); input.type = 'file'; input.accept = '.csv';
    input.onchange = (e) => {
        const file = e.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            e.target.result.split('\n').slice(1).forEach(line => {
                if (!line.trim()) return;
                const [date, category, amount, type, ...notes] = line.split(',').map(cell => cell.replace(/"/g, ''));
                if (amount && category) addTransaction(type.toLowerCase() === 'income' ? 'income' : 'expense', Number(amount), category, new Date().toISOString().split('T')[0], notes.join(','));
            });
        };
        reader.readAsText(file);
    };
    input.click();
}

function downloadReport() {
    if (!window.jspdf || !window.jspdf.jsPDF) return alert('PDF library not loaded. Please refresh and try again.');
    const doc = new window.jspdf.jsPDF(); let y = 18;
    function checkPageBreak(space = 10) { if (y + space > 280) { doc.addPage(); y = 18; } }

    doc.setFontSize(20); doc.setFont("helvetica", "bold"); doc.text('FinancePro Comprehensive Report', 14, y); y += 12;
    doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, y); y += 15;

    doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.text('Executive Summary', 14, y); y += 8;
    doc.setFontSize(11); doc.setFont("helvetica", "normal");
    const inc = getCalculatedIncome(); const exp = getTotalExpense();
    doc.text(`Total Income: ₹${inc.toLocaleString()}`, 14, y); y += 6;
    doc.text(`Total Expenses: ₹${exp.toLocaleString()}`, 14, y); y += 6;
    doc.text(`Net Savings: ₹${(inc - exp).toLocaleString()}`, 14, y); y += 12;

    checkPageBreak(30); doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.text('Wealth & Investments', 14, y); y += 8; doc.setFontSize(11); doc.setFont("helvetica", "normal");
    doc.text(`Current Net Worth: ₹${(state.netWorthHistory && state.netWorthHistory.length > 0) ? state.netWorthHistory[state.netWorthHistory.length - 1].value.toLocaleString() : 0}`, 14, y); y += 8;

    if (state.investments && state.investments.length > 0) {
        doc.setFont("helvetica", "bold"); doc.text('Portfolio:', 14, y); y += 6; doc.setFont("helvetica", "normal");
        state.investments.forEach(inv => { checkPageBreak(8); doc.text(`- ${inv.ticker}: ${inv.qty} units | Value: ₹${(inv.qty * inv.currentPrice).toLocaleString()}`, 14, y); y += 6; });
    } else { doc.text('No active investments.', 14, y); y += 6; } y += 6;

    checkPageBreak(30); doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.text('Transaction History (Latest 30)', 14, y); y += 8; doc.setFontSize(10); doc.setFont("helvetica", "normal");
    const txns = getTransactions().slice(0, 30);
    if (txns.length > 0) {
        doc.setFont("helvetica", "bold"); doc.text('Date', 14, y); doc.text('Category', 45, y); doc.text('Type', 90, y); doc.text('Amount', 130, y); doc.text('Notes', 165, y); y += 6; doc.setFont("helvetica", "normal");
        txns.forEach(t => { checkPageBreak(8); doc.text(new Date(t.date).toLocaleDateString('en-IN'), 14, y); doc.text(t.category.substring(0, 18), 45, y); doc.text(t.type, 90, y); doc.text(`₹${t.amount.toLocaleString()}`, 130, y); doc.text((t.notes || '-').substring(0, 20), 165, y); y += 6; });
    } else { doc.text('No transactions recorded.', 14, y); }
    doc.save(`FinancePro_Report_${new Date().toISOString().split('T')[0]}.pdf`);
}

// Add these functions to your js/tools.js file

function showFIRECalculator() {
    closeQuickTools();
    const currentAge = Number(prompt("Enter your current age:", "25"));
    const annualSpend = Number(prompt("What are your estimated annual expenses in retirement? (₹):", "600000"));
    const currentSaved = Number(prompt("How much have you already invested? (₹):", "100000"));
    const monthlyInvest = Number(prompt("How much can you invest monthly? (₹):", "20000"));

    if (currentAge > 0 && annualSpend > 0) {
        // Rule of 25 for FIRE target (assumes 4% safe withdrawal rate)
        const fireTarget = annualSpend * 25; 
        const marketReturn = 0.10; // 10% average market return
        let years = 0;
        let futureValue = currentSaved;

        // Calculate compounding years until target is reached
        while (futureValue < fireTarget && years < 60) {
            futureValue = (futureValue + (monthlyInvest * 12)) * (1 + marketReturn);
            years++;
        }

        const retirementAge = currentAge + years;
        alert(`🔥 FIRE Projection:\n\nTarget Retirement Corpus: ₹${fireTarget.toLocaleString()}\n\nAt your current investment rate, you will reach your goal in ${years} years (Age ${retirementAge}).`);
    } else {
        alert("Please enter valid numbers to calculate your FIRE number.");
    }
}

function showTaxEstimator() {
    closeQuickTools();
    const income = Number(prompt("Enter your total annual income (₹):", "1200000"));
    
    if (income > 0) {
        // Simplified estimate based on general brackets (Update logic for specific regional tax laws)
        let tax = 0;
        if (income <= 300000) {
            tax = 0;
        } else if (income <= 600000) {
            tax = (income - 300000) * 0.05;
        } else if (income <= 900000) {
            tax = 15000 + ((income - 600000) * 0.10);
        } else if (income <= 1200000) {
            tax = 45000 + ((income - 900000) * 0.15);
        } else if (income <= 1500000) {
            tax = 90000 + ((income - 1200000) * 0.20);
        } else {
            tax = 150000 + ((income - 1500000) * 0.30);
        }
        
        const effectiveRate = ((tax / income) * 100).toFixed(1);
        alert(`⚖️ Tax Estimate:\n\nEstimated Annual Tax: ₹${tax.toLocaleString()}\nEffective Tax Rate: ${effectiveRate}%\nTake-Home Pay: ₹${(income - tax).toLocaleString()}\n\n(Note: This is a simplified estimate assuming no deductions under a new regime).`);
    }
}
