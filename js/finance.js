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
                    <button onclick="quickDeposit('${acc.id}')" class="btn-sm" style="flex: 1; padding: 6px; font-size: 0.8rem; background: #111 !important; border-color: #333 !important; color: white;">⬇️ Deposit</button>
                    <button onclick="quickWithdraw('${acc.id}')" class="btn-sm" style="flex: 1; padding: 6px; font-size: 0.8rem; background: #111 !important; border-color: #333 !important; color: white;">⬆️ Withdraw</button>
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
// 3. NET WORTH & INVESTMENTS (MODAL UPGRADE)
// ==========================================

function calculateNetWorth() {
    const assetsInput = document.getElementById('assetsInput'); const liabilitiesInput = document.getElementById('liabilitiesInput');
    const assets = Number(assetsInput?.value || 0); const liabilities = Number(liabilitiesInput?.value || 0);
    const netWorth = assets - liabilities;

    const valEl = document.getElementById('netWorthValue'); const cardEl = document.getElementById('networthCard');
    if (valEl) valEl.textContent = `₹${netWorth.toLocaleString()}`;
    if (cardEl) cardEl.style.display = 'block';

    state.netWorthHistory = state.netWorthHistory || [];
    state.netWorthHistory.push({ date: new Date().toISOString().split('T')[0], value: netWorth });
    if (state.netWorthHistory.length > 12) state.netWorthHistory = state.netWorthHistory.slice(-12);
    saveState();
    if (typeof updateNetWorthChart === 'function') updateNetWorthChart();
}

// Modal Toggles
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

    // Log expense & drain bank account
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

        // Find Bank Name
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
    const newPrice = prompt(`Update current market price for ${asset.ticker} (₹):`, asset.currentPrice); // Keep this as a quick prompt
    if (newPrice) { asset.currentPrice = Number(newPrice); saveState(); renderInvestments(); }
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

    // Deposit money back into original bank account
    addTransaction('income', totalReturn, 'Investments', new Date().toISOString().split('T')[0], `Sold ${asset.qty} ${asset.ticker} (P&L: ${pnl >= 0 ? '+' : ''}₹${pnl})`, asset.accountId);

    state.investments.splice(assetIndex, 1);
    if (pnl > 0 && typeof confetti !== 'undefined') confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });

    closeSellInvestmentModal(); saveState(); renderAll(); syncDashboard();
}

function deleteAsset(id) { if (!confirm("Remove this asset WITHOUT logging a transaction?")) return; state.investments = state.investments.filter(a => a.id !== id); saveState(); renderAll(); }

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
                <button onclick="editGoal(${goal.id})" class="btn-sm" style="background:#10b981; padding: 6px 12px; color: white; border-radius: 6px;">Add Funds</button>
                <button onclick="deleteGoal(${goal.id})" class="btn-sm btn-delete" style="background: #ef4444; padding: 6px 12px; color: white; border-radius: 6px;">Delete</button>
            </div>
        </div>`;
    }).join('') || '<p class="empty-state">No goals set. Add your first savings goal!</p>';
}

function editGoal(id) {
    const goal = state.goals.find(g => g.id === id); if (!goal) return;
    updateAccountDropdowns();
    document.getElementById('fundGoalId').value = id;
    document.getElementById('fundGoalTitle').innerText = `Fund: ${goal.name}`;
    document.getElementById('fundAmount').value = '';
    document.getElementById('fundGoalModal').style.display = 'block';
}

function executeGoalFunding() {
    const goalId = Number(document.getElementById('fundGoalId').value);
    const sourceAccountId = document.getElementById('fundSourceAccount').value;
    const amount = Number(document.getElementById('fundAmount').value);

    if (!sourceAccountId) return alert('❌ Please select a source bank account to transfer from.');
    if (amount <= 0 || isNaN(amount)) return alert('Amount must be positive.');

    const goal = state.goals.find(g => g.id === goalId);
    if (!goal || !goal.accountId) return alert('Goal is corrupted or missing a target account.');

    if (sourceAccountId === goal.accountId) {
        return alert("❌ Source account and Target account are the same! Money is already there.");
    }

    const sourceAcc = state.accounts.find(a => a.id === sourceAccountId);
    const targetAcc = state.accounts.find(a => a.id === goal.accountId);

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

function deleteGoal(id) { if (!confirm("Delete this goal?")) return; state.goals = state.goals.filter(g => g.id !== id); saveState(); renderGoals(); }

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

        // 5. CRITICAL: Force Bank Accounts and Dropdowns to redraw instantly!
        renderAccounts();
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
        // Call the original updateCharts just in case it sets up layout, then override it
        if (typeof updateCharts === 'function') updateCharts();

        // Run updateDashboard ONE MORE TIME to ensure our Bank numbers win the final fight
        setTimeout(window.updateDashboard, 100);

        if (typeof updateNetWorthChart === 'function') updateNetWorthChart();
    }, 50);
});