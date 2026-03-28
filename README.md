# 💰 FinancePro - Personal Finance Dashboard

> **Startup-grade Money Intelligence at Your Fingertips** | Interactive wealth management & financial planning powered by AI insights

[![Status](https://img.shields.io/badge/Status-Active-success)]() 
[![License](https://img.shields.io/badge/License-MIT-blue)]()
[![Language](https://img.shields.io/badge/Language-JavaScript%20%7C%20HTML%20%7C%20CSS-yellow)]()
[![GitHub Stars](https://img.shields.io/github/stars/Prasanna07-exe/personal-finance-dashboard?style=social)]()

---

## 🎯 Overview

**FinancePro** is a modern, interactive personal finance dashboard built with vanilla JavaScript, offering a startup-grade user experience with powerful financial management tools. Track your wealth, optimize spending, and achieve financial goals—all in one beautiful, responsive application.

### Key Highlights
- 🎨 **Beautiful UI** with glassmorphism design and dark mode
- 📊 **Real-time Analytics** with interactive charts (Chart.js)
- 💳 **Multi-Account Banking** system for comprehensive tracking
- 🎯 **Goal & Investment Tracking** with net worth calculations
- 📱 **Fully Responsive** across desktop, tablet, and mobile
- 🚀 **PWA Ready** - installable as a web app
- 📈 **AI-Powered Insights** detecting spending anomalies
- ⚡ **Zero Dependencies** on databases—local storage only

---

## ✨ Features

### 1. **Dashboard Analytics**
- **Income & Expense Overview** - Real-time financial snapshot
- **Expense Breakdown Pie Chart** - Visual category distribution
- **Cash Flow Forecasting** - 3-month financial projection
- **Budget vs Actual** - Track spending against targets
- **Financial Health Score** - AI-calculated well-being metric
- **Smart Insights** - Automated anomaly detection & recommendations

### 2. **Transaction Management**
- Log income & expenses with detailed categorization
- 16 spending categories (Food, Rent, Travel, Healthcare, etc.)
- Search & filter transactions by date, category, or amount
- Bulk CSV export/import for data portability
- Transaction history with full edit capabilities

### 3. **Bank Account Management**
- Add multiple bank accounts (Savings, Checking, Loan)
- Track account balances across institutions
- Quick deposit/withdraw functionality
- Inter-account money transfer system
- Loan repayment tracking

### 4. **Investment Portfolio**
- Track stocks, mutual funds, real estate, and crypto
- Real-time asset price updates
- Buy/sell transaction logging
- Capital gains/loss calculations
- Portfolio performance analytics

### 5. **Net Worth Tracker**
- **Assets**: Liquid savings, immovable property, vehicles, jewelry
- **Liabilities**: Bank loans, personal loans, credit card debt
- **Net Worth Calculation**: Automatic asset-liability sync
- **Historical Trends** - Monitor wealth growth over time

### 6. **Loan Management**
- Bank loans (home, auto, education)
- Personal loans tracking
- EMI (Equated Monthly Installment) calculations
- Interest rate tracking
- Repayment history

### 7. **Savings Goals**
- Create and track multiple financial goals
- Visualize progress with animated goal bars
- Fund goals from available savings
- Goal achievement milestones
- Success celebration with confetti animation

### 8. **Subscriptions Tracker**
- Monitor recurring expenses (Netflix, Gym, etc.)
- Track subscription billing cycles
- Annual cost projections
- Renewal reminders

### 9. **Quick Tools**
- **EMI Calculator** - Calculate loan monthly payments
- **Currency Converter** - USD to INR conversion
- **Debt Planner** - Avalanche vs Snowball strategy
- **FIRE Calculator** - Financial Independence planning
- **Tax Estimator** - Quick income tax projection

### 10. **Reports & Exports**
- **PDF Report Generation** - Comprehensive financial summary
- **CSV Export** - Transaction data portability
- **CSV Import** - Bulk transaction upload
- Date-stamped downloadable reports

### 11. **UI/UX Features**
- 🌙 **Dark Mode** with light/dark theme toggle
- 3D Interactive Elements (Spline.design integration)
- Smooth animations & transitions
- Floating action menu (3D nodes navigation)
- Responsive header that compacts on scroll
- Number animation countups for visual impact
- Card tilt effects on hover
- Ripple button effects

---

## 🏗️ Project Structure

```
personal-finance-dashboard/
├── index.html                 # Main HTML file (39KB)
├── css/
│   ├── base.css              # Core styling & themes
│   ├── components.css        # Buttons, inputs, modals
│   └── views.css             # Page-specific styles
├── js/
│   ├── app.js                # App initialization & boot sequence
│   ├── finance.js            # Banking, loans, investments logic
│   ├── state.js              # State management & localStorage
│   ├── ui.js                 # UI interactions & animations
│   ├── charts.js             # Chart.js visualizations
│   └── tools.js              # Calculators & utility functions
└── Finance_Report_*.pdf      # Generated reports

Languages: JavaScript (51.9%) | CSS (25.4%) | HTML (22.7%)
```

---

## 🚀 Getting Started

### Prerequisites
- Modern web browser (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- No backend required—all data stored locally
- Optional: HTTP server for best PWA experience

### Installation

**Option 1: Direct Use (No Installation)**
```bash
# Clone the repository
git clone https://github.com/Prasanna07-exe/personal-finance-dashboard.git
cd personal-finance-dashboard

# Open in browser
open index.html

# Or use a simple HTTP server
python -m http.server 8000
# Navigate to http://localhost:8000
```

**Option 2: Install as PWA**
1. Open the app in your browser
2. Click the install button (⬇️) in the address bar
3. Select "Install FinancePro"
4. Access from your home screen/app drawer

### First-Time Setup
1. **Add Bank Accounts** → Navigate to "Bank Accounts" view
2. **Set Monthly Budget** → Enter budget amount in dashboard
3. **Log Transactions** → Start adding income/expenses
4. **Track Assets** → Go to "Net Worth Tracker" to add investments
5. **Create Goals** → Set savings targets in "Savings Goals"

---

## 💻 Usage Guide

### Dashboard
- View total income, expenses, and savings summary
- Monitor Financial Health Score
- Check AI-generated spending insights
- See expense category breakdown pie chart

### Transactions
- Click **+ Add Expense/Income** button
- Select category, amount, date, and notes
- Use search bar to filter transactions
- Export data as CSV for external analysis

### Banking
- Add multiple accounts with initial balance
- Use quick deposit/withdraw buttons
- Transfer money between accounts
- Track loan repayment schedule

### Investments
- Add stocks, mutual funds, crypto holdings
- Update asset prices in real-time
- Log buy/sell transactions
- Calculate unrealized gains/losses

### Net Worth
- Enter all assets (liquid & immovable)
- Log all liabilities (loans & debts)
- View automatically calculated net worth
- Track net worth trend over time

### Goals
- Set target amount and deadline
- Monitor progress with visual bars
- Fund goals from available savings
- Celebrate milestones with animations

### Tools
- **EMI Calculator**: Input loan amount, interest rate, tenure
- **Currency Converter**: Quick USD to INR conversion
- **Debt Planner**: Strategy recommendations
- **FIRE Calculator**: Early retirement planning

### Reports
- Click **Get Report** for PDF download
- Includes executive summary & transaction details
- Auto-generated with current date
- Print-friendly format

---

## 🎨 Customization

### Change Color Scheme
Edit CSS variables in `css/base.css`:
```css
:root {
    --text-main: #0f172a;
    --accent: #4f7cff;
    --success: #16a34a;
    --danger: #ef4444;
    /* ... modify as needed */
}
```

### Add Expense Categories
In `js/app.js`, update the `populateDropdowns()` function:
```javascript
const categories = ['Food', 'Rent', 'Travel', /* Add your categories */];
```

### Dark Mode 3D Models
Customize in `js/ui.js` (Spline viewer URLs):
```javascript
const darkUrl = 'https://prod.spline.design/vnLh5ZNRjBQEz9V4/scene.splinecode';
const lightUrl = 'https://prod.spline.design/eCOXc8L2lS9PB6Dc/scene.splinecode';
```

---

## 📱 Data & Privacy

### Local Storage
- **All data stored locally** in browser's localStorage
- **No cloud sync** or server communication
- **No tracking** or analytics
- **Complete privacy** — your data never leaves your device

### Data Backup
```javascript
// Export full state as JSON
const backup = JSON.stringify(localStorage.getItem('personal_finance_dashboard_state'));

// Restore from backup
localStorage.setItem('personal_finance_dashboard_state', backup);
```

### Clear Data
```javascript
// Nuclear reset in browser console
localStorage.removeItem('personal_finance_dashboard_state');
location.reload();
```

---

## 🔧 Technical Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | HTML5, CSS3, Vanilla JavaScript (ES6+) |
| **Charts** | Chart.js 3.x |
| **PDF Export** | jsPDF 2.5.1 |
| **3D Elements** | Spline.design Viewer |
| **Animation** | Canvas Confetti, CSS animations |
| **State Management** | localStorage (no external DB) |
| **Styling** | Glassmorphism design, CSS Grid/Flexbox |

---

## 📈 Financial Calculations

### EMI (Equated Monthly Installment)
```javascript
EMI = (P × R × (1+R)^N) / ((1+R)^N - 1)
// P = Principal, R = Monthly Rate, N = Number of months
```

### Net Worth
```
Net Worth = Total Assets - Total Liabilities
```

### Financial Health Score
```
Score = (Savings/Income) × 100
Grade: S (90+), A (75-89), B (60-74), C (<60)
```

### Budget Status
```
Status = Budget - Actual Expenses
Color: Green (remaining), Red (over budget)
```

---

## 🐛 Known Limitations

- CSV import requires specific format (Date, Category, Amount, Type, Notes)
- Charts require 2+ data points to render
- Loan repayment calculations assume monthly installments
- Currency converter uses fixed 2024 USD-INR rate (83.12)
- Mobile view optimized for screens 375px+

---

## 🚀 Future Roadmap

- [ ] Cloud sync (optional Firebase integration)
- [ ] Mobile app (React Native)
- [ ] Multi-user/family accounts
- [ ] Recurring transaction automation
- [ ] Bank API integration (Plaid)
- [ ] Advanced tax planning tools
- [ ] Budget alerts & notifications
- [ ] Cryptocurrency portfolio tracking
- [ ] Real-time currency rates API
- [ ] Dark mode chart themes
- [ ] Voice command input
- [ ] Financial advisor AI chatbot

---

## 🤝 Contributing

Contributions are welcome! To contribute:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** changes (`git commit -m 'Add amazing feature'`)
4. **Push** to branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Development Setup
```bash
git clone https://github.com/Prasanna07-exe/personal-finance-dashboard.git
cd personal-finance-dashboard
# Start local server
python -m http.server 8000
# Open http://localhost:8000
```

---

## 📄 License

This project is licensed under the **MIT License** - see [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Prasanna07-exe**
- GitHub: [@Prasanna07-exe](https://github.com/Prasanna07-exe)
- Project: [Personal Finance Dashboard](https://github.com/Prasanna07-exe/personal-finance-dashboard)

---

## 💡 Tips & Tricks

### Pro Tips
1. **Set Realistic Budget** - Start with last month's spending as reference
2. **Monthly Reset** - Archive old transactions for fresh start
3. **Track Everything** - Even small expenses accumulate
4. **Regular Goals** - Review and adjust goals monthly
5. **Export Reports** - Keep copies for tax/loan applications

### Keyboard Shortcuts
- Press `Ctrl/Cmd + K` - Focus search (when implemented)
- Press `Ctrl/Cmd + T` - Toggle theme
- Press `?` - Show help modal

### Browser Compatibility
| Browser | Support |
|---------|---------|
| Chrome | ✅ Full |
| Firefox | ✅ Full |
| Safari | ✅ Full |
| Edge | ✅ Full |
| IE 11 | ❌ Not supported |

---

## 📞 Support & Feedback

### Found a Bug?
- [Open an Issue](https://github.com/Prasanna07-exe/personal-finance-dashboard/issues)
- Include browser version & steps to reproduce
- Attach screenshots if applicable

### Feature Request?
- [Start a Discussion](https://github.com/Prasanna07-exe/personal-finance-dashboard/discussions)
- Describe use case and expected behavior
- Vote on existing requests

---

## 📊 Statistics

- **Total Lines of Code**: ~2000+
- **JavaScript**: 51.9%
- **CSS**: 25.4%
- **HTML**: 22.7%
- **Development Time**: Built for maximum efficiency
- **Build Size**: ~130KB (uncompressed)

---

## 🎓 Learning Resources

This project is great for learning:
- Vanilla JavaScript (ES6+)
- DOM manipulation & event handling
- localStorage API & state management
- Chart.js for data visualization
- CSS Grid & Flexbox layouts
- Responsive design patterns
- Web app development best practices

---

## ⭐ Show Your Support

If this project helped you, please:
- ⭐ **Star** this repository
- 🔗 **Share** with friends
- 💬 **Provide feedback** via issues
- 👥 **Contribute** improvements

---

<div align="center">

**Made with ❤️ by Prasanna07-exe**

[⬆ Back to top](#-financepro---personal-finance-dashboard)

</div># personal-finance-dashboard
