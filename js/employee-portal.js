/* =============================================
   GDR Construction - Employee Portal JS
   ============================================= */

// ---- Data Store (localStorage-backed) ----
const Store = {
  get: (key) => { try { return JSON.parse(localStorage.getItem('gdr_' + key)) || null; } catch { return null; } },
  set: (key, val) => localStorage.setItem('gdr_' + key, JSON.stringify(val)),
  employees: () => Store.get('employees') || sampleEmployees(),
  attendance: () => Store.get('attendance') || {},
  session: () => Store.get('emp_session'),
  setSession: (emp) => Store.set('emp_session', emp),
  clearSession: () => localStorage.removeItem('gdr_emp_session')
};

// ---- Sample Employee Data ----
function sampleEmployees() {
  const employees = [
    { id: 'GDR001', name: 'Ramesh Kumar', mobile: '9876543210', password: 'emp1234', role: 'Mason', dept: 'Labour', project: 'Jaipur Residency', location: 'Jaipur', dailyRate: 650, joinDate: '2023-01-15', aadhar: '1234-5678-9012', status: 'active' },
    { id: 'GDR002', name: 'Suresh Sharma', mobile: '9876543211', password: 'emp1234', role: 'Carpenter', dept: 'Labour', project: 'Jodhpur Mall', location: 'Jodhpur', dailyRate: 700, joinDate: '2023-03-20', aadhar: '2345-6789-0123', status: 'active' },
    { id: 'GDR003', name: 'Mohan Lal', mobile: '9876543212', password: 'emp1234', role: 'Site Engineer', dept: 'Engineering', project: 'Delhi Metro', location: 'Delhi', dailyRate: 1200, joinDate: '2022-11-01', aadhar: '3456-7890-1234', status: 'active' },
    { id: 'GDR004', name: 'Priya Singh', mobile: '9876543213', password: 'emp1234', role: 'Accountant', dept: 'Admin', project: 'Head Office', location: 'Jaipur', dailyRate: 900, joinDate: '2023-06-10', aadhar: '4567-8901-2345', status: 'active' },
    { id: 'GDR005', name: 'Deepak Verma', mobile: '9876543214', password: 'emp1234', role: 'Electrician', dept: 'Engineering', project: 'Gujarat Highway', location: 'Ahmedabad', dailyRate: 800, joinDate: '2023-02-14', aadhar: '5678-9012-3456', status: 'active' },
    { id: 'GDR006', name: 'Anita Rani', mobile: '9876543215', password: 'emp1234', role: 'Labour', dept: 'Labour', project: 'Karnataka Bridge', location: 'Bangalore', dailyRate: 550, joinDate: '2023-08-05', aadhar: '6789-0123-4567', status: 'active' },
    { id: 'GDR007', name: 'Vijay Patel', mobile: '9876543216', password: 'emp1234', role: 'Plumber', dept: 'Labour', project: 'Jaipur Residency', location: 'Jaipur', dailyRate: 680, joinDate: '2023-04-22', aadhar: '7890-1234-5678', status: 'active' },
    { id: 'GDR008', name: 'Ravi Sharma', mobile: '9876543217', password: 'emp1234', role: 'Safety Officer', dept: 'Management', project: 'Jodhpur Mall', location: 'Jodhpur', dailyRate: 1000, joinDate: '2022-09-15', aadhar: '8901-2345-6789', status: 'active' },
  ];
  Store.set('employees', employees);
  return employees;
}

// ---- Generate attendance data ----
function generateSampleAttendance() {
  const attendance = Store.get('attendance') || {};
  const employees = Store.employees();
  const statuses = ['present', 'present', 'present', 'absent', 'half'];
  const today = new Date();

  employees.forEach(emp => {
    for (let d = 1; d <= today.getDate(); d++) {
      const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      if (!attendance[dateStr]) attendance[dateStr] = {};
      if (!attendance[dateStr][emp.id]) {
        const dayOfWeek = new Date(dateStr).getDay();
        attendance[dateStr][emp.id] = dayOfWeek === 0 ? 'absent' : statuses[Math.floor(Math.random() * statuses.length)];
      }
    }
  });

  Store.set('attendance', attendance);
  return attendance;
}

// ---- AUTH ----
function empLogin(event) {
  if (event) event.preventDefault();
  const mobile = document.getElementById('empMobile')?.value?.trim();
  const password = document.getElementById('empPassword')?.value?.trim();
  const errorEl = document.getElementById('loginError');

  if (!mobile || !password) {
    showError(errorEl, 'Please enter mobile number and password.');
    return;
  }

  const employees = Store.employees();
  const emp = employees.find(e => e.mobile === mobile && e.password === password);

  if (!emp) {
    showError(errorEl, 'Invalid mobile number or password. Try: 9876543210 / emp1234');
    return;
  }

  Store.setSession(emp);
  showToast('Welcome back, ' + emp.name + '! 👋', 'success');
  setTimeout(() => { window.location.href = 'employee-dashboard.html'; }, 800);
}

function empSetPassword(event) {
  if (event) event.preventDefault();
  const mobile = document.getElementById('newMobile')?.value?.trim();
  const password = document.getElementById('newPassword')?.value?.trim();
  const confirm = document.getElementById('confirmPassword')?.value?.trim();
  const errorEl = document.getElementById('setPassError');

  if (!mobile || !password || !confirm) {
    showError(errorEl, 'All fields are required.'); return;
  }
  if (password.length < 6) {
    showError(errorEl, 'Password must be at least 6 characters.'); return;
  }
  if (password !== confirm) {
    showError(errorEl, 'Passwords do not match.'); return;
  }

  const employees = Store.employees();
  const idx = employees.findIndex(e => e.mobile === mobile);
  if (idx === -1) {
    showError(errorEl, 'Mobile number not found. Contact admin.'); return;
  }

  employees[idx].password = password;
  Store.set('employees', employees);
  showToast('Password set successfully! You can now login.', 'success');
  setTimeout(() => switchLoginTab('login'), 1000);
}

function empLogout() {
  Store.clearSession();
  window.location.href = 'employee-login.html';
}

function requireEmpAuth() {
  const session = Store.session();
  if (!session) {
    window.location.href = 'employee-login.html';
    return null;
  }
  return session;
}

// ---- DASHBOARD ----
function initEmployeeDashboard() {
  const emp = requireEmpAuth();
  if (!emp) return;

  generateSampleAttendance();

  // Set user info in nav
  document.querySelectorAll('.emp-name').forEach(el => el.textContent = emp.name);
  document.querySelectorAll('.emp-role').forEach(el => el.textContent = emp.role + ' • ' + emp.dept);
  document.querySelectorAll('.emp-avatar').forEach(el => el.textContent = emp.name.charAt(0));
  document.querySelectorAll('.emp-id').forEach(el => el.textContent = emp.id);
  document.querySelectorAll('.emp-mobile').forEach(el => el.textContent = emp.mobile);
  document.querySelectorAll('.emp-project').forEach(el => el.textContent = emp.project);
  document.querySelectorAll('.emp-location').forEach(el => el.textContent = emp.location);
  document.querySelectorAll('.emp-join').forEach(el => el.textContent = formatDate(emp.joinDate));
  document.querySelectorAll('.emp-rate').forEach(el => el.textContent = '₹' + emp.dailyRate + '/day');

  // Load stats
  loadEmployeeStats(emp);

  // Load calendar
  loadAttendanceCalendar(emp);
}

function loadEmployeeStats(emp) {
  const attendance = Store.attendance();
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = formatDateStr(today);

  let present = 0, absent = 0, half = 0, overtime = 0;

  for (let d = 1; d <= today.getDate(); d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const status = attendance[dateStr]?.[emp.id];
    if (status === 'present') present++;
    else if (status === 'absent') absent++;
    else if (status === 'half') half++;
    else if (status === 'overtime') overtime++;
  }

  const earnings = (present * emp.dailyRate) + (half * emp.dailyRate * 0.5) + (overtime * emp.dailyRate * 1.5);

  setEl('statPresent', present);
  setEl('statAbsent', absent);
  setEl('statHalf', half);
  setEl('statEarnings', '₹' + earnings.toLocaleString('en-IN'));
  setEl('attendPercent', Math.round((present / (present + absent + half || 1)) * 100) + '%');
}

function loadAttendanceCalendar(emp) {
  const calGrid = document.getElementById('calGrid');
  const calMonthLabel = document.getElementById('calMonthLabel');
  if (!calGrid) return;

  const attendance = Store.attendance();
  const today = new Date();

  renderCalendar(calGrid, calMonthLabel, today.getFullYear(), today.getMonth(), emp.id, attendance);
}

function renderCalendar(grid, label, year, month, empId, attendance) {
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  if (label) label.textContent = months[month] + ' ' + year;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  let html = dayNames.map(d => `<div class="cal-day-name">${d}</div>`).join('');

  for (let i = 0; i < firstDay; i++) {
    html += `<div class="cal-day empty"></div>`;
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const status = attendance[dateStr]?.[empId] || '';
    const isToday = d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
    html += `<div class="cal-day ${status} ${isToday ? 'today' : ''}" title="${dateStr}: ${status || 'No record'}">${d}</div>`;
  }

  grid.innerHTML = html;
}

// ---- CHANGE PASSWORD ----
function changeEmpPassword(event) {
  if (event) event.preventDefault();
  const emp = Store.session();
  if (!emp) return;

  const current = document.getElementById('currentPw')?.value;
  const newPw = document.getElementById('newPw')?.value;
  const confirmPw = document.getElementById('confirmPw')?.value;

  if (!current || !newPw || !confirmPw) { showToast('All fields are required', 'error'); return; }
  if (newPw.length < 6) { showToast('Password must be at least 6 characters', 'error'); return; }
  if (newPw !== confirmPw) { showToast('Passwords do not match', 'error'); return; }

  const employees = Store.employees();
  const idx = employees.findIndex(e => e.id === emp.id);

  if (employees[idx].password !== current) {
    showToast('Current password is incorrect', 'error'); return;
  }

  employees[idx].password = newPw;
  Store.set('employees', employees);
  Store.setSession(employees[idx]);
  showToast('Password changed successfully! ✅', 'success');
  document.getElementById('changePwForm')?.reset();
}

// ---- UTILS ----
function showError(el, msg) {
  if (el) { el.textContent = msg; el.classList.remove('hidden'); }
  else showToast(msg, 'error');
}

function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function formatDate(str) {
  if (!str) return '—';
  const d = new Date(str);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function showToast(message, type = 'info') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
  document.body.appendChild(toast);

  setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3500);
}

function switchLoginTab(tab) {
  document.querySelectorAll('.login-tab-content').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.modal-tab').forEach(el => el.classList.remove('active'));

  const content = document.getElementById('tab-' + tab);
  const btn = document.querySelector(`[data-tab="${tab}"]`);
  if (content) content.classList.remove('hidden');
  if (btn) btn.classList.add('active');
}

function switchSidebar(page) {
  document.querySelectorAll('.sidebar-link').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.portal-page').forEach(el => el.classList.add('hidden'));

  const link = document.querySelector(`[data-page="${page}"]`);
  const pageEl = document.getElementById('page-' + page);
  if (link) link.classList.add('active');
  if (pageEl) pageEl.classList.remove('hidden');
}
