const API_BASE = 'http://localhost:8000';

let transactions = [];
let monthlyIncome = 0;
let monthlyExpenses = 0;
let sortDirection = 'desc';
let currentSortColumn = 'date';
let currentFilter = 'all';
let deleteTargetId = null;

// ===================== GREETING & DATE =====================
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
}

function updateHeaderDate() {
  const now = new Date();
  const options = { day: 'numeric', month: 'long', year: 'numeric' };
  document.getElementById('currentDate').textContent = now.toLocaleDateString('en-US', options);
}

function setGreeting(email) {
  const name = email ? email.split('@')[0] : 'User';
  document.getElementById('greetingText').textContent = `${getGreeting()}, ${name}!`;
  document.getElementById('cardHolderName').textContent = name;
}

// ===================== AUTH =====================
function showAuthAlert(panelId, message, type = 'error') {
  const alert = document.getElementById(panelId);
  const icon = type === 'error' ? 'fa-exclamation-circle' : 'fa-check-circle';
  alert.className = `auth-alert auth-alert-${type}`;
  alert.innerHTML = `<i class="fas ${icon}"></i><span>${message}</span>`;
  alert.style.display = 'flex';
  // Auto-hide after 5s
  setTimeout(() => { alert.style.display = 'none'; }, 5000);
}

function showLogin() {
  document.getElementById('loginPanel').style.display = 'flex';
  document.getElementById('signupPanel').style.display = 'none';
  document.getElementById('loginAlert').style.display = 'none';
}

function showSignup() {
  document.getElementById('loginPanel').style.display = 'none';
  document.getElementById('signupPanel').style.display = 'flex';
  document.getElementById('signupAlert').style.display = 'none';
}

async function handleLogin() {
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  if (!email || !password) {
    showAuthAlert('loginAlert', 'Please enter your email and password', 'error');
    return;
  }
  const btn = document.getElementById('loginBtn');
  btn.disabled = true;
  btn.querySelector('span').textContent = 'Signing in...';
  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    if (response.ok) {
      localStorage.setItem('token', data.idToken);
      localStorage.setItem('userEmail', data.email);
      document.getElementById('authScreen').style.display = 'none';
      document.getElementById('appHeader').style.display = 'flex';
      document.getElementById('appMain').style.display = 'block';
      setGreeting(data.email);
      document.getElementById('loginEmail').value = '';
      document.getElementById('loginPassword').value = '';
      fetchExpenses();
    } else {
      showAuthAlert('loginAlert', data.detail || 'Invalid email or password. Please try again.', 'error');
    }
  } catch (error) {
    showAuthAlert('loginAlert', 'Unable to connect to server. Check your connection.', 'error');
  }
  btn.disabled = false;
  btn.querySelector('span').textContent = 'Sign In';
}

async function handleSignup() {
  const email = document.getElementById('signupEmail').value;
  const password = document.getElementById('signupPassword').value;
  const confirm = document.getElementById('signupConfirm').value;
  if (!email || !password || !confirm) {
    showAuthAlert('signupAlert', 'Please fill in all fields', 'error');
    return;
  }
  if (password !== confirm) {
    showAuthAlert('signupAlert', 'Passwords do not match', 'error');
    return;
  }
  if (password.length < 6) {
    showAuthAlert('signupAlert', 'Password must be at least 6 characters', 'error');
    return;
  }
  const btn = document.getElementById('signupBtn');
  btn.disabled = true;
  btn.querySelector('span').textContent = 'Creating...';
  try {
    const response = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    if (response.ok) {
      showAuthAlert('signupAlert', 'Account created successfully! Redirecting to login...', 'success');
      document.getElementById('signupEmail').value = '';
      document.getElementById('signupPassword').value = '';
      document.getElementById('signupConfirm').value = '';
      setTimeout(() => showLogin(), 2000);
    } else {
      showAuthAlert('signupAlert', data.detail || 'Registration failed. Try a different email.', 'error');
    }
  } catch (error) {
    showAuthAlert('signupAlert', 'Unable to connect to server. Check your connection.', 'error');
  }
  btn.disabled = false;
  btn.querySelector('span').textContent = 'Create Account';
}

function handleLogout() {
  localStorage.removeItem('token');
  localStorage.removeItem('userEmail');
  transactions = [];
  monthlyIncome = 0;
  monthlyExpenses = 0;
  document.getElementById('authScreen').style.display = 'flex';
  document.getElementById('appHeader').style.display = 'none';
  document.getElementById('appMain').style.display = 'none';
  showLogin();
}

function handleGoogleLogin() {
  window.location.href = `${API_BASE}/auth/google/start`;
}

// ===================== DATA FETCHING =====================
async function fetchExpenses() {
  const token = localStorage.getItem('token');
  if (!token) return;
  try {
    const response = await fetch(`${API_BASE}/expenses/`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (response.ok) {
      const data = await response.json();
      transactions = data.map(item => ({
        id: item.id,
        date: item.date,
        category: item.category,
        amount: item.amount,
        type: item.amount > 0 ? 'income' : 'expense',
        description: item.description || ''
      }));
      recalcTotals();
      updateAll();
    }
  } catch (error) {
    console.error('Error loading data:', error);
  }
}

function recalcTotals() {
  monthlyIncome = 0;
  monthlyExpenses = 0;
  transactions.forEach(t => {
    if (t.amount > 0) monthlyIncome += t.amount;
    else monthlyExpenses += Math.abs(t.amount);
  });
}

function updateAll() {
  updateDashboard();
  updateTransactionsTable();
  updateCategoryBreakdown();
  updateOverviewChart();
}

// ===================== ADD INCOME / EXPENSE =====================
async function addIncome() {
  const amountInput = parseFloat(document.getElementById('incomeAmount').value);
  const category = document.getElementById('incomeCategory').value;
  const description = document.getElementById('incomeDescription').value;
  const date = document.getElementById('incomeDate').value;
  if (!amountInput || !category || !date) { alert('Please fill in all required fields'); return; }
  const token = localStorage.getItem('token');
  if (!token) { alert('You have been logged out!'); return; }
  try {
    const response = await fetch(`${API_BASE}/expenses/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ amount: amountInput, category: category.charAt(0).toUpperCase() + category.slice(1), description, date })
    });
    if (response.ok) {
      const saved = await response.json();
      saved.type = 'income';
      transactions.unshift(saved);
      recalcTotals();
      updateAll();
      closeModal('incomeModal');
      showNotification('Income saved successfully!', 'success');
    } else {
      const err = await response.json();
      alert('Error: ' + (err.detail || 'Unknown'));
    }
  } catch (error) { alert('Unable to connect to server!'); }
}

async function addExpense() {
  const amountInput = parseFloat(document.getElementById('expenseAmount').value);
  const category = document.getElementById('expenseCategory').value;
  const description = document.getElementById('expenseDescription').value;
  const date = document.getElementById('expenseDate').value;
  if (!amountInput || !category || !date) { alert('Please fill in all required fields'); return; }
  const token = localStorage.getItem('token');
  if (!token) { alert('You have been logged out!'); return; }
  try {
    const response = await fetch(`${API_BASE}/expenses/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ amount: -amountInput, category: category.charAt(0).toUpperCase() + category.slice(1), description, date })
    });
    if (response.ok) {
      const saved = await response.json();
      saved.type = 'expense';
      transactions.unshift(saved);
      recalcTotals();
      updateAll();
      closeModal('expenseModal');
      showNotification('Expense saved successfully!', 'success');
    } else {
      const err = await response.json();
      alert('Error: ' + (err.detail || 'Unknown'));
    }
  } catch (error) { alert('Unable to connect to server!'); }
}

// ===================== DASHBOARD UPDATE =====================
function updateDashboard() {
  document.querySelector('.income-amount').textContent = `${monthlyIncome.toLocaleString('vi-VN')} đ`;
  document.querySelector('.expense-amount').textContent = `${monthlyExpenses.toLocaleString('vi-VN')} đ`;

  // Balance card — progress bar shows REMAINING proportion
  const balance = monthlyIncome - monthlyExpenses;
  document.getElementById('balanceAmount').textContent = `${balance.toLocaleString('vi-VN')} đ`;

  if (monthlyIncome > 0) {
    const remainPct = Math.max(0, Math.min((balance / monthlyIncome) * 100, 100));
    document.getElementById('balanceUsedText').textContent = `spent ${monthlyExpenses.toLocaleString('vi-VN')} đ of ${monthlyIncome.toLocaleString('vi-VN')} đ income`;
    document.getElementById('balanceProgressFill').style.width = `${remainPct}%`;
  } else {
    document.getElementById('balanceUsedText').textContent = 'No income recorded yet';
    document.getElementById('balanceProgressFill').style.width = '0%';
  }

  // Income/Expense change indicators
  const incTx = transactions.filter(t => t.amount > 0).length;
  const expTx = transactions.filter(t => t.amount < 0).length;
  document.getElementById('incomeChange').innerHTML = `<i class="fas fa-receipt"></i> ${incTx} transaction${incTx !== 1 ? 's' : ''}`;
  document.getElementById('expenseChange').innerHTML = `<i class="fas fa-receipt"></i> ${expTx} transaction${expTx !== 1 ? 's' : ''}`;
}

// ===================== CATEGORY BREAKDOWN =====================
const CATEGORY_COLORS = {
  'Food': '#ea580c', 'Health': '#ec4899', 'Entertainment': '#f59e0b', 'Shopping': '#eab308',
  'Investment': '#10b981', 'Transport': '#3b82f6', 'Utilities': '#8b5cf6',
  'Salary': '#06b6d4', 'Freelance': '#14b8a6', 'Business': '#6366f1', 'Other': '#9ca3af'
};

function updateCategoryBreakdown() {
  const expenseOnly = transactions.filter(t => t.amount < 0);
  const catTotals = {};
  expenseOnly.forEach(t => {
    const cat = t.category || 'Other';
    catTotals[cat] = (catTotals[cat] || 0) + Math.abs(t.amount);
  });

  const totalExp = Object.values(catTotals).reduce((a, b) => a + b, 0);
  document.getElementById('totalExpensesAmount').textContent = `${totalExp.toLocaleString('vi-VN')} đ`;

  // Category list
  const catList = document.getElementById('categoryList');
  catList.innerHTML = '';
  const sorted = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);

  if (sorted.length === 0) {
    catList.innerHTML = '<li style="padding: 1rem; color: #9ca3af; text-align: center;">No expenses yet</li>';
    document.getElementById('categoryColorBar').style.background = '#e5e7eb';
    return;
  }

  // Color bar gradient
  const gradientParts = sorted.map(([cat, val]) => {
    const color = CATEGORY_COLORS[cat] || '#9ca3af';
    const pct = (val / totalExp) * 100;
    return { color, pct };
  });
  let cumulative = 0;
  const gradientStops = gradientParts.map(p => {
    const start = cumulative;
    cumulative += p.pct;
    return `${p.color} ${start}% ${cumulative}%`;
  });
  document.getElementById('categoryColorBar').style.background = `linear-gradient(to right, ${gradientStops.join(', ')})`;

  sorted.forEach(([cat, val]) => {
    const li = document.createElement('li');
    li.className = 'expense-category';
    const color = CATEGORY_COLORS[cat] || '#9ca3af';
    const pct = ((val / totalExp) * 100).toFixed(1);
    li.innerHTML = `
      <div class="category-info">
        <div class="category-dot" style="background: ${color};"></div>
        <span>${cat}</span>
      </div>
      <span>${val.toLocaleString('vi-VN')} đ (${pct}%)</span>`;
    catList.appendChild(li);
  });
}

// ===================== OVERVIEW CHART =====================
function updateOverviewChart() {
  const container = document.getElementById('overviewChart');
  const labelsContainer = document.getElementById('chartLabels');
  container.innerHTML = '';
  labelsContainer.innerHTML = '';

  const period = document.getElementById('chartPeriod') ? document.getElementById('chartPeriod').value : 'monthly';
  const chartFilter = document.getElementById('chartFilter') ? document.getElementById('chartFilter').value : 'both';
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  // Group data by period
  const grouped = {};

  transactions.forEach(t => {
    const d = new Date(t.date);
    let key, label;
    if (period === 'daily') {
      key = t.date;
      label = `${d.getDate()} ${monthNames[d.getMonth()]}`;
    } else if (period === 'weekly') {
      const startOfWeek = new Date(d);
      startOfWeek.setDate(d.getDate() - d.getDay());
      key = startOfWeek.toISOString().split('T')[0];
      label = `W${Math.ceil(d.getDate() / 7)} ${monthNames[d.getMonth()]}`;
    } else if (period === 'yearly') {
      key = `${d.getFullYear()}`;
      label = `${d.getFullYear()}`;
    } else {
      key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      label = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
    }
    if (!grouped[key]) grouped[key] = { income: 0, expense: 0, label };
    if (t.amount > 0) grouped[key].income += t.amount;
    else grouped[key].expense += Math.abs(t.amount);
  });

  const keys = Object.keys(grouped).sort();
  const maxSlots = period === 'daily' ? 14 : period === 'weekly' ? 8 : period === 'yearly' ? 6 : 6;
  const display = keys.slice(-maxSlots);

  if (display.length === 0) {
    container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;width:100%;color:#9ca3af;"><p>No data to display</p></div>';
    return;
  }

  const showIncome = chartFilter !== 'expense';
  const showExpense = chartFilter !== 'income';
  const maxVal = Math.max(...display.map(k => {
    let vals = [];
    if (showIncome) vals.push(grouped[k].income);
    if (showExpense) vals.push(grouped[k].expense);
    return Math.max(...vals);
  }), 1);
  const maxBarHeight = Math.max(container.clientHeight - 40, 80);

  display.forEach(key => {
    const d = grouped[key];
    const barGroup = document.createElement('div');
    barGroup.style.cssText = 'display:flex;gap:3px;align-items:flex-end;flex:1;justify-content:center;position:relative;cursor:pointer;min-width:0;';
    let titleParts = [d.label];
    if (showIncome) titleParts.push(`Income: ${d.income.toLocaleString('vi-VN')} đ`);
    if (showExpense) titleParts.push(`Expense: ${d.expense.toLocaleString('vi-VN')} đ`);
    barGroup.title = titleParts.join('\n');

    if (showIncome) {
      const incH = (d.income / maxVal) * maxBarHeight;
      const incBar = document.createElement('div');
      incBar.style.cssText = `width:${showExpense ? '16' : '28'}px;height:${Math.max(incH, 4)}px;background:#10b981;border-radius:4px 4px 0 0;transition:height 0.5s ease;`;
      barGroup.appendChild(incBar);
    }
    if (showExpense) {
      const expH = (d.expense / maxVal) * maxBarHeight;
      const expBar = document.createElement('div');
      expBar.style.cssText = `width:${showIncome ? '16' : '28'}px;height:${Math.max(expH, 4)}px;background:#ea580c;border-radius:4px 4px 0 0;transition:height 0.5s ease;`;
      barGroup.appendChild(expBar);
    }
    container.appendChild(barGroup);

    const lbl = document.createElement('span');
    lbl.textContent = d.label;
    lbl.style.cssText = 'font-size:0.7rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:80px;text-align:center;';
    labelsContainer.appendChild(lbl);
  });

  // Legend
  const legend = document.createElement('div');
  legend.style.cssText = 'position:absolute;top:8px;right:12px;display:flex;gap:1rem;font-size:0.75rem;';
  let legendHTML = '';
  if (showIncome) legendHTML += '<span><span style="display:inline-block;width:10px;height:10px;background:#10b981;border-radius:2px;margin-right:4px;"></span>Income</span>';
  if (showExpense) legendHTML += '<span><span style="display:inline-block;width:10px;height:10px;background:#ea580c;border-radius:2px;margin-right:4px;"></span>Expense</span>';
  legend.innerHTML = legendHTML;
  container.style.position = 'relative';
  container.appendChild(legend);
}

// ===================== TRANSACTIONS TABLE =====================
function getFilteredTransactions() {
  let filtered = [...transactions];
  if (currentFilter === 'income') filtered = filtered.filter(t => t.amount > 0);
  else if (currentFilter === 'expense') filtered = filtered.filter(t => t.amount < 0);
  else if (currentFilter !== 'all') filtered = filtered.filter(t => t.category === currentFilter);
  return filtered;
}

function sortByColumn(column) {
  if (currentSortColumn === column) sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
  else { currentSortColumn = column; sortDirection = 'desc'; }
  updateTransactionsTable();
}

function sortTransactions() {
  // Cycle through sort columns: date → amount → category
  const columns = ['date', 'amount', 'category'];
  const currentIdx = columns.indexOf(currentSortColumn);
  if (sortDirection === 'desc') {
    sortDirection = 'asc';
  } else {
    sortDirection = 'desc';
    currentSortColumn = columns[(currentIdx + 1) % columns.length];
  }
  updateTransactionsTable();
  const dir = sortDirection === 'asc' ? '↑' : '↓';
  const colName = currentSortColumn.charAt(0).toUpperCase() + currentSortColumn.slice(1);
  document.getElementById('sortBtn').innerHTML = `<i class="fas fa-sort"></i> ${colName} ${dir}`;
}

function filterTransactions() {
  currentFilter = document.getElementById('filterCategory').value;
  updateTransactionsTable();
}

function updateTransactionsTable() {
  const tbody = document.querySelector('.transactions-table tbody');
  tbody.innerHTML = '';

  let filtered = getFilteredTransactions();

  // Sort
  filtered.sort((a, b) => {
    let valA, valB;
    if (currentSortColumn === 'date') { valA = new Date(a.date); valB = new Date(b.date); }
    else if (currentSortColumn === 'amount') { valA = a.amount; valB = b.amount; }
    else { valA = a.category; valB = b.category; }
    if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
    if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const noTx = document.getElementById('noTransactions');
  if (filtered.length === 0) {
    noTx.style.display = 'block';
    return;
  }
  noTx.style.display = 'none';

  const recent = filtered.slice(0, 20);
  recent.forEach(t => {
    const row = document.createElement('tr');
    const formattedDate = new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const amountDisplay = t.amount > 0
      ? `+${t.amount.toLocaleString('vi-VN')} đ`
      : `-${Math.abs(t.amount).toLocaleString('vi-VN')} đ`;
    const color = t.amount > 0 ? '#10b981' : '#ef4444';

    row.innerHTML = `
      <td>${formattedDate}</td>
      <td>${t.category}</td>
      <td style="color: ${color}; font-weight: 600;">${amountDisplay}</td>
      <td style="color: #6b7280; font-size: 0.875rem;">${t.description || '—'}</td>
      <td><button class="action-btn" onclick="requestDelete('${t.id}', '${t.category}', ${t.amount})" title="Delete"><i class="fas fa-trash" style="color: #ef4444;"></i></button></td>`;
    tbody.appendChild(row);
  });
}

// ===================== DELETE =====================
function requestDelete(id, category, amount) {
  deleteTargetId = id;
  const amtStr = amount > 0 ? `+${amount.toLocaleString('vi-VN')} đ` : `-${Math.abs(amount).toLocaleString('vi-VN')} đ`;
  document.getElementById('deleteDetail').textContent = `${category}: ${amtStr}`;
  document.getElementById('deleteModal').style.display = 'block';
}

async function confirmDelete() {
  if (!deleteTargetId) return;
  const token = localStorage.getItem('token');
  try {
    const response = await fetch(`${API_BASE}/expenses/${deleteTargetId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (response.ok) {
      transactions = transactions.filter(t => t.id !== deleteTargetId);
      recalcTotals();
      updateAll();
      showNotification('Transaction deleted!', 'success');
    } else {
      showNotification('Failed to delete', 'error');
    }
  } catch (e) {
    // If backend doesn't have DELETE endpoint, remove locally
    transactions = transactions.filter(t => t.id !== deleteTargetId);
    recalcTotals();
    updateAll();
    showNotification('Removed from view', 'success');
  }
  deleteTargetId = null;
  closeModal('deleteModal');
}

// ===================== EXPORT CSV =====================
function exportToCSV() {
  if (transactions.length === 0) { alert('No transactions to export!'); return; }
  const headers = ['Date', 'Category', 'Amount', 'Type', 'Description'];
  const rows = transactions.map(t => [t.date, t.category, t.amount, t.type, `"${t.description || ''}"`]);
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `expenses_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showNotification('CSV exported successfully!', 'success');
}

// ===================== MODALS =====================
const today = new Date().toISOString().split('T')[0];

function openIncomeModal() {
  document.getElementById('incomeModal').style.display = 'block';
  document.getElementById('incomeDate').value = today;
  document.body.style.overflow = 'hidden';
}

function openExpenseModal() {
  document.getElementById('expenseModal').style.display = 'block';
  document.getElementById('expenseDate').value = today;
  document.body.style.overflow = 'hidden';
}

function closeModal(modalId) {
  document.getElementById(modalId).style.display = 'none';
  document.body.style.overflow = 'auto';
  if (modalId === 'incomeModal') document.getElementById('incomeForm').reset();
  else if (modalId === 'expenseModal') document.getElementById('expenseForm').reset();
}

window.onclick = function (event) {
  ['incomeModal', 'expenseModal', 'deleteModal'].forEach(id => {
    if (event.target === document.getElementById(id)) closeModal(id);
  });
};

// ===================== NOTIFICATION =====================
function showNotification(message, type = 'success') {
  const n = document.createElement('div');
  n.style.cssText = `position:fixed;top:2rem;right:2rem;background:${type === 'success' ? '#10b981' : '#ef4444'};color:white;padding:1rem 1.5rem;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);z-index:1001;animation:slideInRight 0.3s ease;font-weight:500;`;
  n.textContent = message;
  document.body.appendChild(n);
  setTimeout(() => { n.style.animation = 'slideOutRight 0.3s ease'; setTimeout(() => document.body.removeChild(n), 300); }, 3000);
}

// Notification animations
const styleEl = document.createElement('style');
styleEl.textContent = `
  @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
  @keyframes slideOutRight { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
`;
document.head.appendChild(styleEl);

// ===================== KEYBOARD SHORTCUTS =====================
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') { closeModal('incomeModal'); closeModal('expenseModal'); closeModal('deleteModal'); }
  if (e.ctrlKey && e.key === 'i') { e.preventDefault(); openIncomeModal(); }
  if (e.ctrlKey && e.key === 'e') { e.preventDefault(); openExpenseModal(); }
});

// ===================== HOVER EFFECTS =====================
document.querySelectorAll('.card').forEach(card => {
  card.addEventListener('mouseenter', function () { this.style.transform = 'translateY(-2px)'; this.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; this.style.transition = 'all 0.2s ease'; });
  card.addEventListener('mouseleave', function () { this.style.transform = 'translateY(0)'; this.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'; });
});

// ===================== INIT =====================
document.addEventListener('DOMContentLoaded', () => {
  updateHeaderDate();

  // Restore dark mode preference
  if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark-mode');
    const icon = document.getElementById('themeIcon');
    if (icon) { icon.classList.remove('fa-moon'); icon.classList.add('fa-sun'); }
  }

  const urlParams = new URLSearchParams(window.location.search);
  const tokenFromUrl = urlParams.get('id_token');
  const emailFromUrl = urlParams.get('email');

  if (tokenFromUrl) {
    localStorage.setItem('token', tokenFromUrl);
    if (emailFromUrl) localStorage.setItem('userEmail', emailFromUrl);
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  const token = localStorage.getItem('token');
  if (token) {
    document.getElementById('authScreen').style.display = 'none';
    document.getElementById('appHeader').style.display = 'flex';
    document.getElementById('appMain').style.display = 'block';
    const userEmail = localStorage.getItem('userEmail');
    setGreeting(userEmail);
    fetchExpenses();
  } else {
    document.getElementById('authScreen').style.display = 'flex';
  }
});

// ===================== DARK MODE =====================
function toggleDarkMode() {
  const body = document.body;
  body.classList.toggle('dark-mode');
  const isDark = body.classList.contains('dark-mode');
  localStorage.setItem('darkMode', isDark);
  const icon = document.getElementById('themeIcon');
  if (isDark) { icon.classList.remove('fa-moon'); icon.classList.add('fa-sun'); }
  else { icon.classList.remove('fa-sun'); icon.classList.add('fa-moon'); }
}

// ===================== CARD THEME =====================
const THEME_IMAGES = {
  capybara1: './images/capybara1.jpg',
  capybara2: './images/capybara2.jpg',
  capybara3: './images/capybara3.jpg',
  snoopy1:   './images/snoopy1.jpg',
  snoopy2:   './images/snoopy2.jpg',
  snoopy3:   './images/snoopy3.jpg',
  snoopy4:   './images/snoopy4.jpg',
  snoopy5:   './images/snoopy5.jpg',
};

function changeCardTheme() {
  const theme = document.getElementById('cardThemeSelector').value;
  const card = document.querySelector('.my-card');

  // Remove existing theme class
  card.className = card.className.split(' ').filter(c => !c.startsWith('theme-')).join(' ');

  // Remove existing bg image element
  const oldBg = card.querySelector('.card-theme-bg');
  if (oldBg) oldBg.remove();

  if (theme !== 'default' && THEME_IMAGES[theme]) {
    card.classList.add(`theme-${theme}`);
    // Insert image
    const img = document.createElement('img');
    img.className = 'card-theme-bg';
    img.src = THEME_IMAGES[theme];
    img.alt = '';
    card.insertBefore(img, card.firstChild);

    // Size the image so that AFTER -90deg rotation it fills the card:
    // Pre-rotation width → becomes visual height after rotation
    // Pre-rotation height → becomes visual width after rotation
    // So: img.width = cardHeight, img.height = cardWidth
    const sizeThemeBg = () => {
      const rect = card.getBoundingClientRect();
      img.style.width = rect.height + 'px';
      img.style.height = rect.width + 'px';
    };
    requestAnimationFrame(sizeThemeBg);

    // Re-size on window resize
    window._cardThemeResizer = sizeThemeBg;
  } else {
    window._cardThemeResizer = null;
  }

  localStorage.setItem('cardTheme', theme);
}

// Handle resize
window.addEventListener('resize', () => {
  if (window._cardThemeResizer) window._cardThemeResizer();
});

// Initialize card theme on load
document.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('cardTheme');
  if (savedTheme) {
    const selector = document.getElementById('cardThemeSelector');
    if(selector) {
      selector.value = savedTheme;
      changeCardTheme();
    }
  }
});