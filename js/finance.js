// ==========================================
// 1. CORE BANKING LOGIC
// ==========================================

state.accounts = state.accounts || [];

function saveAccount() {
    const bankName = document.getElementById('accBankName').value;
    const holder = document.getElementById('accHolderName').value;
    const accNumber = document.getElementById('accNumber').value;
    const type = document.getElementById('accType').value;
    const ownership = document.getElementById('accOwnership').value;
    const balance = parseFloat(document.getElementById('accInitialBalance').value) || 0;

    if (!bankName || !accNumber) return alert("Bank Name and Account Number are required.");

    state.accounts.push({
        id: 'acc_' + Date.now(),
        bankName, holder, accNumber, type, ownership, balance
    });

    saveState(); closeAccountModal(); renderAccounts(); updateAccountDropdowns(); syncDashboard();
}

function renderAccounts() {
    const grid = document.getElementById('accountsGrid');
    if (!grid) return;
    grid.innerHTML = '';
    let totalLiquid = 0;

    state.accounts.forEach(acc => {
        if (acc.type !== 'Loan') totalLiquid += acc.balance;
        const isDebt = acc.type === 'Loan' || acc.balance < 0;
        const color = isDebt ? '#ef4444' : '#10b981';

        // CONDITIONAL BUTTONS: Repay for Loans, Deposit/Withdraw for Banks
        let buttonsHtml = '';
        if (acc.type === 'Loan') {
            // Updated to match the dark theme (#111 background, #333 border)
            buttonsHtml = `<button onclick="showRepayModal('${acc.id}')" class="btn-sm" style="flex: 1; padding: 6px; font-size: 0.8rem; background: #111 !important; border-color: #333 !important; color: white;">🔄 Repay Loan</button>`;
        } else {
            buttonsHtml = `
                <button onclick="quickDeposit('${acc.id}')" class="btn-sm" style="flex: 1; padding: 6px; font-size: 0.8rem; background: #111 !important; border-color: #333 !important; color: white;">⬇️ Deposit</button>
                <button onclick="quickWithdraw('${acc.id}')" class="btn-sm" style="flex: 1; padding: 6px; font-size: 0.8rem; background: #111 !important; border-color: #333 !important; color: white;">⬆️ Withdraw</button>
            `;
        }

        grid.innerHTML += `
            <div class="goal-card">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <h3 style="color: white; margin-bottom: 4px;">${acc.bankName}</h3>
                        <p style="font-size: 0.8rem; color: var(--text-muted);">${acc.type} • ${acc.ownership}</p>
                        <p style="font-size: 0.8rem; color: var(--text-muted);">${acc.holder} | ****${acc.accNumber}</p>
                    </div>
                    <div style="text-align: right;">
                        <h2 style="color: ${color};">₹${acc.balance.toLocaleString()}</h2>
                    </div>
                </div>
                <div style="margin-top: 16px; display: flex; gap: 8px;">
                    ${buttonsHtml}
                </div>
            </div>`;
    });

    const totalEl = document.getElementById('totalAccountsBalance');
    if (totalEl) totalEl.innerText = `₹${totalLiquid.toLocaleString()}`;
}

function updateAccountDropdowns() {
    const dropdowns = document.querySelectorAll('.account-dropdown, #transferFrom, #transferTo');
    dropdowns.forEach(select => {
        const currentVal = select.value;
        select.innerHTML = '<option value="">-- Select Bank Account --</option>';
        state.accounts.forEach(acc => {
            select.innerHTML += `<option value="${acc.id}">${acc.bankName} (****${acc.accNumber}) - ₹${acc.balance}</option>`;
        });
        select.value = currentVal;
    });
}

function executeTransfer() {
    const fromId = document.getElementById('transferFrom').value;
    const toId = document.getElementById('transferTo').value;
    const amount = parseFloat(document.getElementById('transferAmount').value);
    const notes = document.getElementById('transferNotes').value || 'Bank Transfer';

    if (!fromId || !toId || !amount || fromId === toId) return alert("Invalid transfer details.");

    const accFrom = state.accounts.find(a => a.id === fromId);
    const accTo = state.accounts.find(a => a.id === toId);

    if (!accFrom || !accTo) return alert("One or both selected accounts no longer exist. Please refresh account selections.");

    if (accFrom.balance < amount && accFrom.type !== 'Loan' && !confirm("Overdraw account?")) return;

    accFrom.balance -= amount;
    accTo.balance += amount;

    state.transactions.unshift({
        id: Date.now().toString(), date: new Date().toISOString().split('T')[0],
        category: 'Transfer', amount: amount, type: 'transfer',
        accountId: fromId, toAccountId: toId, notes: notes
    });

    saveState(); closeTransferModal(); renderAll(); syncDashboard();
}

function quickDeposit(id) {
    const amount = Number(prompt("Enter amount to deposit (₹):"));
    if (!amount || amount <= 0) return;
    addTransaction('income', amount, 'Deposit', new Date().toISOString().split('T')[0], 'Quick Deposit', id);
}

function quickWithdraw(id) {
    const amount = Number(prompt("Enter amount to withdraw (₹):"));
    if (!amount || amount <= 0) return;
    addTransaction('expense', amount, 'Withdrawal', new Date().toISOString().split('T')[0], 'Quick Withdrawal', id);
}

// --- LOAN REPAYMENT ENGINE ---

function showRepayModal(loanId) {
    const loanAcc = state.accounts.find(a => a.id === loanId);
    if (!loanAcc) return;

    document.getElementById('repayLoanId').value = loanId;
    document.getElementById('repayLoanTitle').innerText = `Repay: ${loanAcc.bankName}`;
    document.getElementById('repayLoanDetails').innerText = `Current Debt: ₹${Math.abs(loanAcc.balance).toLocaleString()}`;
    document.getElementById('repayAmount').value = '';

    // Populate source accounts (Hide loans from this dropdown)
    const sourceSelect = document.getElementById('repaySourceAccount');
    sourceSelect.innerHTML = '<option value="">-- Select Source Bank Account --</option>';
    state.accounts.forEach(acc => {
        if (acc.type !== 'Loan') {
            sourceSelect.innerHTML += `<option value="${acc.id}">${acc.bankName} (****${acc.accNumber}) - ₹${acc.balance}</option>`;
        }
    });

    document.getElementById('repayLoanModal').style.display = 'block';
}

function closeRepayModal() { document.getElementById('repayLoanModal').style.display = 'none'; }

function executeLoanRepayment() {
    const loanAccId = document.getElementById('repayLoanId').value;
    const sourceAccId = document.getElementById('repaySourceAccount').value;
    const amount = Number(document.getElementById('repayAmount').value);

    if (!sourceAccId) return alert('❌ Please select a source bank account to pay from.');
    if (amount <= 0 || isNaN(amount)) return alert('Enter a valid repayment amount.');

    const sourceAcc = state.accounts.find(a => a.id === sourceAccId);
    const loanAcc = state.accounts.find(a => a.id === loanAccId);

    if (!sourceAcc || !loanAcc) return alert('Account error.');
    if (sourceAcc.balance < amount && sourceAcc.type !== 'Loan' && !confirm(`Insufficient funds in ${sourceAcc.bankName}. Overdraw?`)) return;

    // 1. Math: Add to loan account (bringing negative balance closer to 0)
    // NOTE: We do not manually deduct from sourceAcc here, because addTransaction() will do it for us!
    loanAcc.balance += amount; 

    // 2. Sync: Find the linked loan in the Net Worth Tracker and update it
    if (state.customLoans) {
        const linkedLoan = state.customLoans.find(l => l.accountId === loanAccId);
        if (linkedLoan) {
            linkedLoan.finalAmount -= amount;
            
            // 3. Auto-Clear the loan if it is fully paid off!
            if (linkedLoan.finalAmount <= 0) {
                state.customLoans = state.customLoans.filter(l => l.id !== linkedLoan.id);
                state.accounts = state.accounts.filter(a => a.id !== loanAccId); // Remove the bank card too
                setTimeout(() => alert(`🎉 Congratulations! You have fully paid off your ${loanAcc.bankName} loan!`), 100);
                if (typeof confetti !== 'undefined') confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
            }
        }
    }

    // 4. Log as Expense (This automatically deducts money from sourceAcc inside the function!)
    addTransaction('expense', amount, 'Loan Repayment', new Date().toISOString().split('T')[0], `Paid down ${loanAcc.bankName} loan`, sourceAccId);

    closeRepayModal();
    saveState();
    
    // Force everything to redraw
    renderAccounts();
    if (typeof renderLoans === 'function') renderLoans();
    syncDashboard();
}

// Global Sync Wrapper
window.syncDashboard = function () {
    if (typeof window.updateDashboard === 'function') {
        window.updateDashboard();
    }
};

// ==========================================
// 2. TRANSACTIONS LOGIC (WITH STRICT CHECKS)
// ==========================================

function addTransaction(type = 'expense', amount = 0, category = 'Others', date = new Date().toISOString().split('T')[0], notes = '', accountId = '') {
    const val = Number(amount); if (val <= 0) return;

    // 1. Log the transaction
    state.transactions.unshift({ id: Date.now().toString(), date, category, amount: val, type, notes, accountId });

    // 2. Apply math to the linked Bank Account
    if (accountId) {
        const acc = state.accounts.find(a => a.id === accountId);
        if (acc) {
            if (type === 'income') acc.balance += val;
            else if (type === 'expense') acc.balance -= val;
        }
    }

    saveState(); renderAll(); syncDashboard();
    if (typeof detectSpendingAnomalies === 'function') detectSpendingAnomalies();
}

function addIncome() {
    const input = document.getElementById('incomeInput');
    const accountId = document.getElementById('incomeAccount')?.value;

    // STRICT CHECK: Ensure a bank account is selected!
    if (!accountId) return setInlineError('incomeError', '❌ Please select a Bank Account first.');
    if (!input || !input.value || isNaN(Number(input.value)) || Number(input.value) <= 0) {
        return setInlineError('incomeError', 'Enter a positive income amount.');
    }

    setInlineError('incomeError', '');
    addTransaction('income', Number(input.value), 'Salary', new Date().toISOString().split('T')[0], 'Direct Entry', accountId);
    input.value = '';
}

function addExpense() {
    const categoryEl = document.getElementById('category');
    const input = document.getElementById('expenseInput');
    const accountId = document.getElementById('expenseAccount')?.value;

    // STRICT CHECK: Ensure a bank account is selected!
    if (!accountId) return setInlineError('expenseError', '❌ Please select a Bank Account first.');
    if (!input || !input.value || isNaN(Number(input.value)) || Number(input.value) <= 0) {
        return setInlineError('expenseError', 'Enter a positive expense amount.');
    }

    setInlineError('expenseError', '');
    addTransaction('expense', Number(input.value), categoryEl.value, new Date().toISOString().split('T')[0], 'Direct Entry', accountId);
    input.value = '';
}

function deleteTransaction(id) {
    if (!confirm('Delete this transaction and reverse its impact on your bank balance?')) return;

    const t = state.transactions.find(tx => tx.id === id.toString());

    // Reverse Bank Math
    if (t && t.accountId) {
        const acc = state.accounts.find(a => a.id === t.accountId);
        if (acc) {
            if (t.type === 'income') acc.balance -= t.amount;
            else if (t.type === 'expense') acc.balance += t.amount;
        }
    }
    // Reverse Transfer Math
    if (t && t.type === 'transfer' && t.toAccountId) {
        const accTo = state.accounts.find(a => a.id === t.toAccountId);
        if (accTo) accTo.balance -= t.amount;
        const accFrom = state.accounts.find(a => a.id === t.accountId);
        if (accFrom) accFrom.balance += t.amount;
    }

    state.transactions = state.transactions.filter(tx => tx.id !== id.toString());
    saveState(); renderAll(); syncDashboard();
}

function renderTransactions() {
    const tbody = document.querySelector('#transactionsTable tbody'); if (!tbody) return;
    const searchTerm = document.getElementById('searchTransactions')?.value.toLowerCase() || '';
    const filterCat = document.getElementById('filterCategory')?.value || '';
    tbody.innerHTML = ''; let count = 0;

    (state.transactions || []).filter(t => {
        const matchesSearch = !searchTerm || (t.notes && t.notes.toLowerCase().includes(searchTerm)) || t.category.toLowerCase().includes(searchTerm);
        return matchesSearch && (!filterCat || t.category === filterCat);
    }).forEach(t => {
        // Find Account Name if linked
        let accName = '-';
        if (t.accountId) {
            const acc = state.accounts.find(a => a.id === t.accountId);
            accName = acc ? acc.bankName : 'Deleted Account';
        }
        if (t.type === 'transfer') accName = 'Transfer';

        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${new Date(t.date).toLocaleDateString('en-IN')}</td>
            <td>${t.category}<br><small style="color:var(--text-muted)">${accName}</small></td>
            <td style="color: ${t.type === 'income' ? 'var(--success)' : (t.type === 'transfer' ? '#3b82f6' : 'var(--danger)')}; font-weight: 600;">₹${t.amount.toLocaleString()}</td>
            <td>${t.type === 'income' ? '➕ In' : (t.type === 'transfer' ? '🔄 Swap' : '➖ Out')}</td>
            <td>${t.notes || '-'}</td>
            <td>
                <button onclick="editTransaction('${t.id}')" class="btn-sm" style="background:#4f7cff;color:white;padding:4px 8px;border-radius:4px;font-size:12px;margin-right:4px;">Edit</button>
                <button onclick="deleteTransaction('${t.id}')" class="btn-sm btn-delete" style="background:#ef4444;color:white;padding:4px 8px;border-radius:4px;font-size:12px;cursor:pointer;">Delete</button>
            </td>`;
        count++;
    });

    const countEl = document.getElementById('transactionCount');
    if (countEl) countEl.textContent = `${count} transactions`;
    updateFilterCategories();
}

function setBudget() {
    const input = document.getElementById('budgetInput'); if (!input) return;
    const value = Number(input.value);
    if (!input.value || isNaN(value) || value <= 0) {
        state.budget = 0; setInlineError('budgetWarning', 'Enter a positive monthly limit to enable budget tracking.');
    } else { state.budget = value; }
    saveState(); renderAll();
}

// Transaction Modals
function showAddTransactionModal() {
    document.getElementById('transactionModalTitle').textContent = 'New Transaction';
    document.getElementById('transactionDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('transactionAmount').value = '';
    document.getElementById('transactionNotes').value = '';
    document.getElementById('modalTransactionAccount').value = '';
    document.getElementById('transactionModal').dataset.editingId = '';
    updateAccountDropdowns();
    document.getElementById('transactionModal').style.display = 'block';
}

function closeTransactionModal() { document.getElementById('transactionModal').style.display = 'none'; }

function editTransaction(id) {
    const t = state.transactions.find(t => t.id === id); if (!t) return;
    updateAccountDropdowns();
    document.getElementById('transactionModalTitle').textContent = 'Edit Transaction';
    document.getElementById('transactionDate').value = t.date;
    document.getElementById('transactionCategory').value = t.category;
    document.getElementById('transactionAmount').value = t.amount;
    document.getElementById('transactionType').value = t.type;
    document.getElementById('transactionNotes').value = t.notes;
    document.getElementById('modalTransactionAccount').value = t.accountId || '';
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
    const accountId = document.getElementById('modalTransactionAccount').value;

    if (amount <= 0 || !category) return alert('Please fill all fields');

    // STRICT CHECK for the modal
    if (!accountId) return alert('❌ Please select a Bank Account from the dropdown.');

    if (id) {
        const oldTx = state.transactions.find(t => t.id === id);
        if (oldTx && oldTx.accountId) {
            const oldAcc = state.accounts.find(a => a.id === oldTx.accountId);
            if (oldAcc) {
                if (oldTx.type === 'income') oldAcc.balance -= oldTx.amount;
                else if (oldTx.type === 'expense') oldAcc.balance += oldTx.amount;
            }
        }

        const index = state.transactions.findIndex(t => t.id === id);
        if (index !== -1) state.transactions[index] = { id, date, category, amount, type, notes, accountId };

        if (accountId) {
            const newAcc = state.accounts.find(a => a.id === accountId);
            if (newAcc) {
                if (type === 'income') newAcc.balance += amount;
                else if (type === 'expense') newAcc.balance -= amount;
            }
        }
    } else {
        addTransaction(type, amount, category, date, notes, accountId);
    }

    closeTransactionModal(); saveState(); renderAll(); syncDashboard();
}

function updateFilterCategories() {
    const select = document.getElementById('filterCategory'); if (!select) return;
    const categories = [...new Set((state.transactions || []).map(t => t.category))].sort();
    const currentValue = select.value;
    select.innerHTML = '<option value="">All Categories</option>' + categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
    if (categories.includes(currentValue)) select.value = currentValue;
}

// ==========================================
// 3. NET WORTH, CUSTOM ASSETS & INVESTMENTS
// ==========================================

state.customAssets = state.customAssets || [];

function addCustomAsset(type) {
    const category = document.getElementById(`${type}Category`).value;
    const name = document.getElementById(`${type}Name`).value;
    const value = Number(document.getElementById(`${type}Value`).value);

    if (!name || value <= 0) return alert('Please enter a valid asset name and positive value.');

    // THE FIX: Create the array on the fly if it doesn't exist in memory yet
    if (!state.customAssets) {
        state.customAssets = [];
    }

    state.customAssets.push({
        id: 'asset_' + Date.now(),
        type: type, // 'movable' or 'immovable'
        category: category,
        name: name,
        value: value
    });

    // Clear the inputs
    document.getElementById(`${type}Name`).value = '';
    document.getElementById(`${type}Value`).value = '';

    saveState();
    renderCustomAssets();
    calculateNetWorth();
}

function renderCustomAssets() {
    const movableList = document.getElementById('movableList');
    const immovableList = document.getElementById('immovableList');
    if (!movableList || !immovableList) return;

    movableList.innerHTML = '';
    immovableList.innerHTML = '';

    const assetsToRender = state.customAssets || [];

    assetsToRender.forEach(asset => {
        const cardHtml = `
            <div style="display: flex; justify-content: space-between; align-items: center; background: #111; padding: 12px 16px; border-radius: 10px; border: 1px solid #333;">
                <div>
                    <h4 style="margin: 0; font-size: 0.95rem; color: #fff;">${asset.name}</h4>
                    <small style="color: var(--text-muted);">${asset.category}</small>
                </div>
                <div style="text-align: right; display: flex; align-items: center; gap: 12px;">
                    <span style="color: var(--success); font-weight: 600;">₹${asset.value.toLocaleString()}</span>
                    <button onclick="showSellCustomAssetModal('${asset.id}')" style="background: transparent; color: var(--danger); border: none; padding: 0; cursor: pointer; font-size: 1.2rem; box-shadow: none;">&times;</button>
                </div>
            </div>
        `;
        if (asset.type === 'movable') movableList.innerHTML += cardHtml;
        else immovableList.innerHTML += cardHtml;
    });
}

// --- NEW: SELL CUSTOM ASSET LOGIC ---

function showSellCustomAssetModal(id) {
    const asset = state.customAssets.find(a => a.id === id);
    if (!asset) return;

    document.getElementById('sellCustomId').value = id;
    document.getElementById('sellCustomTitle').innerText = `Sell: ${asset.name}`;
    document.getElementById('sellCustomDetails').innerText = `Current Valuation: ₹${asset.value.toLocaleString()}`;
    document.getElementById('sellCustomPrice').value = asset.value; // Pre-fill with estimated value

    // Populate bank accounts (hide Loan accounts)
    const select = document.getElementById('sellCustomAccount');
    select.innerHTML = '<option value="">-- Select Destination Bank --</option>';
    state.accounts.forEach(acc => {
        if (acc.type !== 'Loan') {
            select.innerHTML += `<option value="${acc.id}">${acc.bankName} (****${acc.accNumber}) - ₹${acc.balance}</option>`;
        }
    });

    document.getElementById('sellCustomAssetModal').style.display = 'block';
}

function closeSellCustomAssetModal() { document.getElementById('sellCustomAssetModal').style.display = 'none'; }

function executeSellCustomAsset() {
    const id = document.getElementById('sellCustomId').value;
    const price = Number(document.getElementById('sellCustomPrice').value);
    const accountId = document.getElementById('sellCustomAccount').value;

    if (!accountId) return alert('❌ Please select a bank account to deposit the funds.');
    if (price < 0 || isNaN(price)) return alert('Enter a valid selling price.');

    const assetIndex = state.customAssets.findIndex(a => a.id === id);
    if (assetIndex === -1) return;
    const asset = state.customAssets[assetIndex];

    // 1. Log the Income Transaction (this automatically adds the money to your bank balance!)
    let pnlText = price >= asset.value ? `(Profit: +₹${price - asset.value})` : `(Loss: -₹${asset.value - price})`;
    addTransaction('income', price, 'Asset Sale', new Date().toISOString().split('T')[0], `Sold ${asset.name} ${pnlText}`, accountId);

    // 2. Remove the asset from the list
    state.customAssets.splice(assetIndex, 1);

    closeSellCustomAssetModal();
    saveState();
    renderCustomAssets();
    calculateNetWorth();
    syncDashboard();

    if (typeof confetti !== 'undefined') confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
}

function deleteCustomAssetMistake() {
    const id = document.getElementById('sellCustomId').value;
    if (!confirm('Remove this asset WITHOUT logging a sale or income?')) return;
    
    state.customAssets = state.customAssets.filter(a => a.id !== id);
    closeSellCustomAssetModal();
    saveState(); renderCustomAssets(); calculateNetWorth(); syncDashboard();
}

// --- NEW: LOANS & LIABILITIES ENGINE ---
state.customLoans = state.customLoans || [];

function addLoan(type) {
    let name, accNo, purpose, principal, rate, time;

    if (type === 'bank') {
        name = document.getElementById('bankLoanName').value;
        accNo = document.getElementById('bankLoanAcc').value;
        purpose = document.getElementById('bankLoanPurpose').value;
        principal = Number(document.getElementById('bankLoanAmount').value);
        rate = Number(document.getElementById('bankLoanRate').value);
        time = Number(document.getElementById('bankLoanTime').value);
    } else {
        name = document.getElementById('otherLoanSource').value;
        accNo = 'N/A';
        purpose = document.getElementById('otherLoanPurpose').value;
        principal = Number(document.getElementById('otherLoanAmount').value);
        rate = Number(document.getElementById('otherLoanRate').value);
        time = Number(document.getElementById('otherLoanTime').value);
    }

    if (!name || principal <= 0 || rate < 0 || time <= 0) {
        return alert("Please fill all fields with valid positive numbers.");
    }

    // THE FIX: Create the arrays on the fly if they don't exist in memory yet
    if (!state.customLoans) state.customLoans = [];
    if (!state.accounts) state.accounts = [];

    // Mathematical Calculation: Simple Interest (A = P + (P*R*T/100))
    const interestAmount = (principal * rate * time) / 100;
    const finalAmount = principal + interestAmount;

    let linkedAccountId = null;

    if (type === 'bank') {
        // SYNCHRONIZATION: Instantly create a Bank Account with negative balance
        const accId = 'acc_' + Date.now();
        state.accounts.push({
            id: accId,
            bankName: name,
            holder: 'Self',
            accNumber: accNo,
            type: 'Loan',
            ownership: 'Individual',
            balance: -finalAmount // Forces a negative balance on the ledger
        });
        linkedAccountId = accId;
    }

    state.customLoans.push({
        id: 'loan_' + Date.now(),
        type: type,
        name: name,
        accNo: accNo,
        purpose: purpose,
        principal: principal,
        rate: rate,
        time: time,
        finalAmount: finalAmount,
        accountId: linkedAccountId
    });

    // Clear Inputs
    const prefixes = type === 'bank' ? ['bankLoanName', 'bankLoanAcc', 'bankLoanPurpose', 'bankLoanAmount', 'bankLoanRate', 'bankLoanTime'] : ['otherLoanSource', 'otherLoanPurpose', 'otherLoanAmount', 'otherLoanRate', 'otherLoanTime'];
    prefixes.forEach(id => { if (document.getElementById(id)) document.getElementById(id).value = ''; });

    saveState();
    renderLoans();
    renderAccounts();
    updateAccountDropdowns();
    calculateNetWorth();
    syncDashboard();
}

function renderLoans() {
    const bankList = document.getElementById('bankLoanList');
    const otherList = document.getElementById('otherLoanList');
    if (!bankList || !otherList) return;

    bankList.innerHTML = '';
    otherList.innerHTML = '';

    const loansToRender = state.customLoans || [];

    loansToRender.forEach(loan => {
        // Create the Repay button ONLY for 'other' loans
        let actionButton = '';
        if (loan.type === 'other') {
            actionButton = `<button onclick="showRepayOtherLoanModal('${loan.id}')" style="background: #f97316; color: white; border: none; padding: 6px 14px; border-radius: 6px; cursor: pointer; font-size: 0.8rem; margin-top: 10px; font-weight: bold;">🔄 Repay</button>`;
        } else {
            // For Bank loans, guide them to the Bank Accounts tab
            actionButton = `<p style="font-size: 0.75rem; color: #3b82f6; margin-top: 8px;">🔄 Repay via Bank Accounts Tab</p>`;
        }

        const cardHtml = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; background: #111; padding: 12px 16px; border-radius: 10px; border: 1px solid #333;">
                <div>
                    <h4 style="margin: 0; font-size: 0.95rem; color: #fff;">${loan.name}</h4>
                    <small style="color: var(--text-muted);">${loan.purpose} • ${loan.rate}% for ${loan.time}yr</small>
                    <br>
                    ${actionButton}
                </div>
                <div style="text-align: right;">
                    <span style="color: var(--danger); font-weight: 600; display: block;">₹${loan.finalAmount.toLocaleString()}</span>
                    <small style="color: #666; font-size: 0.7rem;">Principal: ₹${loan.principal.toLocaleString()}</small>
                </div>
            </div>
        `;
        if (loan.type === 'bank') bankList.innerHTML += cardHtml;
        else otherList.innerHTML += cardHtml;
    });
}

// --- NEW: OTHER LOAN REPAYMENT LOGIC ---

function showRepayOtherLoanModal(loanId) {
    const loan = state.customLoans.find(l => l.id === loanId);
    if (!loan) return;

    document.getElementById('repayOtherLoanId').value = loanId;
    document.getElementById('repayOtherLoanTitle').innerText = `Repay: ${loan.name}`;
    document.getElementById('repayOtherLoanDetails').innerText = `Remaining Debt: ₹${loan.finalAmount.toLocaleString()}`;
    document.getElementById('repayOtherAmount').value = '';

    // Populate source accounts (Hide loans from this dropdown)
    const sourceSelect = document.getElementById('repayOtherSourceAccount');
    sourceSelect.innerHTML = '<option value="">-- Select Source Bank Account --</option>';
    state.accounts.forEach(acc => {
        if (acc.type !== 'Loan') {
            sourceSelect.innerHTML += `<option value="${acc.id}">${acc.bankName} (****${acc.accNumber}) - ₹${acc.balance}</option>`;
        }
    });

    document.getElementById('repayOtherLoanModal').style.display = 'block';
}

function closeRepayOtherLoanModal() { document.getElementById('repayOtherLoanModal').style.display = 'none'; }

function executeOtherLoanRepayment() {
    const loanId = document.getElementById('repayOtherLoanId').value;
    const sourceAccId = document.getElementById('repayOtherSourceAccount').value;
    const amount = Number(document.getElementById('repayOtherAmount').value);

    if (!sourceAccId) return alert('❌ Please select a source bank account to pay from.');
    if (amount <= 0 || isNaN(amount)) return alert('Enter a valid repayment amount.');

    const sourceAcc = state.accounts.find(a => a.id === sourceAccId);
    const loan = state.customLoans.find(l => l.id === loanId);

    if (!sourceAcc || !loan) return alert('Account or Loan error.');
    if (amount > loan.finalAmount) return alert(`You cannot overpay. Remaining debt is ₹${loan.finalAmount.toLocaleString()}`);
    if (sourceAcc.balance < amount && sourceAcc.type !== 'Loan' && !confirm(`Insufficient funds in ${sourceAcc.bankName}. Overdraw?`)) return;

    // 1. Math: Reduce the loan debt manually
    loan.finalAmount -= amount;

    // 2. Log as Expense (This automatically deducts money from sourceAcc.balance inside addTransaction!)
    addTransaction('expense', amount, 'Loan Repayment', new Date().toISOString().split('T')[0], `Repaid ${loan.name}`, sourceAccId);

    // 3. Clear the loan if it is fully paid off
    if (loan.finalAmount <= 0) {
        state.customLoans = state.customLoans.filter(l => l.id !== loanId);
        setTimeout(() => alert(`🎉 Congratulations! You have fully paid off the loan from ${loan.name}!`), 100);
        if (typeof confetti !== 'undefined') confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }

    closeRepayOtherLoanModal();
    saveState();
    renderLoans();
    calculateNetWorth();
    syncDashboard();
}

function calculateNetWorth() {
    // 1. Core Bank Balances (Liquid & Bank Debt)
    let liquidSavings = 0;
    let totalDebt = 0;
    (state.accounts || []).forEach(acc => {
        if (acc.type === 'Loan') totalDebt += Math.abs(acc.balance);
        else liquidSavings += acc.balance;
    });

    // ADD "OTHER LOANS" TO TOTAL DEBT
    (state.customLoans || []).forEach(loan => {
        if (loan.type === 'other') totalDebt += loan.finalAmount;
    });

    // 2. Investment Portfolio Value
    let investmentValue = 0;
    (state.investments || []).forEach(asset => {
        investmentValue += (asset.qty * asset.currentPrice);
    });

    // 3. Custom Movable & Immovable Assets
    let customAssetsValue = 0;
    (state.customAssets || []).forEach(asset => {
        customAssetsValue += asset.value;
    });

    // THE MASTER CALCULATION
    const totalAssets = liquidSavings + investmentValue + customAssetsValue;
    const netWorth = totalAssets - totalDebt;

    // Update the UI Displays
    const valEl = document.getElementById('netWorthValue');
    const baseEl = document.getElementById('baseLiquidNw');

    if (valEl) valEl.textContent = `₹${netWorth.toLocaleString()}`;
    if (baseEl) baseEl.innerHTML = `Liquid: ₹${liquidSavings.toLocaleString()} &nbsp;|&nbsp; Assets: ₹${(investmentValue + customAssetsValue).toLocaleString()} &nbsp;|&nbsp; Debt: ₹${totalDebt.toLocaleString()}`;

    // Push to History for the Graph
    state.netWorthHistory = state.netWorthHistory || [];
    const today = new Date().toISOString().split('T')[0];
    const lastEntry = state.netWorthHistory[state.netWorthHistory.length - 1];

    if (lastEntry && lastEntry.date === today) lastEntry.value = netWorth;
    else {
        state.netWorthHistory.push({ date: today, value: netWorth });
        if (state.netWorthHistory.length > 12) state.netWorthHistory = state.netWorthHistory.slice(-12);
    }

    saveState();
    if (typeof updateNetWorthChart === 'function') updateNetWorthChart();
}

// Modal Toggles (Investments)
function showInvestmentModal() { updateAccountDropdowns(); document.getElementById('investmentModal').style.display = 'block'; }
function closeInvestmentModal() { document.getElementById('investmentModal').style.display = 'none'; }
function closeSellInvestmentModal() { document.getElementById('sellInvestmentModal').style.display = 'none'; }

function saveInvestment() {
    const ticker = document.getElementById('invTicker').value;
    const qty = Number(document.getElementById('invQty').value);
    const buyPrice = Number(document.getElementById('invPrice').value);
    const accountId = document.getElementById('invAccount').value;

    if (!ticker || qty <= 0 || buyPrice <= 0) return alert("Please enter valid asset details.");
    if (!accountId) return alert("❌ Please select a Bank Account to pay from.");

    const totalCost = qty * buyPrice;

    addTransaction('expense', totalCost, 'Investments', new Date().toISOString().split('T')[0], `Bought ${qty} ${ticker} @ ₹${buyPrice}`, accountId);

    state.investments = state.investments || [];
    state.investments.push({ id: Date.now() + '_inv', ticker, qty, buyPrice, currentPrice: buyPrice, accountId });

    closeInvestmentModal(); saveState(); renderAll(); syncDashboard();
}

function renderInvestments() {
    const tbody = document.querySelector('#investmentsTable tbody'); if (!tbody) return;
    tbody.innerHTML = ''; let totalInvested = 0; let currentValue = 0;

    (state.investments || []).forEach(asset => {
        const invested = asset.qty * asset.buyPrice; const current = asset.qty * asset.currentPrice;
        const pnl = current - invested; const pnlPercent = invested > 0 ? ((pnl / invested) * 100).toFixed(2) : 0;
        totalInvested += invested; currentValue += current;

        let bankName = "Unlinked";
        if (asset.accountId) {
            const acc = state.accounts.find(a => a.id === asset.accountId);
            if (acc) bankName = acc.bankName;
        }

        tbody.innerHTML += `<tr>
            <td><strong>${asset.ticker}</strong><br><small style="color:var(--text-muted)">🏦 ${bankName}</small></td>
            <td>${asset.qty}</td><td>₹${asset.buyPrice.toLocaleString()}</td><td>₹${asset.currentPrice.toLocaleString()}</td>
            <td style="color: ${pnl >= 0 ? 'var(--success)' : 'var(--danger)'}; font-weight: bold;">₹${pnl.toLocaleString()} (${pnl >= 0 ? '+' : ''}${pnlPercent}%)</td>
            <td>
                <button onclick="updateAssetPrice('${asset.id}')" style="background:#4f7cff; padding:4px 8px; font-size:12px; border-radius:4px; color:white; border:none; margin-right:4px;">Update</button>
                <button onclick="sellAsset('${asset.id}')" style="background:#10b981; padding:4px 8px; font-size:12px; border-radius:4px; color:white; border:none; margin-right:4px;">Sell</button>
                <button onclick="deleteAsset('${asset.id}')" style="background:#ef4444; padding:4px 8px; font-size:12px; border-radius:4px; color:white; border:none;">Del</button>
            </td>
        </tr>`;
    });

    const totalInvEl = document.getElementById('totalInvested'); const portValEl = document.getElementById('portfolioValue');
    if (totalInvEl) totalInvEl.innerText = `₹${totalInvested.toLocaleString()}`;
    if (portValEl) {
        const totalPnl = currentValue - totalInvested;
        portValEl.innerHTML = `₹${currentValue.toLocaleString()} <span style="font-size:1rem; color:${totalPnl >= 0 ? 'var(--success)' : 'var(--danger)'}">(${totalPnl >= 0 ? '+' : ''}₹${totalPnl.toLocaleString()})</span>`;
    }
}

function updateAssetPrice(id) {
    const asset = state.investments.find(a => a.id === id); if (!asset) return;
    const newPrice = prompt(`Update current market price for ${asset.ticker} (₹):`, asset.currentPrice);
    if (newPrice) { asset.currentPrice = Number(newPrice); saveState(); renderInvestments(); calculateNetWorth(); }
}

function sellAsset(id) {
    const asset = state.investments.find(a => a.id === id); if (!asset) return;

    let bankName = "Unknown Account";
    if (asset.accountId) {
        const acc = state.accounts.find(a => a.id === asset.accountId);
        if (acc) bankName = acc.bankName;
    }

    document.getElementById('sellInvId').value = id;
    document.getElementById('sellInvDetails').innerText = `Selling ${asset.qty} units of ${asset.ticker}. Bought at ₹${asset.buyPrice}.`;
    document.getElementById('sellInvBank').innerText = `Money will be deposited directly into: ${bankName}`;
    document.getElementById('sellPrice').value = asset.currentPrice;

    document.getElementById('sellInvestmentModal').style.display = 'block';
}

function executeSellInvestment() {
    const id = document.getElementById('sellInvId').value;
    const sellPrice = Number(document.getElementById('sellPrice').value);
    if (sellPrice < 0 || isNaN(sellPrice)) return alert("Invalid price entered.");

    const assetIndex = state.investments.findIndex(a => a.id === id);
    const asset = state.investments[assetIndex];
    const totalReturn = asset.qty * sellPrice;
    const pnl = totalReturn - (asset.qty * asset.buyPrice);

    addTransaction('income', totalReturn, 'Investments', new Date().toISOString().split('T')[0], `Sold ${asset.qty} ${asset.ticker} (P&L: ${pnl >= 0 ? '+' : ''}₹${pnl})`, asset.accountId);

    state.investments.splice(assetIndex, 1);
    if (pnl > 0 && typeof confetti !== 'undefined') confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });

    closeSellInvestmentModal(); saveState(); renderAll(); syncDashboard();
}

function deleteAsset(id) {
    if (!confirm("Remove this asset WITHOUT logging a transaction?")) return;
    state.investments = state.investments.filter(a => a.id !== id);
    saveState(); renderAll(); syncDashboard();
}
// ==========================================
// 4. GOALS & SUBSCRIPTIONS (MODAL UPGRADE)
// ==========================================

function showGoalModal() { updateAccountDropdowns(); document.getElementById('goalModal').style.display = 'block'; }
function closeGoalModal() { document.getElementById('goalModal').style.display = 'none'; }
function closeFundGoalModal() { document.getElementById('fundGoalModal').style.display = 'none'; }

function saveNewGoal() {
    const name = document.getElementById('goalName').value;
    const target = Number(document.getElementById('goalTarget').value);
    const accountId = document.getElementById('goalAccount').value;
    const deadline = document.getElementById('goalDeadline').value;

    if (!name || target <= 0) return alert('Please enter a valid goal name and target.');
    if (!accountId) return alert('❌ Please select a Bank Account where this goal is stored.');

    state.goals = state.goals || [];
    state.goals.push({ id: Date.now(), name, target, current: 0, deadline: deadline || null, accountId });

    closeGoalModal(); saveState(); renderGoals();
}

function renderGoals() {
    const container = document.getElementById('goalsList'); if (!container) return;
    container.innerHTML = (state.goals || []).map(goal => {
        const goalId = String(goal.id);
        const progress = goal.target > 0 ? (goal.current / goal.target) * 100 : 0;
        const daysLeft = goal.deadline ? Math.max(0, Math.ceil((new Date(goal.deadline) - Date.now()) / (1000 * 60 * 60 * 24))) : 0;

        let bankName = "Unlinked";
        if (goal.accountId) {
            const acc = state.accounts.find(a => a.id === goal.accountId);
            if (acc) bankName = acc.bankName;
        }

        return `<div class="goal-card" style="background: var(--glass-bg); padding: 20px; border-radius: 16px; border: 1px solid var(--glass-border);">
            <div>
                <h4>${goal.name}</h4>
                <p style="font-size: 0.8rem; color: var(--text-muted);">🏦 Stored in: ${bankName}</p>
                <div class="goal-progress" style="height: 8px; border-radius: 4px; background: rgba(148,163,184,0.3); margin: 12px 0; overflow: hidden;">
                    <div class="goal-progress-fill" style="height: 100%; background: linear-gradient(90deg, var(--success), var(--accent)); width: ${Math.min(100, progress)}%;"></div>
                </div>
                <p style="font-weight: bold; margin-bottom: 4px;">₹${goal.current.toLocaleString()} / ₹${goal.target.toLocaleString()} <span style="color: ${progress >= 100 ? '#22c55e' : '#94a3b8'}">(${Math.round(progress)}%)</span></p>
                ${goal.deadline ? `<small class="goal-timeline" style="color: var(--text-muted);">${daysLeft === 0 ? 'Today!' : `${daysLeft} days left`}</small>` : ''}
            </div>
            <div style="margin-top: 15px; display: flex; gap: 8px;">
                <button onclick="editGoal('${goalId}')" class="btn-sm" style="background:#10b981; padding: 6px 12px; color: white; border-radius: 6px;">Add Funds</button>
                <button onclick="deleteGoal('${goalId}')" class="btn-sm btn-delete" style="background: #ef4444; padding: 6px 12px; color: white; border-radius: 6px;">Delete</button>
            </div>
        </div>`;
    }).join('') || '<p class="empty-state">No goals set. Add your first savings goal!</p>';
}

function editGoal(id) {
    const normalizedId = String(id);
    const goal = state.goals.find(g => String(g.id) === normalizedId); if (!goal) return;
    updateAccountDropdowns();
    document.getElementById('fundGoalId').value = normalizedId;
    document.getElementById('fundGoalTitle').innerText = `Fund: ${goal.name}`;
    document.getElementById('fundAmount').value = '';
    document.getElementById('fundGoalModal').style.display = 'block';
}

function executeGoalFunding() {
    const goalId = String(document.getElementById('fundGoalId').value);
    const sourceAccountId = document.getElementById('fundSourceAccount').value;
    const amount = Number(document.getElementById('fundAmount').value);

    if (!sourceAccountId) return alert('❌ Please select a source bank account to transfer from.');
    if (amount <= 0 || isNaN(amount)) return alert('Amount must be positive.');

    const goal = state.goals.find(g => String(g.id) === goalId);
    if (!goal || !goal.accountId) return alert('Goal is corrupted or missing a target account.');

    if (sourceAccountId === goal.accountId) {
        return alert("❌ Source account and Target account are the same! Money is already there.");
    }

    const sourceAcc = state.accounts.find(a => a.id === sourceAccountId);
    const targetAcc = state.accounts.find(a => a.id === goal.accountId);

    if (!sourceAcc || !targetAcc) {
        return alert('Source or goal account no longer exists. Please update account links and try again.');
    }

    if (sourceAcc.balance < amount && sourceAcc.type !== 'Loan' && !confirm("Overdraw source account?")) return;

    // Execute True Bank Transfer
    sourceAcc.balance -= amount;
    targetAcc.balance += amount;

    // Log the Transfer
    state.transactions.unshift({
        id: Date.now().toString(), date: new Date().toISOString().split('T')[0],
        category: `Goal: ${goal.name}`, amount: amount, type: 'transfer',
        accountId: sourceAccountId, toAccountId: goal.accountId, notes: `Funded Goal: ${goal.name}`
    });

    goal.current += amount;
    if (goal.current >= goal.target) {
        goal.current = goal.target;
        if (typeof confetti !== 'undefined') { confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } }); setTimeout(() => alert(`🎉 Congratulations! You reached your "${goal.name}" goal!`), 500); }
    }

    closeFundGoalModal(); saveState(); renderAll(); syncDashboard();
}

function deleteGoal(id) {
    if (!confirm("Delete this goal?")) return;
    const normalizedId = String(id);
    state.goals = state.goals.filter(g => String(g.id) !== normalizedId);
    saveState();
    renderGoals();
}

// Subscriptions
function showSubscriptionModal() { updateAccountDropdowns(); document.getElementById('subscriptionModal').style.display = 'block'; }
function closeSubscriptionModal() { document.getElementById('subscriptionModal').style.display = 'none'; }

function saveSubscription() {
    const name = document.getElementById('subName').value;
    const amount = Number(document.getElementById('subAmount').value);
    const dueDate = Number(document.getElementById('subDay').value);
    const accountId = document.getElementById('subAccount').value;

    if (!name || amount <= 0 || dueDate < 1 || dueDate > 31) return alert("Invalid subscription details.");
    if (!accountId) return alert("❌ Please assign a Bank Account for auto-debit tracking.");

    state.subscriptions = state.subscriptions || [];
    state.subscriptions.push({ id: Date.now().toString(), name, amount, dueDate, accountId });

    closeSubscriptionModal(); saveState(); renderSubscriptions();
}

function renderSubscriptions() {
    const container = document.getElementById('subscriptionsList'); if (!container) return;
    let burnRate = 0;

    container.innerHTML = (state.subscriptions || []).map(sub => {
        burnRate += sub.amount;
        let bankName = "Unlinked";
        if (sub.accountId) {
            const acc = state.accounts.find(a => a.id === sub.accountId);
            if (acc) bankName = acc.bankName;
        }

        return `<div class="tool-card" style="display:flex; justify-content:space-between; align-items:center; background: var(--glass-bg); border: 1px solid var(--glass-border); padding: 16px; border-radius: 12px; margin-bottom: 10px;">
            <div>
                <h4 style="margin-bottom: 4px;">${sub.name}</h4>
                <p style="color: var(--text-muted); font-size: 0.85rem;">Renews on: ${sub.dueDate} of month</p>
                <p style="color: #3b82f6; font-size: 0.8rem;">🏦 Debit: ${bankName}</p>
            </div>
            <div style="text-align: right;">
                <h3 style="color: var(--danger);">₹${sub.amount.toLocaleString()}</h3>
                <button onclick="deleteSubscription('${sub.id}')" style="background:transparent; border:none; color:var(--text-muted); padding:0; margin-top:5px; cursor:pointer; font-size: 0.85rem; text-decoration: underline;">Remove</button>
            </div>
        </div>`;
    }).join('') || '<p class="empty-state">No active subscriptions detected.</p>';

    const burnEl = document.getElementById('monthlyBurn'); if (burnEl) burnEl.innerText = `₹${burnRate.toLocaleString()}`;
}

function deleteSubscription(id) { if (!confirm("Remove this subscription?")) return; state.subscriptions = state.subscriptions.filter(s => s.id !== id); saveState(); renderSubscriptions(); }
// ==========================================
// 5. MASTER DASHBOARD SYNC & BOOT-UP
// ==========================================

window.addEventListener('DOMContentLoaded', () => {

    // 1. Redefine the core updateDashboard function to permanently use Bank math
    window.updateDashboard = function () {
        let liquidSavings = 0;
        let totalDebt = 0;
        (state.accounts || []).forEach(acc => {
            if (acc.type === 'Loan') totalDebt += Math.abs(acc.balance);
            else liquidSavings += acc.balance;
        });
        (state.customLoans || []).forEach(loan => { if (loan.type === 'other') totalDebt += loan.finalAmount; });
        let totalIncome = 0;
        let totalExpense = 0;
        (state.transactions || []).forEach(t => {
            if (t.type === 'income') totalIncome += t.amount;
            if (t.type === 'expense') totalExpense += t.amount;
        });

        // 2. Safely animate the DOM using the strict banking truth
        if (typeof animateValue === 'function') {
            animateValue(document.getElementById('incomeValue'), totalIncome);
            animateValue(document.getElementById('expenseValue'), totalExpense);
            animateValue(document.getElementById('savingsValue'), liquidSavings);
        } else {
            if (document.getElementById('incomeValue')) document.getElementById('incomeValue').innerText = `₹${totalIncome.toLocaleString()}`;
            if (document.getElementById('expenseValue')) document.getElementById('expenseValue').innerText = `₹${totalExpense.toLocaleString()}`;
            if (document.getElementById('savingsValue')) document.getElementById('savingsValue').innerText = `₹${liquidSavings.toLocaleString()}`;
        }

        // 3. Sync Net Worth tracking inputs
        const assetsInput = document.getElementById('assetsInput');
        const liabilitiesInput = document.getElementById('liabilitiesInput');
        if (assetsInput) assetsInput.value = liquidSavings;
        if (liabilitiesInput) liabilitiesInput.value = totalDebt;

        // 4. Sync the Total Liquid Balance on the Accounts page
        const totalAccountsBalance = document.getElementById('totalAccountsBalance');
        if (totalAccountsBalance) totalAccountsBalance.innerText = `₹${liquidSavings.toLocaleString()}`;

        // 5. CRITICAL: Force ALL Assets, Banks, and Dropdowns to redraw instantly!
        renderAccounts();
        renderCustomAssets(); // <--- THIS KEEPS YOUR ASSETS ON THE SCREEN
        renderLoans();
        updateAccountDropdowns();

        if (typeof calculateNetWorth === 'function') calculateNetWorth();

        // 6. BYPASS CHARTS.JS - AGGRESSIVELY FORCE THE CHART TO UPDATE HERE
        const chartCanvas = document.getElementById('summaryChart');
        if (chartCanvas && typeof Chart !== 'undefined') {
            const chartInstance = Chart.getChart(chartCanvas);
            if (chartInstance && chartInstance.data && chartInstance.data.datasets.length > 0) {
                // Instantly overwrite whatever charts.js put in there
                chartInstance.data.datasets[0].data = [totalIncome, totalExpense, liquidSavings];
                chartInstance.update();
            }
        }
    };

    // 7. Ensure the new sync ALWAYS wins the fight over the old render functions
    if (typeof window.renderAll === 'function' && !window.renderAll.isHijacked) {
        const originalRenderAll = window.renderAll;
        window.renderAll = function () {
            originalRenderAll();
            renderAccounts();
            renderCustomAssets(); // <--- THIS KEEPS ASSETS WHEN ADDING TRANSACTIONS
            updateAccountDropdowns();
            // Delay by 20ms so it overwrites any old incorrect math on the dashboard
            setTimeout(window.updateDashboard, 20);
        };
        window.renderAll.isHijacked = true;
    }

    // 8. Fire the sync 50ms after the page loads to guarantee data is ready
    setTimeout(() => {
        window.updateDashboard();
        Object.values(Chart.instances).forEach(chart => chart.update());

        if (typeof updateCharts === 'function') updateCharts();

        // Run updateDashboard ONE MORE TIME to ensure our numbers win the final fight
        setTimeout(window.updateDashboard, 100);

        if (typeof updateNetWorthChart === 'function') updateNetWorthChart();
    }, 50);
});
