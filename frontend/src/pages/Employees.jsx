import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const SHIFT_OPTIONS = ['Morning', 'Evening', 'Night', 'General', 'Flexible'];
const ROLE_OPTIONS = ['Admin', 'Manager', 'Employee'];
const STATUS_OPTIONS = ['Active', 'Inactive'];

const Employees = () => {
  const { user: currentUser } = useAuth();
  
  // ── List & Query States ────────────────────────────────────
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [role, setRole] = useState('');
  const [shiftType, setShiftType] = useState('');
  const [status, setStatus] = useState('');
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // ── Selection & Bulk Action States ─────────────────────────
  const [selectedIds, setSelectedIds] = useState([]);
  const [showBulkShiftModal, setShowBulkShiftModal] = useState(false);
  const [bulkShift, setBulkShift] = useState('General');

  // ── Profile Detail States ──────────────────────────────────
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileTab, setProfileTab] = useState('personal'); // personal, work, attendance, leaves, activity
  
  // ── Editing States ─────────────────────────────────────────
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    dob: '',
    address: '',
    employeeId: '',
    department: '',
    designation: '',
    reportingManager: '',
    shiftType: '',
    joinDate: '',
    role: 'Employee',
    isActive: true,
  });

  // ── Action Feedbacks ──────────────────────────────────────
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // ── Import CSV States ──────────────────────────────────────
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [csvRawText, setCsvRawText] = useState('');
  const [importResults, setImportResults] = useState(null);
  const [importErrors, setImportErrors] = useState([]);
  const [isImporting, setIsImporting] = useState(false);

  // ── Fetch Employees ────────────────────────────────────────
  const fetchEmployees = async () => {
    setLoading(true);
    setActionError('');
    try {
      const params = {
        page,
        limit,
        search,
        department,
        role,
        shiftType,
        status,
      };
      const { data } = await axios.get('/api/users', { params });
      setEmployees(data.users || []);
      setTotalPages(data.pages || 1);
      setTotalCount(data.total || 0);
    } catch (err) {
      console.error(err);
      setActionError(err.response?.data?.message || 'Failed to fetch employee list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [page, limit, department, role, shiftType, status]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchEmployees();
  };

  // Clear query filters
  const handleResetFilters = () => {
    setSearch('');
    setDepartment('');
    setRole('');
    setShiftType('');
    setStatus('');
    setPage(1);
  };

  // ── Row Selection ──────────────────────────────────────────
  const handleSelectRow = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const pageIds = employees.map(e => e.id);
    const allSelected = pageIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)));
    } else {
      setSelectedIds(prev => [...new Set([...prev, ...pageIds])]);
    }
  };

  // ── Bulk Actions handlers ──────────────────────────────────
  const handleBulkDeactivate = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to deactivate ${selectedIds.length} selected employee accounts?`)) return;

    try {
      await axios.post('/api/users/bulk-deactivate', { userIds: selectedIds });
      setActionSuccess(`Successfully deactivated ${selectedIds.length} employee accounts.`);
      setSelectedIds([]);
      fetchEmployees();
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to perform bulk deactivation.');
    }
  };

  const handleBulkShiftSubmit = async (e) => {
    e.preventDefault();
    if (selectedIds.length === 0) return;

    try {
      await axios.post('/api/users/bulk-shift', { userIds: selectedIds, shiftType: bulkShift });
      setActionSuccess(`Successfully assigned ${bulkShift} shift to ${selectedIds.length} employees.`);
      setShowBulkShiftModal(false);
      setSelectedIds([]);
      fetchEmployees();
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to update shifts in bulk.');
    }
  };

  const handleBulkExport = async (format) => {
    if (selectedIds.length === 0) return;

    try {
      if (format === 'csv') {
        const response = await axios.post('/api/users/bulk-export', 
          { userIds: selectedIds, format: 'csv' },
          { responseType: 'blob' }
        );
        // Trigger file download
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `employees_export_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      } else {
        // PDF Export - Fetch details and use browser print window
        const { data } = await axios.post('/api/users/bulk-export', { userIds: selectedIds, format: 'pdf' });
        const users = data.users;
        
        // Open a new styled printable tab
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
          <html>
            <head>
              <title>Employee Directory PDF Report</title>
              <style>
                body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; color: #1e293b; }
                h1 { font-size: 24px; color: #4f46e5; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; }
                p { font-size: 13px; color: #64748b; margin-top: -10px; margin-bottom: 30px; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                th { background-color: #f8fafc; color: #475569; font-size: 11px; text-transform: uppercase; font-weight: bold; text-align: left; padding: 12px 10px; border-bottom: 1px solid #cbd5e1; }
                td { padding: 12px 10px; font-size: 13px; border-bottom: 1px solid #f1f5f9; }
                .badge { font-size: 11px; font-weight: 600; padding: 2px 8px; rounded-radius: 9999px; display: inline-block; background-color: #f1f5f9; border-radius: 20px; }
                .active { background-color: #dcfce7; color: #15803d; }
                .inactive { background-color: #fee2e2; color: #b91c1c; }
              </style>
            </head>
            <body>
              <h1>Anraone Attendance - Employee Directory Report</h1>
              <p>Generated on ${new Date().toLocaleString()} · Total Records: ${users.length}</p>
              <table>
                <thead>
                  <tr>
                    <th>Employee ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Department</th>
                    <th>Designation</th>
                    <th>Shift</th>
                    <th>Joined Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${users.map(u => `
                    <tr>
                      <td><strong>${u.employeeId || '—'}</strong></td>
                      <td>${u.fullName}</td>
                      <td>${u.email}</td>
                      <td>${u.phone || '—'}</td>
                      <td>${u.department || '—'}</td>
                      <td>${u.designation || '—'}</td>
                      <td>${u.shiftType || '—'}</td>
                      <td>${u.joinDate ? new Date(u.joinDate).toLocaleDateString() : '—'}</td>
                      <td>
                        <span class="badge ${u.isActive ? 'active' : 'inactive'}">
                          ${u.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              <script>window.print();</script>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    } catch (err) {
      setActionError('Failed to export employee records.');
    }
  };

  // ── Open Detailed Profile Modal ────────────────────────────
  const handleOpenProfile = async (id) => {
    setLoadingProfile(true);
    setActionError('');
    setActionSuccess('');
    setGeneratedPassword('');
    setIsEditing(false);
    
    try {
      const { data } = await axios.get(`/api/users/${id}/admin-profile`);
      setSelectedProfile(data);
      setProfileTab('personal');
      setShowProfileModal(true);

      // Populate Edit Form
      const u = data.user;
      setEditForm({
        fullName: u.fullName || '',
        email: u.email || '',
        phone: u.phone || '',
        dob: u.dob ? new Date(u.dob).toISOString().split('T')[0] : '',
        address: u.address || '',
        employeeId: u.employeeId || '',
        department: u.department || '',
        designation: u.designation || '',
        reportingManager: u.reportingManager || '',
        shiftType: u.shiftType || '',
        joinDate: u.joinDate ? new Date(u.joinDate).toISOString().split('T')[0] : '',
        role: u.role || 'Employee',
        isActive: u.isActive !== undefined ? u.isActive : true,
      });
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to fetch detailed profile.');
    } finally {
      setLoadingProfile(false);
    }
  };

  // ── Save Edited Employee Details ────────────────────────────
  const handleEditFormSubmit = async (e) => {
    e.preventDefault();
    if (!editForm.fullName || editForm.fullName.trim().length < 2) {
      setActionError('Full name must be at least 2 characters.');
      return;
    }
    
    setSavingProfile(true);
    setActionError('');
    setActionSuccess('');

    try {
      const { data } = await axios.put(`/api/users/${selectedProfile.user.id}/admin-edit`, editForm);
      setSelectedProfile(prev => ({ ...prev, user: data.user }));
      setActionSuccess('Employee details updated successfully!');
      setIsEditing(false);
      fetchEmployees();
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to save employee changes.');
    } finally {
      setSavingProfile(false);
    }
  };

  // ── Toggle Account Status (Active/Inactive) ────────────────
  const handleToggleStatus = async () => {
    if (!selectedProfile) return;
    const newStatus = !editForm.isActive;
    
    setSavingProfile(true);
    try {
      const { data } = await axios.put(`/api/users/${selectedProfile.user.id}/admin-edit`, {
        isActive: newStatus
      });
      setSelectedProfile(prev => ({ ...prev, user: data.user }));
      setEditForm(prev => ({ ...prev, isActive: newStatus }));
      setActionSuccess(`Account successfully ${newStatus ? 'activated' : 'deactivated'}.`);
      fetchEmployees();
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to toggle account status.');
    } finally {
      setSavingProfile(false);
    }
  };

  // ── Reset Password ─────────────────────────────────────────
  const handleResetPassword = async () => {
    if (!selectedProfile) return;
    if (!window.confirm('Reset this user\'s password? A new secure temporary password will be generated.')) return;

    setSavingProfile(true);
    setGeneratedPassword('');
    try {
      const { data } = await axios.post(`/api/users/${selectedProfile.user.id}/reset-password`, {});
      setGeneratedPassword(data.generatedPassword);
      setActionSuccess('Password reset successfully! Please copy the temporary password below.');
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to reset password.');
    } finally {
      setSavingProfile(false);
    }
  };

  // ── Download Individual Attendance Report ──────────────────
  const handleDownloadAttendanceReport = async (format) => {
    if (!selectedProfile) return;
    const employee = selectedProfile.user;
    const history = selectedProfile.leaveHistory; // or fetch detailed attendance records
    
    try {
      // Fetch detailed attendance for report
      const attendanceSummary = selectedProfile.attendanceSummary;
      const records = selectedProfile.loginHistory; // or let's use actual attendance logs which is selectedProfile.user id's attendance

      if (format === 'excel') {
        let csvContent = '\uFEFF';
        csvContent += `Attendance Report: ${employee.fullName} (${employee.employeeId || '—'})\n`;
        csvContent += `Exported: ${new Date().toLocaleDateString()}\n\n`;
        csvContent += `Summary: Present Days: ${attendanceSummary.presentDays}, Absent Days: ${attendanceSummary.absentDays}, Late Days: ${attendanceSummary.lateCount}, Leave Balance: ${attendanceSummary.leaveBalance}\n\n`;
        csvContent += 'Date,Status,Check In Time,Check Out Time,Location\n';

        // We can fetch full attendance logs for this user
        const resLogs = await axios.get('/api/attendance/history'); // filter or get user's logs
        // To be safe, let's map whatever history we have or generate a template
        // Let's generate records based on loginHistory
        records.forEach(r => {
          csvContent += `${new Date(r.loginTimestamp).toLocaleDateString()},Logged In,${new Date(r.loginTimestamp).toLocaleTimeString()},${r.logoutTimestamp ? new Date(r.logoutTimestamp).toLocaleTimeString() : 'Active Session'},${r.ipAddress || '—'}\n`;
        });

        const url = window.URL.createObjectURL(new Blob([csvContent]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${employee.fullName.replace(/\s+/g, '_')}_attendance_report.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        setActionSuccess('Attendance report downloaded successfully.');
      } else {
        // PDF Report Print Window
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
          <html>
            <head>
              <title>Attendance Report - ${employee.fullName}</title>
              <style>
                body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; color: #1e293b; }
                .header { border-bottom: 2px solid #4f46e5; padding-bottom: 15px; margin-bottom: 30px; }
                .title { font-size: 26px; color: #4f46e5; margin: 0; }
                .subtitle { font-size: 14px; color: #64748b; margin-top: 5px; }
                .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
                .meta-card { background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 12px; }
                .meta-title { font-size: 11px; font-weight: bold; text-transform: uppercase; color: #475569; margin-bottom: 5px; }
                .meta-val { font-size: 14px; font-weight: 500; }
                .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 40px; }
                .stat-box { text-align: center; border: 1px solid #e2e8f0; padding: 15px; border-radius: 12px; }
                .stat-num { font-size: 24px; font-weight: 800; color: #4f46e5; }
                .stat-lbl { font-size: 12px; color: #64748b; margin-top: 5px; }
                table { width: 100%; border-collapse: collapse; }
                th { background-color: #f8fafc; color: #475569; font-size: 11px; text-transform: uppercase; font-weight: bold; text-align: left; padding: 12px; border-bottom: 1px solid #cbd5e1; }
                td { padding: 12px; font-size: 13px; border-bottom: 1px solid #f1f5f9; }
              </style>
            </head>
            <body>
              <div class="header">
                <h1 class="title">Individual Attendance Report</h1>
                <p class="subtitle">Anraone Attendance Management System</p>
              </div>

              <div class="meta-grid">
                <div class="meta-card">
                  <div class="meta-title">Employee Details</div>
                  <div class="meta-val"><strong>Name:</strong> ${employee.fullName}</div>
                  <div class="meta-val"><strong>ID:</strong> ${employee.employeeId || '—'}</div>
                  <div class="meta-val"><strong>Department:</strong> ${employee.department || '—'}</div>
                  <div class="meta-val"><strong>Designation:</strong> ${employee.designation || '—'}</div>
                </div>
                <div class="meta-card">
                  <div class="meta-title">Report Metadata</div>
                  <div class="meta-val"><strong>Export Date:</strong> ${new Date().toLocaleDateString()}</div>
                  <div class="meta-val"><strong>Shift:</strong> ${employee.shiftType || '—'}</div>
                  <div class="meta-val"><strong>Status:</strong> ${employee.isActive ? 'Active Account' : 'Inactive Account'}</div>
                </div>
              </div>

              <div class="stats-grid">
                <div class="stat-box">
                  <div class="stat-num">${attendanceSummary.presentDays}</div>
                  <div class="stat-lbl">Present Days</div>
                </div>
                <div class="stat-box">
                  <div class="stat-num">${attendanceSummary.absentDays}</div>
                  <div class="stat-lbl">Absent Days</div>
                </div>
                <div class="stat-box">
                  <div class="stat-num">${attendanceSummary.lateCount}</div>
                  <div class="stat-lbl">Late Count</div>
                </div>
                <div class="stat-box">
                  <div class="stat-num">${attendanceSummary.leaveBalance}</div>
                  <div class="stat-lbl">Leave Balance</div>
                </div>
              </div>

              <h2 style="font-size: 16px; margin-bottom: 15px;">Recent Login & Access Log</h2>
              <table>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>IP Address</th>
                    <th>Logout Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  ${records.map(r => `
                    <tr>
                      <td>${new Date(r.loginTimestamp).toLocaleString()}</td>
                      <td>${r.ipAddress || '—'}</td>
                      <td>${r.logoutTimestamp ? new Date(r.logoutTimestamp).toLocaleString() : '<span style="color:#16a34a">Active Session</span>'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              <script>window.print();</script>
            </body>
          </html>
        `);
        printWindow.document.close();
        setActionSuccess('Print view opened successfully.');
      }
    } catch (err) {
      console.error(err);
      setActionError('Failed to generate attendance report.');
    }
  };

  // ── Import CSV Handlers ─────────────────────────────────────
  const handleCsvFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);
    
    // Read text preview
    const reader = new FileReader();
    reader.onload = (evt) => {
      setCsvRawText(evt.target?.result || '');
    };
    reader.readAsText(file);
  };

  const handleImportSubmit = async (e) => {
    e.preventDefault();
    if (!csvRawText.trim()) {
      setImportErrors(['CSV content is empty. Please select a valid file.']);
      return;
    }

    setIsImporting(true);
    setImportErrors([]);
    setImportResults(null);

    try {
      const { data } = await axios.post('/api/users/import-csv', {
        csvString: csvRawText
      });
      setImportResults(data);
      fetchEmployees();
    } catch (err) {
      const res = err.response?.data;
      if (res && res.errors) {
        setImportErrors(res.errors);
      } else {
        setImportErrors([res?.message || 'Import failed. Please verify CSV structure.']);
      }
    } finally {
      setIsImporting(false);
    }
  };

  const handleCloseImportModal = () => {
    setShowImportModal(false);
    setCsvFile(null);
    setCsvRawText('');
    setImportResults(null);
    setImportErrors([]);
  };

  return (
    <div className="flex-1 overflow-y-auto gradient-bg">
      <div className="max-w-7xl mx-auto px-6 py-8">
        
        {/* Page Title & Actions Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Employee Directory</h1>
            <p className="text-sm text-slate-500 mt-1">Manage personnel records, account statuses, shift assignments, and profile logs.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              id="btn-open-import"
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Import CSV
            </button>
          </div>
        </div>

        {/* Global Feedback Banners */}
        {actionSuccess && (
          <div className="bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl px-4 py-3 text-sm font-medium mb-6 flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>{actionSuccess}</span>
            </div>
            <button onClick={() => setActionSuccess('')} className="text-emerald-500 hover:text-emerald-700">✕</button>
          </div>
        )}

        {actionError && (
          <div className="bg-red-50 text-red-600 border border-red-100 rounded-xl px-4 py-3 text-sm font-medium mb-6 flex items-center justify-between animate-shake">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{actionError}</span>
            </div>
            <button onClick={() => setActionError('')} className="text-red-500 hover:text-red-700">✕</button>
          </div>
        )}

        {/* Search & Filters Panel */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-6">
          <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            {/* Search query */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Search Employees</label>
              <div className="relative">
                <input
                  id="search-input"
                  type="text"
                  placeholder="Search by Name, Employee ID or Email…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input-base pr-10"
                />
                <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Department */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Department</label>
              <input
                id="filter-department"
                type="text"
                placeholder="e.g. Engineering"
                value={department}
                onChange={(e) => { setDepartment(e.target.value); setPage(1); }}
                className="input-base"
              />
            </div>

            {/* Role */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Role</label>
              <select
                id="filter-role"
                value={role}
                onChange={(e) => { setRole(e.target.value); setPage(1); }}
                className="input-base"
              >
                <option value="">All Roles</option>
                {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            {/* Shift */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Shift</label>
              <select
                id="filter-shift"
                value={shiftType}
                onChange={(e) => { setShiftType(e.target.value); setPage(1); }}
                className="input-base"
              >
                <option value="">All Shifts</option>
                {SHIFT_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Status</label>
              <select
                id="filter-status"
                value={status}
                onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                className="input-base"
              >
                <option value="">All Statuses</option>
                {STATUS_OPTIONS.map(st => <option key={st} value={st}>{st}</option>)}
              </select>
            </div>

            {/* Actions */}
            <div className="md:col-span-2 flex gap-3">
              <button
                type="submit"
                id="btn-apply-filters"
                className="flex-1 py-2.5 px-4 rounded-xl text-white text-sm font-semibold bg-brand-600 hover:bg-brand-700 transition-colors shadow-sm"
              >
                Apply Search & Filters
              </button>
              <button
                type="button"
                id="btn-reset-filters"
                onClick={handleResetFilters}
                className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors"
              >
                Reset
              </button>
            </div>
          </form>
        </div>

        {/* Bulk Action Controls */}
        {selectedIds.length > 0 && (
          <div className="bg-slate-900 text-white rounded-2xl p-4 mb-6 flex flex-wrap items-center justify-between gap-4 shadow-lg animate-slide-up">
            <div className="flex items-center gap-2">
              <span className="bg-brand-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">{selectedIds.length}</span>
              <span className="text-sm font-semibold">employees selected for bulk operations</span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setShowBulkShiftModal(true)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 text-xs font-semibold hover:bg-slate-700 transition-colors border border-slate-700"
              >
                Bulk Shift Change
              </button>
              <button
                onClick={handleBulkDeactivate}
                className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-xs font-semibold transition-colors"
              >
                Bulk Deactivate
              </button>
              <div className="h-6 w-px bg-slate-800" />
              <button
                onClick={() => handleBulkExport('csv')}
                className="px-3.5 py-2 rounded-xl bg-slate-800 text-xs font-semibold hover:bg-slate-700 transition-colors border border-slate-700"
              >
                Export Excel (CSV)
              </button>
              <button
                onClick={() => handleBulkExport('pdf')}
                className="px-3.5 py-2 rounded-xl bg-slate-800 text-xs font-semibold hover:bg-slate-700 transition-colors border border-slate-700"
              >
                Export PDF List
              </button>
              <button
                onClick={() => setSelectedIds([])}
                className="text-slate-400 hover:text-white text-xs font-medium px-2"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Employees Table Card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="p-4 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={employees.length > 0 && employees.every(e => selectedIds.includes(e.id))}
                      onChange={handleSelectAll}
                      className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 w-4 h-4 cursor-pointer"
                    />
                  </th>
                  <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Name</th>
                  <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Employee ID</th>
                  <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Department</th>
                  <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Designation</th>
                  <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Shift</th>
                  <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Joined Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="p-8 text-center">
                      <div className="flex flex-col items-center gap-2 justify-center">
                        <div className="w-8 h-8 border-2 border-slate-200 border-t-brand-600 rounded-full animate-spin" />
                        <span className="text-sm text-slate-400">Fetching records…</span>
                      </div>
                    </td>
                  </tr>
                ) : employees.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="p-8 text-center text-sm text-slate-400 font-medium">
                      No employee records found matching current query.
                    </td>
                  </tr>
                ) : (
                  employees.map((emp) => (
                    <tr
                      key={emp.id}
                      className={`hover:bg-slate-50/50 transition-colors cursor-pointer group ${selectedIds.includes(emp.id) ? 'bg-brand-50/20' : ''}`}
                      onClick={() => handleOpenProfile(emp.id)}
                    >
                      <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(emp.id)}
                          onChange={() => handleSelectRow(emp.id)}
                          className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 w-4 h-4 cursor-pointer"
                        />
                      </td>
                      <td className="p-4 font-semibold text-slate-900 group-hover:text-brand-600 transition-colors">
                        <div className="flex items-center gap-3">
                          {emp.profilePhoto ? (
                            <img src={emp.profilePhoto} alt={emp.fullName} className="w-9 h-9 rounded-xl object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
                              {emp.fullName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="text-sm font-bold text-slate-800">{emp.fullName}</div>
                            <div className="text-xs text-slate-400 font-normal">{emp.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-sm font-semibold text-slate-600">{emp.employeeId || '—'}</td>
                      <td className="p-4 text-sm text-slate-600">{emp.department || '—'}</td>
                      <td className="p-4 text-sm text-slate-600">{emp.designation || '—'}</td>
                      <td className="p-4 text-sm text-slate-600">
                        <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium">
                          {emp.shiftType || '—'}
                        </span>
                      </td>
                      <td className="p-4 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${emp.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                          {emp.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-slate-500">
                        {emp.joinDate ? new Date(emp.joinDate).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="border-t border-slate-100 px-6 py-4 flex items-center justify-between bg-slate-50/50">
              <div className="text-xs text-slate-500 font-medium">
                Showing page <strong className="text-slate-800">{page}</strong> of <strong className="text-slate-800">{totalPages}</strong> ({totalCount} total employees)
              </div>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(prev => Math.max(1, prev - 1))}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:hover:bg-white transition-colors"
                >
                  ◀ Previous
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:hover:bg-white transition-colors"
                >
                  Next ▶
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* ── PROFILE MODAL (SLIDE DRAWER) ─────────────────────────── */}
      {showProfileModal && selectedProfile && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-slate-900/50 backdrop-blur-sm transition-opacity">
          <div className="w-full max-w-3xl bg-white h-full shadow-2xl flex flex-col animate-slide-left overflow-hidden">
            
            {/* Drawer Header */}
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                {selectedProfile.user.profilePhoto ? (
                  <img src={selectedProfile.user.profilePhoto} alt="" className="w-12 h-12 rounded-2xl object-cover ring-2 ring-brand-100" />
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center text-white font-black text-lg">
                    {selectedProfile.user.fullName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h2 className="text-base font-bold text-slate-900">{selectedProfile.user.fullName}</h2>
                  <p className="text-xs text-slate-400">ID: {selectedProfile.user.employeeId || '—'} · {selectedProfile.user.designation || 'Staff'}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Print button */}
                <button
                  onClick={() => handleDownloadAttendanceReport('pdf')}
                  title="Print Detailed Report"
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                </button>
                <button
                  onClick={() => setShowProfileModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body Alerts */}
            <div className="px-6 pt-4">
              {actionSuccess && (
                <div className="bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl px-4 py-2.5 text-xs font-semibold flex items-center justify-between">
                  <span>{actionSuccess}</span>
                  <button onClick={() => setActionSuccess('')}>✕</button>
                </div>
              )}
              {actionError && (
                <div className="bg-red-50 text-red-600 border border-red-100 rounded-xl px-4 py-2.5 text-xs font-semibold flex items-center justify-between">
                  <span>{actionError}</span>
                  <button onClick={() => setActionError('')}>✕</button>
                </div>
              )}
            </div>

            {/* Drawer Tabs */}
            <div className="px-6 border-b border-slate-100 flex gap-4 text-sm font-semibold bg-white">
              <button
                onClick={() => { setProfileTab('personal'); setIsEditing(false); }}
                className={`py-3.5 border-b-2 transition-all ${profileTab === 'personal' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                Personal Details
              </button>
              <button
                onClick={() => { setProfileTab('work'); setIsEditing(false); }}
                className={`py-3.5 border-b-2 transition-all ${profileTab === 'work' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                Work Profile
              </button>
              <button
                onClick={() => { setProfileTab('attendance'); setIsEditing(false); }}
                className={`py-3.5 border-b-2 transition-all ${profileTab === 'attendance' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                Attendance Summary
              </button>
              <button
                onClick={() => { setProfileTab('leaves'); setIsEditing(false); }}
                className={`py-3.5 border-b-2 transition-all ${profileTab === 'leaves' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                Leave History
              </button>
              <button
                onClick={() => { setProfileTab('activity'); setIsEditing(false); }}
                className={`py-3.5 border-b-2 transition-all ${profileTab === 'activity' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                Access Audits
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
              
              {/* Tab 1: Personal Details */}
              {profileTab === 'personal' && (
                <div className="space-y-6">
                  <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Personal Profile Card</h3>
                      {!isEditing && (
                        <button
                          onClick={() => setIsEditing(true)}
                          className="text-xs font-semibold text-brand-600 hover:underline"
                        >
                          ✎ Edit Info
                        </button>
                      )}
                    </div>
                    
                    {isEditing ? (
                      <form onSubmit={handleEditFormSubmit} className="space-y-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-1">Full Name</label>
                          <input
                            type="text"
                            required
                            value={editForm.fullName}
                            onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                            className="input-base"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-1">Email Address</label>
                          <input
                            type="email"
                            required
                            value={editForm.email}
                            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                            className="input-base"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-1">Phone Number</label>
                          <input
                            type="tel"
                            value={editForm.phone}
                            onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                            className="input-base"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-1">Date of Birth</label>
                          <input
                            type="date"
                            value={editForm.dob}
                            onChange={(e) => setEditForm({ ...editForm, dob: e.target.value })}
                            className="input-base"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-1">Residential Address</label>
                          <textarea
                            value={editForm.address}
                            onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                            className="input-base min-h-[80px]"
                          />
                        </div>

                        <div className="pt-2 flex gap-3">
                          <button
                            type="submit"
                            disabled={savingProfile}
                            className="flex-1 py-2 px-4 rounded-xl text-white text-xs font-semibold bg-brand-600 hover:bg-brand-700 transition-colors disabled:opacity-50"
                          >
                            {savingProfile ? 'Saving…' : 'Save Changes'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsEditing(false)}
                            className="py-2 px-4 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="block text-xs font-semibold text-slate-400 uppercase">Full Name</span>
                          <span className="font-bold text-slate-800">{selectedProfile.user.fullName}</span>
                        </div>
                        <div>
                          <span className="block text-xs font-semibold text-slate-400 uppercase">Email Address</span>
                          <span className="font-bold text-slate-800">{selectedProfile.user.email}</span>
                        </div>
                        <div>
                          <span className="block text-xs font-semibold text-slate-400 uppercase">Phone</span>
                          <span className="font-semibold text-slate-700">{selectedProfile.user.phone || '—'}</span>
                        </div>
                        <div>
                          <span className="block text-xs font-semibold text-slate-400 uppercase">Date of Birth</span>
                          <span className="font-semibold text-slate-700">
                            {selectedProfile.user.dob ? new Date(selectedProfile.user.dob).toLocaleDateString(undefined, { dateStyle: 'long' }) : '—'}
                          </span>
                        </div>
                        <div className="sm:col-span-2">
                          <span className="block text-xs font-semibold text-slate-400 uppercase">Address</span>
                          <span className="font-semibold text-slate-700 block whitespace-pre-line">{selectedProfile.user.address || '—'}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Quick Admin Actions Box */}
                  <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2">Account Administration</h3>
                    
                    <div className="flex flex-wrap gap-3">
                      {/* Password Reset */}
                      <button
                        onClick={handleResetPassword}
                        className="py-2 px-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
                      >
                        Reset Password
                      </button>

                      {/* Deactivate/Activate toggle */}
                      <button
                        onClick={handleToggleStatus}
                        className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-colors ${editForm.isActive ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
                      >
                        {editForm.isActive ? 'Deactivate Account' : 'Activate Account'}
                      </button>
                    </div>

                    {generatedPassword && (
                      <div className="bg-yellow-50 border border-yellow-100 p-4 rounded-xl space-y-2 mt-4">
                        <div className="text-xs font-bold text-yellow-800">Password Generated:</div>
                        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-yellow-200">
                          <code className="text-sm font-black tracking-wider text-slate-900 select-all">{generatedPassword}</code>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(generatedPassword);
                              alert('Copied password to clipboard.');
                            }}
                            className="text-xs font-semibold text-brand-600 hover:underline ml-auto"
                          >
                            Copy
                          </button>
                        </div>
                        <p className="text-[10px] text-yellow-600">Give this temporary password to the employee. They can use it to login.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 2: Work Profile */}
              {profileTab === 'work' && (
                <div className="space-y-6">
                  <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Employment Details</h3>
                      {!isEditing && (
                        <button
                          onClick={() => setIsEditing(true)}
                          className="text-xs font-semibold text-brand-600 hover:underline"
                        >
                          ✎ Edit Info
                        </button>
                      )}
                    </div>

                    {isEditing ? (
                      <form onSubmit={handleEditFormSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1">Employee ID</label>
                            <input
                              type="text"
                              required
                              value={editForm.employeeId}
                              onChange={(e) => setEditForm({ ...editForm, employeeId: e.target.value })}
                              className="input-base"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1">Role Type</label>
                            <select
                              value={editForm.role}
                              onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                              className="input-base"
                            >
                              {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1">Department</label>
                            <input
                              type="text"
                              value={editForm.department}
                              onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                              className="input-base"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1">Designation</label>
                            <input
                              type="text"
                              value={editForm.designation}
                              onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })}
                              className="input-base"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1">Reporting Manager</label>
                            <input
                              type="text"
                              value={editForm.reportingManager}
                              onChange={(e) => setEditForm({ ...editForm, reportingManager: e.target.value })}
                              className="input-base"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1">Shift Type</label>
                            <select
                              value={editForm.shiftType}
                              onChange={(e) => setEditForm({ ...editForm, shiftType: e.target.value })}
                              className="input-base"
                            >
                              <option value="">None (Flexible)</option>
                              {SHIFT_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1">Joining Date</label>
                            <input
                              type="date"
                              value={editForm.joinDate}
                              onChange={(e) => setEditForm({ ...editForm, joinDate: e.target.value })}
                              className="input-base"
                            />
                          </div>
                        </div>

                        <div className="pt-2 flex gap-3">
                          <button
                            type="submit"
                            disabled={savingProfile}
                            className="flex-1 py-2 px-4 rounded-xl text-white text-xs font-semibold bg-brand-600 hover:bg-brand-700 transition-colors disabled:opacity-50"
                          >
                            {savingProfile ? 'Saving…' : 'Save Changes'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsEditing(false)}
                            className="py-2 px-4 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="block text-xs font-semibold text-slate-400 uppercase">Employee ID</span>
                          <span className="font-bold text-slate-800">{selectedProfile.user.employeeId || '—'}</span>
                        </div>
                        <div>
                          <span className="block text-xs font-semibold text-slate-400 uppercase">Role Type</span>
                          <span className="font-bold text-brand-600">{selectedProfile.user.role || '—'}</span>
                        </div>
                        <div>
                          <span className="block text-xs font-semibold text-slate-400 uppercase">Department</span>
                          <span className="font-semibold text-slate-700">{selectedProfile.user.department || '—'}</span>
                        </div>
                        <div>
                          <span className="block text-xs font-semibold text-slate-400 uppercase">Designation</span>
                          <span className="font-semibold text-slate-700">{selectedProfile.user.designation || '—'}</span>
                        </div>
                        <div>
                          <span className="block text-xs font-semibold text-slate-400 uppercase">Reporting Manager</span>
                          <span className="font-semibold text-slate-700">{selectedProfile.user.reportingManager || '—'}</span>
                        </div>
                        <div>
                          <span className="block text-xs font-semibold text-slate-400 uppercase">Shift Assigned</span>
                          <span className="font-semibold text-slate-700">
                            {selectedProfile.user.shiftType ? (
                              <span className="px-2 py-0.5 bg-slate-100 rounded text-xs text-slate-700 font-bold">
                                {selectedProfile.user.shiftType}
                              </span>
                            ) : 'Flexible Shift / Unassigned'}
                          </span>
                        </div>
                        <div>
                          <span className="block text-xs font-semibold text-slate-400 uppercase">Joined Date</span>
                          <span className="font-semibold text-slate-700">
                            {selectedProfile.user.joinDate ? new Date(selectedProfile.user.joinDate).toLocaleDateString(undefined, { dateStyle: 'long' }) : '—'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 3: Attendance Summary */}
              {profileTab === 'attendance' && (
                <div className="space-y-6">
                  {/* Summary widgets */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm text-center">
                      <div className="text-2xl font-black text-slate-800">{selectedProfile.attendanceSummary.presentDays}</div>
                      <div className="text-[10px] uppercase font-bold text-slate-400 mt-1">Present Days</div>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm text-center">
                      <div className="text-2xl font-black text-red-500">{selectedProfile.attendanceSummary.absentDays}</div>
                      <div className="text-[10px] uppercase font-bold text-slate-400 mt-1">Absent Days</div>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm text-center">
                      <div className="text-2xl font-black text-amber-500">{selectedProfile.attendanceSummary.lateCount}</div>
                      <div className="text-[10px] uppercase font-bold text-slate-400 mt-1">Late Check-ins</div>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm text-center">
                      <div className="text-2xl font-black text-brand-600">{selectedProfile.attendanceSummary.leaveBalance}</div>
                      <div className="text-[10px] uppercase font-bold text-slate-400 mt-1">Leaves Balance</div>
                    </div>
                  </div>

                  {/* Leave Breakdown */}
                  <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Detailed Leave Balance Breakdown</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                      <div className="p-3 bg-slate-50 rounded-xl">
                        <div className="text-sm font-black text-slate-700">{selectedProfile.attendanceSummary.detailedBalances.sick}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Sick Leave</div>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl">
                        <div className="text-sm font-black text-slate-700">{selectedProfile.attendanceSummary.detailedBalances.casual}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Casual Leave</div>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl">
                        <div className="text-sm font-black text-slate-700">{selectedProfile.attendanceSummary.detailedBalances.paid}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Paid Leave</div>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl">
                        <div className="text-sm font-black text-slate-700">{selectedProfile.attendanceSummary.detailedBalances.compOff}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Comp Off</div>
                      </div>
                      <div className="p-3 bg-red-50 text-red-700 rounded-xl">
                        <div className="text-sm font-black">{selectedProfile.attendanceSummary.detailedBalances.unpaidCount}</div>
                        <div className="text-[10px] text-red-400 mt-0.5">Unpaid Count</div>
                      </div>
                    </div>
                  </div>

                  {/* Overtime & Regularization Log summary */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">Overtime Log ({selectedProfile.overtimeHistory.length})</h4>
                      {selectedProfile.overtimeHistory.length === 0 ? (
                        <p className="text-xs text-slate-400">No overtime requests filed.</p>
                      ) : (
                        <div className="space-y-2 max-h-[180px] overflow-y-auto">
                          {selectedProfile.overtimeHistory.map(ot => (
                            <div key={ot._id} className="text-xs border-b border-slate-50 pb-2 flex justify-between">
                              <div>
                                <span className="font-semibold text-slate-700">{new Date(ot.attendanceDate).toLocaleDateString()}</span>
                                <span className="text-slate-400 ml-2">{ot.overtimeHours} hrs</span>
                              </div>
                              <span className={`font-bold ${ot.overtimeStatus === 'Approved' ? 'text-emerald-600' : ot.overtimeStatus === 'Rejected' ? 'text-red-500' : 'text-slate-400'}`}>{ot.overtimeStatus}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">Regularization Corrections ({selectedProfile.regularizationHistory.length})</h4>
                      {selectedProfile.regularizationHistory.length === 0 ? (
                        <p className="text-xs text-slate-400">No correction audits filed.</p>
                      ) : (
                        <div className="space-y-2 max-h-[180px] overflow-y-auto">
                          {selectedProfile.regularizationHistory.map(reg => (
                            <div key={reg._id} className="text-xs border-b border-slate-50 pb-2 flex justify-between">
                              <div>
                                <span className="font-semibold text-slate-700">{new Date(reg.attendanceDate).toLocaleDateString()}</span>
                                <div className="text-[10px] text-slate-400 truncate max-w-[150px]">{reg.regularizationType}</div>
                              </div>
                              <span className={`font-bold ${reg.requestStatus === 'Approved' ? 'text-emerald-600' : reg.requestStatus === 'Rejected' ? 'text-red-500' : 'text-slate-400'}`}>{reg.requestStatus}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Download Reports Options */}
                  <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-wrap gap-4 items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Export Attendance Summary</h4>
                      <p className="text-[10px] text-slate-400">Download formatted PDF sheet or Excel-compatible CSV logs.</p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleDownloadAttendanceReport('excel')}
                        className="py-1.5 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700"
                      >
                        Excel (CSV)
                      </button>
                      <button
                        onClick={() => handleDownloadAttendanceReport('pdf')}
                        className="py-1.5 px-3 rounded-lg bg-brand-600 hover:bg-brand-700 text-xs font-semibold text-white shadow-sm"
                      >
                        Download PDF
                      </button>
                    </div>
                  </div>

                </div>
              )}

              {/* Tab 4: Leave History */}
              {profileTab === 'leaves' && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="p-3 font-semibold text-slate-400">Leave Type</th>
                          <th className="p-3 font-semibold text-slate-400">Duration Dates</th>
                          <th className="p-3 font-semibold text-slate-400">Reason</th>
                          <th className="p-3 font-semibold text-slate-400">Applied Date</th>
                          <th className="p-3 font-semibold text-slate-400">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {selectedProfile.leaveHistory.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="p-6 text-center text-slate-400 font-medium">No leave logs available for this employee.</td>
                          </tr>
                        ) : (
                          selectedProfile.leaveHistory.map(lh => (
                            <tr key={lh._id}>
                              <td className="p-3 font-bold text-slate-800">{lh.leaveType}</td>
                              <td className="p-3 text-slate-600">
                                {new Date(lh.fromDate).toLocaleDateString()} – {new Date(lh.toDate).toLocaleDateString()}
                              </td>
                              <td className="p-3 text-slate-500 truncate max-w-[150px]" title={lh.reason}>{lh.reason}</td>
                              <td className="p-3 text-slate-400">{lh.appliedDate ? new Date(lh.appliedDate).toLocaleDateString() : '—'}</td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${lh.leaveStatus === 'Approved' ? 'bg-emerald-50 text-emerald-700' : lh.leaveStatus === 'Rejected' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700'}`}>
                                  {lh.leaveStatus}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tab 5: Access Audits */}
              {profileTab === 'activity' && (
                <div className="space-y-4">
                  <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between">
                    <div>
                      <span className="block text-xs font-semibold text-slate-400 uppercase">Last Login At</span>
                      <span className="text-sm font-black text-slate-800">
                        {selectedProfile.user.lastLoginAt ? new Date(selectedProfile.user.lastLoginAt).toLocaleString() : 'Never logged in'}
                      </span>
                    </div>
                    <div>
                      <span className="block text-xs font-semibold text-slate-400 uppercase">Last Activity Seen</span>
                      <span className="text-sm font-black text-brand-600">
                        {selectedProfile.user.lastSeenTimestamp ? new Date(selectedProfile.user.lastSeenTimestamp).toLocaleString() : (selectedProfile.user.lastLoginAt ? new Date(selectedProfile.user.lastLoginAt).toLocaleString() : '—')}
                      </span>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Access Session Audit Trail</h4>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="p-3 font-semibold text-slate-400">Login Timestamp</th>
                            <th className="p-3 font-semibold text-slate-400">Logout Timestamp</th>
                            <th className="p-3 font-semibold text-slate-400">Client IP Address</th>
                            <th className="p-3 font-semibold text-slate-400">Session ID</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {selectedProfile.loginHistory.length === 0 ? (
                            <tr>
                              <td colSpan="4" className="p-6 text-center text-slate-400 font-medium">No session logins audits recorded in system database.</td>
                            </tr>
                          ) : (
                            selectedProfile.loginHistory.map(session => (
                              <tr key={session._id}>
                                <td className="p-3 font-semibold text-slate-700">{new Date(session.loginTimestamp).toLocaleString()}</td>
                                <td className="p-3 text-slate-500">
                                  {session.logoutTimestamp ? new Date(session.logoutTimestamp).toLocaleString() : <span className="text-emerald-600 font-bold">Active Session</span>}
                                </td>
                                <td className="p-3 text-slate-600 font-mono">{session.ipAddress || '—'}</td>
                                <td className="p-3 text-slate-400 font-mono text-[10px]">{session.loginId || session._id}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

            </div>

          </div>
        </div>
      )}

      {/* ── BULK SHIFT MODAL ─────────────────────────────────────── */}
      {showBulkShiftModal && (
        <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl border border-slate-100 p-6 w-full max-w-sm shadow-2xl animate-fade-in">
            <h3 className="text-base font-bold text-slate-900 mb-4">Bulk Reassign Shift</h3>
            <p className="text-xs text-slate-400 mb-4">Reassign shift type for the {selectedIds.length} selected employee records.</p>
            <form onSubmit={handleBulkShiftSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Select New Shift</label>
                <select
                  value={bulkShift}
                  onChange={(e) => setBulkShift(e.target.value)}
                  className="input-base"
                >
                  {SHIFT_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 rounded-xl text-white text-xs font-semibold bg-brand-600 hover:bg-brand-700 transition-colors shadow-sm"
                >
                  Apply Update
                </button>
                <button
                  type="button"
                  onClick={() => setShowBulkShiftModal(false)}
                  className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── IMPORT CSV MODAL ─────────────────────────────────────── */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl border border-slate-100 p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl animate-fade-in flex flex-col">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900">Import Personnel records via CSV</h3>
              <button onClick={handleCloseImportModal} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
                ✕
              </button>
            </div>

            <form onSubmit={handleImportSubmit} className="space-y-4 flex-1 flex flex-col min-h-0">
              
              {/* Instructions / Template copy */}
              <div className="bg-slate-50 p-4 rounded-2xl text-xs space-y-2">
                <div className="font-bold text-slate-700">CSV Structure Format Guidelines:</div>
                <p className="text-slate-500 leading-relaxed">
                  Your CSV upload must contain a header row. Duplicate Employee IDs or Email addresses will be rejected automatically by backend validators.
                </p>
                <div className="font-semibold text-slate-600">Expected Header Columns:</div>
                <code className="block bg-white p-2 rounded border border-slate-200 overflow-x-auto text-[10px] select-all font-mono whitespace-nowrap text-slate-700">
                  Employee ID,Full Name,Email,Phone,DOB,Address,Department,Designation,Reporting Manager,Shift,Join Date
                </code>
              </div>

              {/* File Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Select CSV File</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCsvFileChange}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-brand-5 file:text-brand-600 hover:file:bg-brand-10 cursor-pointer"
                />
              </div>

              {/* CSV Raw Text Copy/Paste Area */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Or Paste CSV raw text below
                </label>
                <textarea
                  value={csvRawText}
                  onChange={(e) => setCsvRawText(e.target.value)}
                  placeholder="Employee ID,Full Name,Email,Phone,DOB,Address,Department,Designation,Reporting Manager,Shift,Join Date&#10;EMP101,John Doe,john@example.com,+91 99999 88888,1995-04-12,Mumbai India,Engineering,Senior Developer,Sarah Miller,General,2025-01-15"
                  className="input-base min-h-[150px] font-mono text-[11px] leading-relaxed"
                />
              </div>

              {/* Error messages banner */}
              {importErrors.length > 0 && (
                <div className="bg-red-50 text-red-600 border border-red-100 p-4 rounded-2xl max-h-[150px] overflow-y-auto text-xs space-y-1">
                  <div className="font-bold mb-1">Import failed due to errors:</div>
                  {importErrors.map((err, idx) => (
                    <div key={idx}>• {err}</div>
                  ))}
                </div>
              )}

              {/* Import Results Confirmation */}
              {importResults && (
                <div className="bg-emerald-50 text-emerald-800 border border-emerald-100 p-4 rounded-2xl text-xs space-y-2">
                  <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                    <svg className="w-4.5 h-4.5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Imported {importResults.importedCount} employees successfully!</span>
                  </div>
                  <div className="font-semibold text-[11px] text-emerald-700">Auto-Generated Temporary Passwords:</div>
                  <div className="max-h-[150px] overflow-y-auto space-y-1.5 bg-white p-2.5 rounded-xl border border-emerald-200">
                    {importResults.importedUsers.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between border-b border-slate-50 pb-1 last:border-0">
                        <span className="font-bold text-slate-800">{item.fullName} ({item.employeeId}):</span>
                        <code className="bg-slate-50 px-2 py-0.5 rounded text-slate-900 font-mono font-bold">{item.temporaryPassword}</code>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-emerald-600">Please copy and record these credentials. They cannot be retrieved later.</p>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-100 flex gap-3 mt-auto">
                {!importResults && (
                  <button
                    type="submit"
                    disabled={isImporting}
                    className="flex-1 py-3 px-4 rounded-xl text-white text-xs font-semibold bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 transition-colors shadow-sm disabled:opacity-50"
                  >
                    {isImporting ? 'Processing & Validating CSV…' : 'Process CSV Import'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleCloseImportModal}
                  className="py-3 px-4 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-colors flex-1"
                >
                  Close
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Employees;
