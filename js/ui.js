const SPLINE_SCENES = {
    dark: 'https://prod.spline.design/vnLh5ZNRjBQEz9V4/scene.splinecode',
    light: 'https://prod.spline.design/eCOXc8L2lS9PB6Dc/scene.splinecode'
};

const SPLINE_LOADER_SHOW_DELAY_MS = 180;
const SPLINE_RENDER_FALLBACK_MS = 1400;
const SPLINE_READY_FALLBACK_MS = 3200;

let splineLoaderDelayHandle = null;
let currentViewId = 'home-hub';
const viewHistoryStack = [];

function markSplineLoading(isLoading) {
    const splineWrapper = document.getElementById('spline-wrapper');
    if (!splineWrapper) return;

    const loader = document.getElementById('spline-loader');

    splineWrapper.classList.toggle('is-loading', isLoading);
    splineWrapper.classList.toggle('is-ready', !isLoading);
    splineWrapper.setAttribute('aria-busy', isLoading ? 'true' : 'false');

    if (splineLoaderDelayHandle) {
        clearTimeout(splineLoaderDelayHandle);
        splineLoaderDelayHandle = null;
    }

    if (loader) {
        loader.classList.remove('is-visible');
    }

    if (isLoading && loader) {
        // Only show loader if loading takes noticeable time (avoids flicker on cached reloads).
        splineLoaderDelayHandle = setTimeout(() => {
            loader.classList.add('is-visible');
        }, SPLINE_LOADER_SHOW_DELAY_MS);
    } else if (!isLoading) {
        sessionStorage.setItem('financeproSplineLoaded', '1');
    }
}

function mountSplineScene(targetUrl) {
    const splineWrapper = document.getElementById('spline-wrapper');
    if (!splineWrapper || !targetUrl) return;

    const existingViewer = splineWrapper.querySelector('spline-viewer');
    if (existingViewer && existingViewer.getAttribute('url') === targetUrl && splineWrapper.classList.contains('is-ready')) {
        return;
    }

    const seenInSession = sessionStorage.getItem('financeproSplineLoaded') === '1';
    markSplineLoading(!seenInSession);
    if (existingViewer) existingViewer.remove();

    const viewer = document.createElement('spline-viewer');
    viewer.setAttribute('url', targetUrl);
    viewer.setAttribute('loading-anim-type', 'none');

    let readyHandled = false;
    const onSceneReady = () => {
        if (readyHandled) return;
        readyHandled = true;
        clearTimeout(renderFallback);
        clearTimeout(readyFallback);
        markSplineLoading(false);
    };

    // Faster fallback: if events lag but viewer is already in DOM, hide loader quickly.
    const renderFallback = setTimeout(onSceneReady, SPLINE_RENDER_FALLBACK_MS);

    // Hard fallback: never keep the loader stuck for long if custom events fail.
    const readyFallback = setTimeout(onSceneReady, SPLINE_READY_FALLBACK_MS);

    viewer.addEventListener('load', onSceneReady, { once: true });
    viewer.addEventListener('ready', onSceneReady, { once: true });
    splineWrapper.prepend(viewer);
}

function switchView(viewId) {
    if (!viewId || viewId === currentViewId) return;

    if (currentViewId) {
        viewHistoryStack.push(currentViewId);
    }

    document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));

    const targetView = document.getElementById(viewId);
    if (targetView) targetView.classList.add('active');

    const viewTitles = {
        'home-hub': 'FinancePro',
        'overview': 'Dashboard Analytics',
        'transactions-view': 'Transaction History',
        'budget-view': 'Budget & Insights',
        'wealth-view': 'Net Worth Tracker',
        'goals-view': 'Savings Goals',
        'investments-view': 'Investment Portfolio',
        'subscriptions-view': 'Active Subscriptions',
        'accounts-view': 'Bank Accounts'
    };

    const titleEl = document.getElementById('viewTitle');
    const backBtn = document.getElementById('backToHubBtn');

    if (titleEl) titleEl.innerText = viewTitles[viewId] || 'Dashboard';

    if (backBtn) {
        if (viewId === 'home-hub') {
            backBtn.style.display = 'none';
        } else {
            backBtn.style.display = 'block';
        }
    }

    currentViewId = viewId;

    setTimeout(() => {
        if (!window.Chart || !Chart.instances) return;
        Object.values(Chart.instances).forEach(chart => {
            chart.resize();
            chart.update();
        });
    }, 10);
}

function switchViewWithoutHistory(viewId) {
    if (!viewId) return;

    document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
    const targetView = document.getElementById(viewId);
    if (targetView) targetView.classList.add('active');

    const viewTitles = {
        'home-hub': 'FinancePro',
        'overview': 'Dashboard Analytics',
        'transactions-view': 'Transaction History',
        'budget-view': 'Budget & Insights',
        'wealth-view': 'Net Worth Tracker',
        'goals-view': 'Savings Goals',
        'investments-view': 'Investment Portfolio',
        'subscriptions-view': 'Active Subscriptions',
        'accounts-view': 'Bank Accounts'
    };

    const titleEl = document.getElementById('viewTitle');
    const backBtn = document.getElementById('backToHubBtn');
    if (titleEl) titleEl.innerText = viewTitles[viewId] || 'Dashboard';
    if (backBtn) backBtn.style.display = viewId === 'home-hub' ? 'none' : 'block';

    currentViewId = viewId;

    setTimeout(() => {
        if (!window.Chart || !Chart.instances) return;
        Object.values(Chart.instances).forEach(chart => {
            chart.resize();
            chart.update();
        });
    }, 10);
}

function goBackView() {
    const previous = viewHistoryStack.pop();
    if (previous) {
        switchViewWithoutHistory(previous);
    } else {
        switchViewWithoutHistory('home-hub');
    }
}

function goHomeHub() {
    switchViewWithoutHistory('home-hub');
    viewHistoryStack.length = 0;
}

function toggleTheme() {
    document.body.classList.toggle('dark');
    state.theme = document.body.classList.contains('dark') ? 'dark' : 'light';
    saveState();
    applyTheme();
}

function applyTheme() {
    const isDark = state.theme === 'dark';

    // Apply CSS Class
    if (isDark) document.body.classList.add('dark');
    else document.body.classList.remove('dark');

    // Update Button to purely Emoji (Sun to switch to light, Moon to switch to dark)
    const btn = document.getElementById('themeToggleBtn');
    if (btn) btn.innerText = isDark ? '☀️' : '🌙';

    const targetUrl = isDark ? SPLINE_SCENES.dark : SPLINE_SCENES.light;
    mountSplineScene(targetUrl);

    // Update Charts
    if (typeof updateChartTheme === 'function') updateChartTheme(isDark);
}

function showQuickTools() { document.getElementById('quickToolsModal').style.display = 'block'; }
function closeQuickTools() { document.getElementById('quickToolsModal').style.display = 'none'; }
function showUserManual() { document.getElementById('userManualModal').style.display = 'block'; }
function closeUserManual() { document.getElementById('userManualModal').style.display = 'none'; }

function init3DInteractions() {
    const interactiveCards = document.querySelectorAll('.card, .chart-box, .analytics-card');
    const maxTilt = 10;
    interactiveCards.forEach(card => {
        if (card.dataset.tiltBound === 'true') return;
        card.dataset.tiltBound = 'true';
        card.addEventListener('pointermove', (event) => {
            const rect = card.getBoundingClientRect();
            const x = (event.clientX - rect.left) / rect.width - 0.5;
            const y = (event.clientY - rect.top) / rect.height - 0.5;
            card.style.setProperty('--tiltX', (-y * maxTilt).toFixed(2) + 'deg');
            card.style.setProperty('--tiltY', (x * maxTilt).toFixed(2) + 'deg');
        });
        card.addEventListener('pointerleave', () => { card.style.setProperty('--tiltX', '0deg'); card.style.setProperty('--tiltY', '0deg'); });
    });
}

function initHeaderOnScroll() {
    const header = document.querySelector('.top-header');
    if (!header) return;
    let isCompact = false;
    window.addEventListener('scroll', () => {
        const y = window.scrollY || window.pageYOffset || 0;
        if (!isCompact && y > 80) { header.classList.add('compact'); isCompact = true; }
        else if (isCompact && y < 40) { header.classList.remove('compact'); isCompact = false; }
    }, { passive: true });
}

function initButtonRipples() {
    document.addEventListener('pointerdown', (event) => {
        const button = event.target.closest('button');
        if (!button) return;
        const rect = button.getBoundingClientRect();
        const circle = document.createElement('span');
        circle.className = 'ripple-circle';
        circle.style.width = circle.style.height = Math.max(rect.width, rect.height) + 'px';
        circle.style.left = (event.clientX - rect.left) + 'px';
        circle.style.top = (event.clientY - rect.top) + 'px';
        button.appendChild(circle);
        circle.addEventListener('animationend', () => circle.remove());
    });
}

function initCardShortcuts() {
    const incomeCard = document.querySelector('.card.income');
    const expenseCard = document.querySelector('.card.expense');
    const savingsCard = document.querySelector('.card.savings');

    if (incomeCard) incomeCard.addEventListener('click', () => switchView('budget-view'));
    if (expenseCard) expenseCard.addEventListener('click', () => switchView('transactions-view'));
    if (savingsCard) savingsCard.addEventListener('click', () => switchView('goals-view'));
}

function initFloatingInsight() {
    const floatingBtn = document.getElementById('floatingInsightBtn');
    const modal = document.getElementById('floatingInsightModal');
    const closeBtn = document.getElementById('closeInsightModal');
    if (floatingBtn && modal && closeBtn) {
        floatingBtn.addEventListener('click', () => modal.classList.add('active'));
        closeBtn.addEventListener('click', () => modal.classList.remove('active'));
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('active'); });
    }
    const insightSection = document.querySelector('.insights.insight-section');
    if (insightSection) insightSection.style.display = 'none';
}

/**
 * Animates a number counting up from 0 to a target value.
 * @param {HTMLElement} element - The DOM element to update.
 * @param {number} target - The final number.
 * @param {number} duration - Animation duration in ms.
 * @param {string} prefix - Optional prefix (e.g., '₹').
 */
function animateValue(element, target, duration = 800, prefix = '₹') {
    if (!element) return;
    const start = 0;
    const increment = target / (duration / 16); // 60fps = ~16ms per frame
    let current = start;

    const animate = () => {
        current += increment;
        if (current >= target) {
            element.innerText = `${prefix}${target.toLocaleString()}`;
        } else {
            element.innerText = `${prefix}${Math.floor(current).toLocaleString()}`;
            requestAnimationFrame(animate);
        }
    };
    requestAnimationFrame(animate);
}

function showAccountModal() { document.getElementById('accountModal').style.display = 'block'; }
function closeAccountModal() { document.getElementById('accountModal').style.display = 'none'; }
function showTransferModal() { updateAccountDropdowns(); document.getElementById('transferModal').style.display = 'block'; }
function closeTransferModal() { document.getElementById('transferModal').style.display = 'none'; }

function toggleMenu() {
    const menu = document.getElementById('navMenu');
    const btn = document.querySelector('.hamburger-btn');
    const overlay = document.getElementById('menuOverlay');
    const hub = document.querySelector('.hero-3d-container'); // Grab the 3D container
    
    menu.classList.toggle('open');
    btn.classList.toggle('open');
    overlay.classList.toggle('active');
    
    // Disable touches on the 3D scene when menu is open
    if (hub) hub.style.pointerEvents = menu.classList.contains('open') ? 'none' : 'auto';
}

function closeMenu() {
    const menu = document.getElementById('navMenu');
    const btn = document.querySelector('.hamburger-btn');
    const overlay = document.getElementById('menuOverlay');
    const hub = document.querySelector('.hero-3d-container');
    
    if (menu && menu.classList.contains('open')) {
        menu.classList.remove('open');
        btn.classList.remove('open');
        overlay.classList.remove('active');
        if (hub) hub.style.pointerEvents = 'auto'; // Re-enable touches
    }



}
