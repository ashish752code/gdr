/* =============================================
   GDR Construction - Admin Portal JS
   ============================================= */

// ---- Admin Credentials ----
const ADMIN_CREDENTIALS = { username: 'admin', password: 'gdr2024' };

// ---- Store (shared with employee portal) ----
const AdminStore = {
  get: (key) => { try { return JSON.parse(localStorage.getItem('gdr_' + key)) || null; } catch { return null; } },
  set: (key, val) => localStorage.setItem('gdr_' + key, JSON.stringify(val)),
  employees: () => AdminStore.get('employees') || [],
  attendance: () => AdminStore.get('attendance') || {},
  session: () => AdminStore.get('admin_session'),
  setSession: () => AdminStore.set('admin_session', { loggedIn: true, time: Date.now() }),
  clearSession: () => localStorage.removeItem('gdr_admin_session')
};

// ---- AUTH ----
function adminLogin(event) {
  if (event) event.preventDefault();
  const username = document.getElementById('adminUser')?.value?.trim();
  const password = document.getElementById('adminPass')?.value?.trim();
  const errorEl = document.getElementById('adminError');

  if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
    AdminStore.setSession();
    showAdminToast('Welcome back, Admin! 🎉', 'success');
    setTimeout(() => { window.location.href = 'admin-dashboard.html'; }, 800);
  } else {
    if (errorEl) { errorEl.textContent = 'Invalid credentials. Use: admin / gdr2024'; errorEl.classList.remove('hidden'); }
    else showAdminToast('Invalid credentials.', 'error');
  }
}

function adminLogout() {
  AdminStore.clearSession();
  window.location.href = 'admin-login.html';
}

function requireAdminAuth() {
  const session = AdminStore.session();
  if (!session) { window.location.href = 'admin-login.html'; return false; }
  return true;
}

// ---- DASHBOARD INIT ----
function initAdminDashboard() {
  if (!requireAdminAuth()) return;
  loadDashboardStats();
  loadRecentActivity();
}

function loadDashboardStats() {
  const employees = AdminStore.employees();
  const attendance = AdminStore.attendance();
  const today = formatDateStr(new Date());
  const todayAtt = attendance[today] || {};

  const active = employees.filter(e => e.status === 'active').length;
  const todayPresent = Object.values(todayAtt).filter(s => s === 'present' || s === 'overtime').length;
  const totalPayroll = employees.reduce((sum, e) => sum + (e.dailyRate * 26), 0);

  setEl('dashTotal', employees.length);
  setEl('dashActive', active);
  setEl('dashPresent', todayPresent);
  setEl('dashPayroll', '₹' + (totalPayroll / 100000).toFixed(1) + 'L/mo');
}

function loadRecentActivity() {
  const employees = AdminStore.employees();
  const attendance = AdminStore.attendance();
  const today = formatDateStr(new Date());
  const todayAtt = attendance[today] || {};

  const activityEl = document.getElementById('recentActivity');
  if (!activityEl) return;

  const activities = [];
  Object.entries(todayAtt).slice(0, 8).forEach(([empId, status]) => {
    const emp = employees.find(e => e.id === empId);
    if (emp) {
      activities.push({
        icon: status === 'present' ? '✅' : status === 'absent' ? '❌' : '🔸',
        text: `${emp.name} marked ${status}`,
        time: 'Today'
      });
    }
  });

  if (activities.length === 0) {
    activityEl.innerHTML = '<p style="text-align:center;color:#999;padding:24px">No attendance marked today yet</p>';
    return;
  }

  activityEl.innerHTML = activities.map(a => `
    <div class="activity-item">
      <span class="act-icon">${a.icon}</span>
      <span class="act-text">${a.text}</span>
      <span class="act-time">${a.time}</span>
    </div>
  `).join('');
}

// ---- EMPLOYEE MANAGEMENT ----
let currentPage = 1;
const perPage = 10;
let filteredEmployees = [];
let editingEmpId = null;

function initEmployeeManagement() {
  if (!requireAdminAuth()) return;
  filteredEmployees = [...AdminStore.employees()];
  renderEmployeeTable();
}

function renderEmployeeTable() {
  const tbody = document.getElementById('empTableBody');
  if (!tbody) return;

  const start = (currentPage - 1) * perPage;
  const pageData = filteredEmployees.slice(start, start + perPage);

  if (pageData.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:32px;color:#999">No employees found</td></tr>';
    return;
  }

  tbody.innerHTML = pageData.map(emp => `
    <tr>
      <td><strong>${emp.id}</strong></td>
      <td>
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:34px;height:34px;border-radius:50%;background:var(--primary);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:0.87rem;flex-shrink:0">${emp.name.charAt(0)}</div>
          <div>
            <div style="font-weight:600">${emp.name}</div>
            <div style="font-size:0.78rem;color:var(--gray)">${emp.mobile}</div>
          </div>
        </div>
      </td>
      <td>${emp.role}</td>
      <td><span class="badge badge-info">${emp.dept}</span></td>
      <td>${emp.project}</td>
      <td>₹${emp.dailyRate}/day</td>
      <td><span class="badge ${emp.status === 'active' ? 'badge-success' : 'badge-danger'}">${emp.status}</span></td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="btn btn-info btn-xs" onclick="openEditEmployee('${emp.id}')">✏️ Edit</button>
          <button class="btn btn-danger btn-xs" onclick="deleteEmployee('${emp.id}')">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');

  // Pagination
  const totalPages = Math.ceil(filteredEmployees.length / perPage);
  const paginationEl = document.getElementById('empPagination');
  if (paginationEl) {
    paginationEl.innerHTML = '';
    setEl('empCount', `Showing ${start + 1}–${Math.min(start + perPage, filteredEmployees.length)} of ${filteredEmployees.length}`);
    for (let i = 1; i <= totalPages; i++) {
      const btn = document.createElement('button');
      btn.textContent = i;
      if (i === currentPage) btn.classList.add('active');
      btn.onclick = () => { currentPage = i; renderEmployeeTable(); };
      paginationEl.appendChild(btn);
    }
  }
}

function searchEmployees(query) {
  const q = query.toLowerCase();
  const employees = AdminStore.employees();
  filteredEmployees = employees.filter(e =>
    e.name.toLowerCase().includes(q) ||
    e.id.toLowerCase().includes(q) ||
    e.mobile.includes(q) ||
    e.role.toLowerCase().includes(q)
  );
  currentPage = 1;
  renderEmployeeTable();
}

function filterByDept(dept) {
  const employees = AdminStore.employees();
  filteredEmployees = dept ? employees.filter(e => e.dept === dept) : [...employees];
  currentPage = 1;
  renderEmployeeTable();
}

function openAddEmployee() {
  editingEmpId = null;
  document.getElementById('empModalTitle').textContent = 'Add New Employee';
  document.getElementById('empForm')?.reset();
  document.getElementById('empIdField').value = generateEmpId();
  document.getElementById('empModal').classList.remove('hidden');
}

function openEditEmployee(empId) {
  editingEmpId = empId;
  const employees = AdminStore.employees();
  const emp = employees.find(e => e.id === empId);
  if (!emp) return;

  document.getElementById('empModalTitle').textContent = 'Edit Employee';
  document.getElementById('empIdField').value = emp.id;
  document.getElementById('empName').value = emp.name;
  document.getElementById('empMobileField').value = emp.mobile;
  document.getElementById('empAadhar').value = emp.aadhar || '';
  document.getElementById('empRole').value = emp.role;
  document.getElementById('empDept').value = emp.dept;
  document.getElementById('empProject').value = emp.project;
  document.getElementById('empLocation').value = emp.location;
  document.getElementById('empRate').value = emp.dailyRate;
  document.getElementById('empJoin').value = emp.joinDate;
  document.getElementById('empStatus').value = emp.status;
  document.getElementById('empModal').classList.remove('hidden');
}

function saveEmployee(event) {
  if (event) event.preventDefault();
  const employees = AdminStore.employees();

  const empData = {
    id: document.getElementById('empIdField').value,
    name: document.getElementById('empName').value,
    mobile: document.getElementById('empMobileField').value,
    aadhar: document.getElementById('empAadhar').value,
    role: document.getElementById('empRole').value,
    dept: document.getElementById('empDept').value,
    project: document.getElementById('empProject').value,
    location: document.getElementById('empLocation').value,
    dailyRate: parseInt(document.getElementById('empRate').value),
    joinDate: document.getElementById('empJoin').value,
    status: document.getElementById('empStatus').value,
    password: 'emp1234'
  };

  if (editingEmpId) {
    const idx = employees.findIndex(e => e.id === editingEmpId);
    if (idx !== -1) {
      empData.password = employees[idx].password;
      employees[idx] = empData;
    }
    showAdminToast('Employee updated successfully! ✅', 'success');
  } else {
    if (employees.find(e => e.mobile === empData.mobile)) {
      showAdminToast('Mobile number already exists', 'error'); return;
    }
    employees.push(empData);
    showAdminToast('Employee added successfully! ✅', 'success');
  }

  AdminStore.set('employees', employees);
  filteredEmployees = [...employees];
  renderEmployeeTable();
  closeAdminModal('empModal');
}

function deleteEmployee(empId) {
  if (!confirm('Are you sure you want to delete this employee?')) return;
  const employees = AdminStore.employees().filter(e => e.id !== empId);
  AdminStore.set('employees', employees);
  filteredEmployees = [...employees];
  renderEmployeeTable();
  showAdminToast('Employee deleted.', 'warning');
}

function generateEmpId() {
  const employees = AdminStore.employees();
  const nums = employees.map(e => parseInt(e.id.replace('GDR', ''), 10)).filter(n => !isNaN(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return 'GDR' + String(max + 1).padStart(3, '0');
}

// ---- ATTENDANCE MANAGEMENT ----
let currentAttendDate = formatDateStr(new Date());

function initAttendanceManagement() {
  if (!requireAdminAuth()) return;
  document.getElementById('attendDate').value = currentAttendDate;
  loadAttendanceForDate(currentAttendDate);
}

function loadAttendanceForDate(dateStr) {
  currentAttendDate = dateStr;
  const employees = AdminStore.employees().filter(e => e.status === 'active');
  const attendance = AdminStore.attendance();
  const dayAtt = attendance[dateStr] || {};

  const container = document.getElementById('attendList');
  if (!container) return;

  const projectFilter = document.getElementById('attendProjectFilter')?.value;
  const filtered = projectFilter ? employees.filter(e => e.project === projectFilter) : employees;

  let present = 0, absent = 0, half = 0;
  Object.values(dayAtt).forEach(s => {
    if (s === 'present') present++;
    else if (s === 'absent') absent++;
    else if (s === 'half') half++;
  });

  setEl('attPresent', present);
  setEl('attAbsent', absent);
  setEl('attHalf', half);

  const header = `
    <div class="attend-row attend-header">
      <div>Employee</div>
      <div>Department</div>
      <div>Project</div>
      <div>Present</div>
      <div>Absent</div>
      <div>Half Day</div>
    </div>`;

  const rows = filtered.map(emp => {
    const status = dayAtt[emp.id] || 'absent';
    return `
      <div class="attend-row" id="att-row-${emp.id}">
        <div>
          <div style="font-weight:600">${emp.name}</div>
          <div style="font-size:0.78rem;color:var(--gray)">${emp.id}</div>
        </div>
        <div><span class="badge badge-info">${emp.dept}</span></div>
        <div style="font-size:0.83rem">${emp.project}</div>
        <div>
          <button class="attend-status-btn present ${status === 'present' ? 'active' : ''}"
            onclick="markAttendance('${emp.id}', 'present')">✅</button>
        </div>
        <div>
          <button class="attend-status-btn absent ${status === 'absent' ? 'active' : ''}"
            onclick="markAttendance('${emp.id}', 'absent')">❌</button>
        </div>
        <div>
          <button class="attend-status-btn half ${status === 'half' ? 'active' : ''}"
            onclick="markAttendance('${emp.id}', 'half')">🔸</button>
        </div>
      </div>`;
  }).join('');

  container.innerHTML = header + rows;
}

function markAttendance(empId, status) {
  const attendance = AdminStore.attendance();
  if (!attendance[currentAttendDate]) attendance[currentAttendDate] = {};
  attendance[currentAttendDate][empId] = status;
  AdminStore.set('attendance', attendance);

  // Update buttons in the row
  const row = document.getElementById('att-row-' + empId);
  if (row) {
    row.querySelectorAll('.attend-status-btn').forEach(btn => btn.classList.remove('active'));
    row.querySelector(`.attend-status-btn.${status}`)?.classList.add('active');
  }

  // Update counters
  const dayAtt = attendance[currentAttendDate];
  const present = Object.values(dayAtt).filter(s => s === 'present').length;
  const absent = Object.values(dayAtt).filter(s => s === 'absent').length;
  const half = Object.values(dayAtt).filter(s => s === 'half').length;
  setEl('attPresent', present);
  setEl('attAbsent', absent);
  setEl('attHalf', half);
}

function markAllPresent() {
  const employees = AdminStore.employees().filter(e => e.status === 'active');
  const attendance = AdminStore.attendance();
  if (!attendance[currentAttendDate]) attendance[currentAttendDate] = {};
  employees.forEach(e => { attendance[currentAttendDate][e.id] = 'present'; });
  AdminStore.set('attendance', attendance);
  loadAttendanceForDate(currentAttendDate);
  showAdminToast('All employees marked present', 'success');
}

// ---- PAYOUT ----
function initPayoutManagement() {
  if (!requireAdminAuth()) return;
  loadPayoutData();
}

function loadPayoutData() {
  const employees = AdminStore.employees().filter(e => e.status === 'active');
  const attendance = AdminStore.attendance();
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  const payouts = employees.map(emp => {
    let present = 0, half = 0, overtime = 0;
    for (let d = 1; d <= new Date(year, month + 1, 0).getDate(); d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const status = attendance[dateStr]?.[emp.id];
      if (status === 'present') present++;
      else if (status === 'half') half++;
      else if (status === 'overtime') overtime++;
    }

    const gross = (present * emp.dailyRate) + (half * emp.dailyRate * 0.5) + (overtime * emp.dailyRate * 1.5);
    const deduction = Math.round(gross * 0.05);
    const net = gross - deduction;
    return { ...emp, present, half, overtime, gross, deduction, net, paid: false };
  });

  renderPayoutTable(payouts);

  const totalPayable = payouts.reduce((s, p) => s + p.net, 0);
  setEl('totalPayable', '₹' + totalPayable.toLocaleString('en-IN'));
  setEl('payoutCount', payouts.length);
}

function renderPayoutTable(payouts) {
  const tbody = document.getElementById('payoutBody');
  if (!tbody) return;

  tbody.innerHTML = payouts.map(p => `
    <tr id="payout-${p.id}">
      <td><strong>${p.id}</strong></td>
      <td>${p.name}</td>
      <td>${p.project}</td>
      <td>${p.present} days</td>
      <td>₹${p.dailyRate}</td>
      <td>₹${p.gross.toLocaleString('en-IN')}</td>
      <td style="color:var(--danger)">-₹${p.deduction}</td>
      <td><strong>₹${p.net.toLocaleString('en-IN')}</strong></td>
      <td>
        <button class="btn btn-success btn-xs" onclick="markPaid('${p.id}', this)">
          ${p.paid ? '✅ Paid' : '💰 Pay'}
        </button>
      </td>
    </tr>
  `).join('');
}

function markPaid(empId, btn) {
  btn.innerHTML = '✅ Paid';
  btn.disabled = true;
  btn.style.opacity = '0.7';
  showAdminToast(`Payment marked for ${empId}`, 'success');
}

// ---- REPORTS ----
function initReports() {
  if (!requireAdminAuth()) return;
  renderAttendanceReports();
}

function renderAttendanceReports() {
  const employees = AdminStore.employees();
  const attendance = AdminStore.attendance();
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  const stats = employees.map(emp => {
    let present = 0, total = 0;
    for (let d = 1; d <= today.getDate(); d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayOfWeek = new Date(dateStr).getDay();
      if (dayOfWeek !== 0) {
        total++;
        const s = attendance[dateStr]?.[emp.id];
        if (s === 'present' || s === 'overtime') present++;
        else if (s === 'half') present += 0.5;
      }
    }
    return { ...emp, present, total, percent: total ? Math.round((present / total) * 100) : 0 };
  });

  // Department stats
  const deptStats = {};
  stats.forEach(s => {
    if (!deptStats[s.dept]) deptStats[s.dept] = { present: 0, total: 0, count: 0 };
    deptStats[s.dept].present += s.present;
    deptStats[s.dept].total += s.total;
    deptStats[s.dept].count++;
  });

  const reportEl = document.getElementById('deptReport');
  if (reportEl) {
    const colors = { Labour: '#e67e22', Engineering: '#3498db', Admin: '#9b59b6', Management: '#27ae60' };
    reportEl.innerHTML = Object.entries(deptStats).map(([dept, d]) => {
      const pct = d.total ? Math.round((d.present / d.total) * 100) : 0;
      return `
        <div class="chart-bar-row">
          <div class="chart-bar-label">${dept}</div>
          <div class="chart-bar-bg">
            <div class="chart-bar-fill" style="width:${pct}%;background:${colors[dept] || '#e67e22'}">${pct}%</div>
          </div>
          <div class="chart-bar-val">${d.count} staff</div>
        </div>`;
    }).join('');
  }

  // Low attendance alerts
  const alertEl = document.getElementById('lowAttendance');
  if (alertEl) {
    const lowAtt = stats.filter(s => s.percent < 70 && s.total > 0).sort((a, b) => a.percent - b.percent);
    alertEl.innerHTML = lowAtt.length === 0
      ? '<p style="text-align:center;color:#27ae60;padding:20px">🎉 All employees have good attendance!</p>'
      : lowAtt.map(s => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #f0f0f0">
          <div>
            <div style="font-weight:600">${s.name}</div>
            <div style="font-size:0.78rem;color:var(--gray)">${s.project}</div>
          </div>
          <span class="badge badge-danger">${s.percent}%</span>
        </div>`).join('');
  }
}

// ---- EXCEL IMPORT/EXPORT ----
function exportEmployeeExcel() {
  const employees = AdminStore.employees();
  const headers = ['Employee ID', 'Name', 'Mobile', 'Aadhar', 'Role', 'Department', 'Project', 'Location', 'Daily Rate', 'Join Date', 'Status'];
  const rows = employees.map(e => [e.id, e.name, e.mobile, e.aadhar, e.role, e.dept, e.project, e.location, e.dailyRate, e.joinDate, e.status]);

  let csv = headers.join(',') + '\n';
  rows.forEach(r => { csv += r.map(v => `"${v}"`).join(',') + '\n'; });

  downloadFile(csv, 'GDR_Employees_' + formatDateStr(new Date()) + '.csv', 'text/csv');
  showAdminToast('Employee data exported! 📊', 'success');
}

function exportAttendanceExcel() {
  const employees = AdminStore.employees();
  const attendance = AdminStore.attendance();
  const today = new Date();
  const month = today.getMonth();
  const year = today.getFullYear();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days = [];
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }

  const headers = ['ID', 'Name', 'Department', ...days.map(d => d.split('-')[2])];
  let csv = headers.join(',') + '\n';

  employees.forEach(emp => {
    const row = [emp.id, emp.name, emp.dept, ...days.map(d => attendance[d]?.[emp.id] || 'absent')];
    csv += row.map(v => `"${v}"`).join(',') + '\n';
  });

  downloadFile(csv, 'GDR_Attendance_' + formatDateStr(new Date()) + '.csv', 'text/csv');
  showAdminToast('Attendance report exported! 📊', 'success');
}

function downloadTemplateExcel() {
  const headers = ['Employee ID (leave blank)', 'Full Name', 'Mobile Number', 'Aadhar Number', 'Role', 'Department (Labour/Engineering/Admin/Management)', 'Project', 'Location', 'Daily Rate (₹)', 'Join Date (YYYY-MM-DD)', 'Status (active/inactive)'];
  const sample = ['', 'John Doe', '9876543210', '1234-5678-9012', 'Mason', 'Labour', 'Jaipur Residency', 'Jaipur', '650', '2024-01-01', 'active'];
  let csv = headers.join(',') + '\n' + sample.map(v => `"${v}"`).join(',') + '\n';
  downloadFile(csv, 'GDR_Employee_Template.csv', 'text/csv');
  showAdminToast('Template downloaded! Fill it and import.', 'info');
}

function handleImportExcel(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const text = e.target.result;
    const lines = text.trim().split('\n');
    const employees = AdminStore.employees();
    let added = 0;

    lines.slice(1).forEach(line => {
      const cols = line.split(',').map(c => c.replace(/^"|"$/g, '').trim());
      if (!cols[1] || !cols[2]) return;

      const newEmp = {
        id: cols[0] || generateAdminEmpId(employees),
        name: cols[1],
        mobile: cols[2],
        aadhar: cols[3] || '',
        role: cols[4] || 'Labour',
        dept: cols[5] || 'Labour',
        project: cols[6] || 'Jaipur',
        location: cols[7] || 'Jaipur',
        dailyRate: parseInt(cols[8]) || 500,
        joinDate: cols[9] || formatDateStr(new Date()),
        status: cols[10] || 'active',
        password: 'emp1234'
      };

      if (!employees.find(e => e.mobile === newEmp.mobile)) {
        employees.push(newEmp);
        added++;
      }
    });

    AdminStore.set('employees', employees);
    filteredEmployees = [...employees];
    renderEmployeeTable();
    showAdminToast(`Imported ${added} employees successfully!`, 'success');
  };
  reader.readAsText(file);
  event.target.value = '';
}

function generateAdminEmpId(employees) {
  const nums = employees.map(e => parseInt(e.id.replace('GDR', ''), 10)).filter(n => !isNaN(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return 'GDR' + String(max + 1).padStart(3, '0');
}

// ---- UTILS ----
function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function formatDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function showAdminToast(message, type = 'info') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type]}</span><span>${message}</span>`;
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; setTimeout(() => toast.remove(), 300); }, 3500);
}

function closeAdminModal(id) {
  document.getElementById(id)?.classList.add('hidden');
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function switchAdminPage(page) {
  document.querySelectorAll('.sidebar-link').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.admin-page').forEach(el => el.classList.add('hidden'));
  document.querySelector(`[data-page="${page}"]`)?.classList.add('active');
  document.getElementById('page-' + page)?.classList.remove('hidden');

  // Init page-specific data
  if (page === 'employees') { filteredEmployees = AdminStore.employees(); renderEmployeeTable(); }
  if (page === 'attendance') initAttendanceManagement();
  if (page === 'payout') loadPayoutData();
  if (page === 'reports') renderAttendanceReports();
}
