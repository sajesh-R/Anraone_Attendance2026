import React, { useState, useEffect } from 'react';
import { getPayrollSummary, getAuditTrail, getYearEndSummary, getAllQueries, resolveQuery } from '../api/payrollApi';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { LayoutDashboard, FileText, History, AlertCircle, FileDown, CheckCircle2, Search, User } from 'lucide-react';

const COLORS = ['#4f46e5', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const PayrollDashboard = () => {
  const [activeTab, setActiveTab] = useState('summary');
  const [month, setMonth] = useState(() => {
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    return `${today.getFullYear()}-${mm}`;
  });

  // Summary State
  const [summaryData, setSummaryData] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Disputes State
  const [disputes, setDisputes] = useState([]);
  const [loadingDisputes, setLoadingDisputes] = useState(false);
  const [resolvingId, setResolvingId] = useState(null);
  const [resolutionText, setResolutionText] = useState('');

  // Year-End State
  const [employees, setEmployees] = useState([]);
  const [selectedEmp, setSelectedEmp] = useState('');
  const [selectedYear, setSelectedYear] = useState(() => String(new Date().getFullYear()));
  const [yearEndData, setYearEndData] = useState(null);
  const [loadingYearEnd, setLoadingYearEnd] = useState(false);

  const [message, setMessage] = useState('');

  useEffect(() => {
    if (activeTab === 'summary') fetchSummary();
    if (activeTab === 'audit') fetchAuditLogs();
    if (activeTab === 'disputes') fetchDisputes();
    if (activeTab === 'year-end') fetchEmployees();
  }, [activeTab, month]);

  const fetchSummary = async () => {
    try {
      setLoadingSummary(true);
      const res = await getPayrollSummary(month);
      if (res.success) {
        setSummaryData(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSummary(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      setLoadingAudit(true);
      const res = await getAuditTrail();
      if (res.success) {
        setAuditLogs(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAudit(false);
    }
  };

  const fetchDisputes = async () => {
    try {
      setLoadingDisputes(true);
      const res = await getAllQueries();
      if (res.success) {
        setDisputes(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDisputes(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const { data } = await axios.get('/api/users', { params: { limit: 1000 } });
      setEmployees(data.users.filter(emp => emp.role === 'Employee'));
    } catch (err) {
      console.error(err);
    }
  };

  const fetchYearEndSummary = async () => {
    if (!selectedEmp || !selectedYear) return;
    try {
      setLoadingYearEnd(true);
      const res = await getYearEndSummary(selectedEmp, selectedYear);
      if (res.success) {
        setYearEndData(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingYearEnd(false);
    }
  };

  const handleResolveDispute = async (id) => {
    if (!resolutionText) return;
    try {
      const res = await resolveQuery(id, resolutionText);
      if (res.success) {
        setResolvingId(null);
        setResolutionText('');
        fetchDisputes();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Export handlers
  const exportToExcel = () => {
    if (!summaryData) return;
    const records = Object.entries(summaryData.departmentBreakdown).map(([dept, vals]) => ({
      Department: dept,
      'Employee Count': vals.count,
      'Gross Payout (INR)': vals.gross,
      'Total Deductions (INR)': vals.deductions,
      'Net Disbursement (INR)': vals.net,
    }));

    const ws = XLSX.utils.json_to_sheet(records);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Payroll Summary');
    XLSX.writeFile(wb, `Payroll_Summary_${month}.xlsx`);
  };

  const exportToPDF = () => {
    if (!summaryData) return;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`Anraone Payroll Summary Report - ${month}`, 14, 20);

    doc.setFontSize(11);
    doc.text(`Total Payout: INR ${summaryData.summary.totalPayout.toFixed(2)}`, 14, 30);
    doc.text(`Total Deductions: INR ${summaryData.summary.totalDeductions.toFixed(2)}`, 14, 37);
    doc.text(`Net Disbursement: INR ${summaryData.summary.netDisbursement.toFixed(2)}`, 14, 44);

    const body = Object.entries(summaryData.departmentBreakdown).map(([dept, vals]) => [
      dept,
      vals.count,
      `INR ${vals.gross.toFixed(2)}`,
      `INR ${vals.deductions.toFixed(2)}`,
      `INR ${vals.net.toFixed(2)}`,
    ]);

    doc.autoTable({
      startY: 55,
      head: [['Department', 'Employees', 'Gross', 'Deductions', 'Net Pay']],
      body: body,
    });

    doc.save(`Payroll_Summary_${month}.pdf`);
  };

  // Prepare chart data
  const barChartData = summaryData ? [
    { name: 'Gross Payout', amount: summaryData.summary.totalPayout },
    { name: 'Deductions', amount: summaryData.summary.totalDeductions },
    { name: 'Net Disbursement', amount: summaryData.summary.netDisbursement },
  ] : [];

  const pieChartData = summaryData ? Object.entries(summaryData.departmentBreakdown).map(([dept, vals]) => ({
    name: dept,
    value: vals.net,
  })) : [];

  return (
    <div className="flex flex-col h-full w-full gradient-bg">
      {/* Header */}
      <div className="px-6 py-3 flex items-center justify-between glass-panel border-b border-slate-200/60 sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-gradient-to-tr from-brand-100 to-indigo-100 rounded-md">
            <LayoutDashboard className="w-4 h-4 text-brand-600" />
          </div>
          <h1 className="text-lg font-semibold text-slate-800">Payroll Dashboard</h1>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-6 animate-slide-up">
          {/* Navigation Tabs */}
          <div className="glass-panel rounded-lg shadow-sm border border-slate-200/50 p-1 flex justify-between items-center gap-4 overflow-x-auto">
            <nav className="flex space-x-1 min-w-max">
              <button
                onClick={() => setActiveTab('summary')}
                className={`flex items-center px-4 py-2 rounded-md text-sm font-semibold transition-all ${
                  activeTab === 'summary' ? 'bg-white text-brand-600 shadow-sm ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 mr-2" /> Summary
              </button>
              <button
                onClick={() => setActiveTab('audit')}
                className={`flex items-center px-4 py-2 rounded-md text-sm font-semibold transition-all ${
                  activeTab === 'audit' ? 'bg-white text-brand-600 shadow-sm ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <History className="w-4 h-4 mr-2" /> Audit Trail
              </button>
              <button
                onClick={() => setActiveTab('disputes')}
                className={`flex items-center px-4 py-2 rounded-md text-sm font-semibold transition-all ${
                  activeTab === 'disputes' ? 'bg-white text-brand-600 shadow-sm ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <AlertCircle className="w-4 h-4 mr-2" /> Disputes / Queries
              </button>
              <button
                onClick={() => setActiveTab('year-end')}
                className={`flex items-center px-4 py-2 rounded-md text-sm font-semibold transition-all ${
                  activeTab === 'year-end' ? 'bg-white text-brand-600 shadow-sm ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileText className="w-4 h-4 mr-2" /> Year-End Summary
              </button>
            </nav>

            {activeTab === 'summary' && (
              <div className="flex items-center gap-2">
                <input
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="rounded-md border border-slate-200 px-3 py-1 text-sm outline-none"
                />
              </div>
            )}
          </div>

          {/* Tab Contents */}
          {activeTab === 'summary' && (
            <div className="space-y-6">
              {/* Summary Stats */}
              {summaryData && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-xl shadow-premium border border-slate-100 p-5">
                    <div className="text-xs font-semibold text-slate-400 uppercase">Gross Payout</div>
                    <div className="text-xl font-bold text-slate-800 mt-2">₹{summaryData.summary.totalPayout.toFixed(2)}</div>
                  </div>
                  <div className="bg-white rounded-xl shadow-premium border border-slate-100 p-5">
                    <div className="text-xs font-semibold text-slate-400 uppercase">Total Deductions</div>
                    <div className="text-xl font-bold text-rose-600 mt-2">₹{summaryData.summary.totalDeductions.toFixed(2)}</div>
                  </div>
                  <div className="bg-white rounded-xl shadow-premium border border-slate-100 p-5">
                    <div className="text-xs font-semibold text-slate-400 uppercase">Net Disbursement</div>
                    <div className="text-xl font-bold text-emerald-600 mt-2">₹{summaryData.summary.netDisbursement.toFixed(2)}</div>
                  </div>
                  <div className="bg-white rounded-xl shadow-premium border border-slate-100 p-5">
                    <div className="text-xs font-semibold text-slate-400 uppercase">Total Employees</div>
                    <div className="text-xl font-bold text-slate-800 mt-2">{summaryData.summary.totalEmployees}</div>
                  </div>
                </div>
              )}

              {/* Charts & Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Bar Chart */}
                <div className="bg-white rounded-xl shadow-premium border border-slate-100 p-5 lg:col-span-2">
                  <h3 className="text-sm font-semibold text-slate-800 mb-4">Payout vs Deductions Overview</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value) => `₹${value.toFixed(2)}`} />
                        <Bar dataKey="amount" fill="#4f46e5">
                          {barChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index === 1 ? '#ef4444' : index === 2 ? '#10b981' : '#4f46e5'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Pie Chart (Dept-wise net pay) */}
                <div className="bg-white rounded-xl shadow-premium border border-slate-100 p-5">
                  <h3 className="text-sm font-semibold text-slate-800 mb-4">Net Disbursement by Department</h3>
                  <div className="h-64 flex justify-center items-center">
                    {pieChartData.length === 0 ? (
                      <div className="text-slate-400 text-sm font-medium">No Department Data</div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {pieChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => `₹${value.toFixed(2)}`} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              </div>

              {/* Department breakdown table and export */}
              <div className="bg-white rounded-xl shadow-premium border border-slate-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="text-base font-semibold text-slate-800">Department Breakdown</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={exportToExcel}
                      className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      <FileDown className="w-3.5 h-3.5" /> Export Excel
                    </button>
                    <button
                      onClick={exportToPDF}
                      className="flex items-center gap-1 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded text-xs font-semibold"
                    >
                      <FileDown className="w-3.5 h-3.5" /> Export PDF
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 font-semibold text-xs uppercase border-b border-slate-100">
                        <th className="px-5 py-3">Department</th>
                        <th className="px-5 py-3 text-center">Employees</th>
                        <th className="px-5 py-3 text-right">Total Gross</th>
                        <th className="px-5 py-3 text-right">Total Deductions</th>
                        <th className="px-5 py-3 text-right">Net Disbursement</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {summaryData && Object.keys(summaryData.departmentBreakdown).length === 0 ? (
                        <tr>
                          <td colSpan="5" className="px-5 py-8 text-center text-slate-400">No data available for this month.</td>
                        </tr>
                      ) : (
                        summaryData && Object.entries(summaryData.departmentBreakdown).map(([dept, vals]) => (
                          <tr key={dept} className="hover:bg-slate-50/50">
                            <td className="px-5 py-4 font-semibold text-slate-800">{dept}</td>
                            <td className="px-5 py-4 text-center">{vals.count}</td>
                            <td className="px-5 py-4 text-right font-medium text-slate-700">₹{vals.gross.toFixed(2)}</td>
                            <td className="px-5 py-4 text-right font-medium text-rose-600">₹{vals.deductions.toFixed(2)}</td>
                            <td className="px-5 py-4 text-right font-bold text-slate-900">₹{vals.net.toFixed(2)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="bg-white rounded-xl shadow-premium border border-slate-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="text-base font-semibold text-slate-800">Payroll Audit Logs</h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 font-semibold text-xs uppercase border-b border-slate-100">
                      <th className="px-5 py-3">Timestamp</th>
                      <th className="px-5 py-3">Performed By</th>
                      <th className="px-5 py-3">Employee Affected</th>
                      <th className="px-5 py-3 text-center">Action</th>
                      <th className="px-5 py-3">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {auditLogs.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-5 py-8 text-center text-slate-400">No logs found.</td>
                      </tr>
                    ) : (
                      auditLogs.map((log) => (
                        <tr key={log._id} className="hover:bg-slate-50/50">
                          <td className="px-5 py-4 text-xs text-slate-500">{new Date(log.actionTimestamp).toLocaleString()}</td>
                          <td className="px-5 py-4 font-medium text-slate-700">{log.actionPerformedBy?.fullName || 'System'}</td>
                          <td className="px-5 py-4">{log.payrollId?.employeeId?.fullName || 'N/A'}</td>
                          <td className="px-5 py-4 text-center">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                              log.actionType === 'Approve'
                                ? 'bg-emerald-50 text-emerald-700'
                                : log.actionType === 'Lock'
                                ? 'bg-slate-100 text-slate-700'
                                : 'bg-blue-50 text-blue-700'
                            }`}>
                              {log.actionType}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-xs text-slate-500 max-w-xs truncate">
                            {log.previousValue ? (
                              <span>Modified Net: ₹{log.previousValue.netSalary?.toFixed(2)} → ₹{log.updatedValue?.netSalary?.toFixed(2)}</span>
                            ) : (
                              <span>Processed Net: ₹{log.updatedValue?.netSalary?.toFixed(2)}</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'disputes' && (
            <div className="bg-white rounded-xl shadow-premium border border-slate-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="text-base font-semibold text-slate-800">Employee Payslip Disputes</h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 font-semibold text-xs uppercase border-b border-slate-100">
                      <th className="px-5 py-3">Employee</th>
                      <th className="px-5 py-3">Payslip Month</th>
                      <th className="px-5 py-3">Dispute Details</th>
                      <th className="px-5 py-3 text-center">Status</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {disputes.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-5 py-8 text-center text-slate-400">No disputes active.</td>
                      </tr>
                    ) : (
                      disputes.map((disp) => (
                        <tr key={disp._id} className="hover:bg-slate-50/50">
                          <td className="px-5 py-4">
                            <div className="font-semibold text-slate-800">{disp.employeeId?.fullName}</div>
                            <div className="text-xs text-slate-400">{disp.employeeId?.employeeId}</div>
                          </td>
                          <td className="px-5 py-4 font-semibold text-slate-600">{disp.payslipId?.payrollMonth}</td>
                          <td className="px-5 py-4 text-slate-600 max-w-md break-words">
                            <div>{disp.disputeDetails}</div>
                            {disp.resolution && <div className="mt-1 text-xs text-emerald-600 font-medium">Resolution: {disp.resolution}</div>}
                          </td>
                          <td className="px-5 py-4 text-center">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                              disp.status === 'Resolved' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                            }`}>
                              {disp.status}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            {disp.status === 'Open' ? (
                              resolvingId === disp._id ? (
                                <div className="flex flex-col gap-1 items-end">
                                  <textarea
                                    value={resolutionText}
                                    onChange={(e) => setResolutionText(e.target.value)}
                                    placeholder="Resolution text..."
                                    className="border rounded text-xs p-1.5 outline-none w-48"
                                    rows="2"
                                  />
                                  <div className="flex gap-1">
                                    <button
                                      onClick={() => setResolvingId(null)}
                                      className="px-2 py-1 text-xs border rounded bg-white hover:bg-slate-50 text-slate-500"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      onClick={() => handleResolveDispute(disp._id)}
                                      className="px-2 py-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold"
                                    >
                                      Resolve
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  onClick={() => { setResolvingId(disp._id); setResolutionText(''); }}
                                  className="flex items-center gap-1 px-3 py-1 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded text-xs font-semibold ml-auto"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Resolve
                                </button>
                              )
                            ) : (
                              <span className="text-xs text-emerald-600 font-medium flex items-center gap-1 justify-end">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Resolved
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'year-end' && (
            <div className="bg-white rounded-xl shadow-premium border border-slate-100 p-5 space-y-6">
              <h3 className="text-base font-semibold text-slate-800">Year-End Salary Summary</h3>

              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-500">Employee</label>
                  <select
                    value={selectedEmp}
                    onChange={(e) => setSelectedEmp(e.target.value)}
                    className="border rounded-md px-3 py-1.5 text-sm outline-none focus:border-brand-500 w-64"
                  >
                    <option value="">-- Choose Employee --</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.fullName}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-500">Financial Year</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="border rounded-md px-3 py-1.5 text-sm outline-none focus:border-brand-500 w-32"
                  >
                    <option value="2026">2026</option>
                    <option value="2025">2025</option>
                  </select>
                </div>

                <button
                  onClick={fetchYearEndSummary}
                  className="flex items-center gap-1 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded text-sm font-semibold shadow-sm transition-colors"
                >
                  <Search className="w-4 h-4" /> Fetch Summary
                </button>
              </div>

              {loadingYearEnd && <div className="text-center text-sm py-4 text-slate-500">Loading yearly breakdown...</div>}

              {yearEndData && !loadingYearEnd && (
                <div className="space-y-6">
                  {/* Totals */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-6">
                    <div className="bg-slate-50 rounded-lg p-4">
                      <div className="text-xs text-slate-400 uppercase font-semibold">Yearly Gross Earnings</div>
                      <div className="text-lg font-bold text-slate-800 mt-1">₹{yearEndData.yearlyGross.toFixed(2)}</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-4">
                      <div className="text-xs text-slate-400 uppercase font-semibold">Yearly Total Deductions</div>
                      <div className="text-lg font-bold text-rose-600 mt-1">₹{yearEndData.yearlyDeductions.toFixed(2)}</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-4">
                      <div className="text-xs text-slate-400 uppercase font-semibold">Yearly Net Pay (Form 16 Ready)</div>
                      <div className="text-lg font-bold text-emerald-600 mt-1">₹{yearEndData.yearlyNet.toFixed(2)}</div>
                    </div>
                  </div>

                  {/* Monthly bar chart */}
                  {yearEndData.monthlyBreakdown.length > 0 && (
                    <div className="h-64 border rounded-lg p-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={yearEndData.monthlyBreakdown}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip formatter={(value) => `₹${value.toFixed(2)}`} />
                          <Legend />
                          <Bar dataKey="gross" fill="#4f46e5" name="Gross" />
                          <Bar dataKey="net" fill="#10b981" name="Net Pay" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default PayrollDashboard;
