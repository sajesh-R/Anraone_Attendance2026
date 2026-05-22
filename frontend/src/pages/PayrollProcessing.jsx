import React, { useState, useEffect } from 'react';
import { getDrafts, processPayroll, updatePayrollEntry, reviewPayroll, approveAndLockPayroll } from '../api/payrollApi';
import { Calendar, Play, Edit, Check, Lock, AlertTriangle, X, RefreshCw } from 'lucide-react';

const PayrollProcessing = () => {
  const [month, setMonth] = useState(() => {
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    return `${today.getFullYear()}-${mm}`;
  });
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchDrafts();
  }, [month]);

  const fetchDrafts = async () => {
    try {
      setLoading(true);
      const res = await getDrafts(month);
      if (res.success) {
        setDrafts(res.data);
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to fetch payroll entries.' });
    } finally {
      setLoading(false);
    }
  };

  const handleProcessPayroll = async () => {
    try {
      setProcessing(true);
      setMessage({ type: '', text: '' });
      const res = await processPayroll({ payrollMonth: month });
      if (res.success) {
        setMessage({ type: 'success', text: `Successfully processed payroll for ${res.count} employees.` });
        fetchDrafts();
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Processing failed.' });
    } finally {
      setProcessing(false);
    }
  };

  const handleOpenEdit = (entry) => {
    setEditingEntry(entry);
    setEditForm({
      presentDays: entry.presentDays,
      absentDays: entry.absentDays,
      unpaidLeaveDays: entry.unpaidLeaveDays,
      overtimeHours: entry.overtimeHours,
      halfDayCount: entry.halfDayCount,
      grossSalary: entry.grossSalary,
      totalDeductions: entry.totalDeductions,
      netSalary: entry.netSalary,
    });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    const numValue = parseFloat(value) || 0;
    setEditForm(prev => {
      const updated = { ...prev, [name]: numValue };
      // Auto-recalculate net if gross or deductions change
      if (name === 'grossSalary' || name === 'totalDeductions') {
        const gross = name === 'grossSalary' ? numValue : prev.grossSalary;
        const ded = name === 'totalDeductions' ? numValue : prev.totalDeductions;
        updated.netSalary = Math.max(0, gross - ded);
      }
      return updated;
    });
  };

  const handleSaveEdit = async () => {
    try {
      const res = await updatePayrollEntry(editingEntry._id, editForm);
      if (res.success) {
        setMessage({ type: 'success', text: 'Payroll entry updated successfully.' });
        setEditingEntry(null);
        fetchDrafts();
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to update.' });
    }
  };

  const handleReview = async (id) => {
    try {
      const res = await reviewPayroll(id);
      if (res.success) {
        setMessage({ type: 'success', text: 'Payroll marked as Reviewed.' });
        fetchDrafts();
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Review failed.' });
    }
  };

  const handleApprove = async (id) => {
    try {
      const res = await approveAndLockPayroll(id);
      if (res.success) {
        setMessage({ type: 'success', text: 'Payroll Approved & Locked successfully.' });
        fetchDrafts();
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Approval failed.' });
    }
  };

  return (
    <div className="flex flex-col h-full w-full gradient-bg">
      {/* Header */}
      <div className="px-6 py-3 flex items-center justify-between glass-panel border-b border-slate-200/60 sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-gradient-to-tr from-brand-100 to-indigo-100 rounded-md">
            <Calendar className="w-4 h-4 text-brand-600" />
          </div>
          <h1 className="text-lg font-semibold text-slate-800">Payroll Processing</h1>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-6 animate-slide-up">
          {/* Month & Process Control */}
          <div className="bg-white rounded-xl shadow-premium border border-slate-100 p-5 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <label className="text-sm font-semibold text-slate-600">Payroll Month</label>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="rounded-md border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={fetchDrafts}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-md text-sm font-medium hover:bg-slate-50 transition-colors"
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
              </button>
              <button
                onClick={handleProcessPayroll}
                disabled={processing}
                className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-md text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {processing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-white" />}
                Process / Recalculate Payroll
              </button>
            </div>
          </div>

          {message.text && (
            <div className={`p-4 rounded-lg border text-sm font-medium flex justify-between items-center ${
              message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              <span>{message.text}</span>
              <button onClick={() => setMessage({ type: '', text: '' })}><X className="w-4 h-4" /></button>
            </div>
          )}

          {/* Drafts List */}
          <div className="bg-white rounded-xl shadow-premium border border-slate-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-base font-semibold text-slate-800">Payroll Entries for {month}</h2>
              <span className="text-xs font-semibold text-slate-400">Total: {drafts.length} entries</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 font-semibold text-xs uppercase border-b border-slate-100">
                    <th className="px-5 py-3">Employee</th>
                    <th className="px-5 py-3">Attendance Summary</th>
                    <th className="px-5 py-3 text-right">Gross</th>
                    <th className="px-5 py-3 text-right">Deductions</th>
                    <th className="px-5 py-3 text-right font-bold">Net Salary</th>
                    <th className="px-5 py-3 text-center">Status</th>
                    <th className="px-5 py-3 text-center">Anomalies</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {drafts.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-5 py-8 text-center text-slate-400 font-medium">
                        No payroll processed for this month. Click "Process / Recalculate" to start.
                      </td>
                    </tr>
                  ) : (
                    drafts.map((entry) => (
                      <tr key={entry._id} className="hover:bg-slate-50/50">
                        <td className="px-5 py-4">
                          <div className="font-semibold text-slate-800">{entry.employeeId?.fullName}</div>
                          <div className="text-xs text-slate-400">{entry.employeeId?.employeeId || 'No ID'} • {entry.employeeId?.department}</div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="text-slate-600 text-xs space-y-0.5">
                            <div>Present: <span className="font-semibold text-slate-800">{entry.presentDays}d</span></div>
                            <div>Half-Days: <span className="font-semibold text-slate-800">{entry.halfDayCount}d</span></div>
                            <div>Absent / Unpaid: <span className="font-semibold text-red-600">{entry.absentDays}d / {entry.unpaidLeaveDays}d</span></div>
                            <div>OT: <span className="font-semibold text-emerald-600">{entry.overtimeHours}h</span></div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right font-medium text-slate-700">₹{entry.grossSalary.toFixed(2)}</td>
                        <td className="px-5 py-4 text-right font-medium text-rose-600">₹{entry.totalDeductions.toFixed(2)}</td>
                        <td className="px-5 py-4 text-right font-bold text-slate-900">₹{entry.netSalary.toFixed(2)}</td>
                        <td className="px-5 py-4 text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                            entry.payrollStatus === 'Approved'
                              ? 'bg-emerald-50 text-emerald-700'
                              : entry.payrollStatus === 'Reviewed'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}>
                            {entry.payrollStatus} {entry.lockedStatus && '🔒'}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          {entry.anomalies && entry.anomalies.length > 0 ? (
                            <div className="group relative flex justify-center cursor-pointer">
                              <AlertTriangle className="w-4 h-4 text-amber-500" />
                              <div className="absolute bottom-full mb-2 hidden group-hover:block bg-slate-800 text-white text-xs rounded p-2 shadow-lg w-48 text-left z-30">
                                {entry.anomalies.map((anom, idx) => (
                                  <div key={idx} className="border-b border-slate-700 last:border-0 py-0.5">{anom}</div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            {/* Edit Button */}
                            {!entry.lockedStatus && (
                              <button
                                onClick={() => handleOpenEdit(entry)}
                                className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-brand-600 transition-colors"
                                title="Edit Values"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                            )}

                            {/* Workflow progression buttons */}
                            {entry.payrollStatus === 'Draft' && !entry.lockedStatus && (
                              <button
                                onClick={() => handleReview(entry._id)}
                                className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-xs font-semibold transition-colors"
                              >
                                <Check className="w-3.5 h-3.5" /> Mark Reviewed
                              </button>
                            )}

                            {entry.payrollStatus === 'Reviewed' && !entry.lockedStatus && (
                              <button
                                onClick={() => handleApprove(entry._id)}
                                className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold transition-colors"
                              >
                                <Lock className="w-3.5 h-3.5" /> Approve & Lock
                              </button>
                            )}

                            {entry.lockedStatus && (
                              <span className="text-xs text-slate-400 flex items-center gap-1">
                                <Lock className="w-3 h-3" /> Locked
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* Edit Modal */}
      {editingEntry && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-premium border border-slate-100 max-w-lg w-full overflow-hidden animate-scale-in">
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-semibold text-slate-800">Edit Payroll Entry - {editingEntry.employeeId?.fullName}</h3>
              <button onClick={() => setEditingEntry(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-5 space-y-4 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Present Days</label>
                <input
                  type="number"
                  name="presentDays"
                  value={editForm.presentDays}
                  onChange={handleEditChange}
                  className="w-full rounded border border-slate-200 px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Half-Days</label>
                <input
                  type="number"
                  name="halfDayCount"
                  value={editForm.halfDayCount}
                  onChange={handleEditChange}
                  className="w-full rounded border border-slate-200 px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Absent Days</label>
                <input
                  type="number"
                  name="absentDays"
                  value={editForm.absentDays}
                  onChange={handleEditChange}
                  className="w-full rounded border border-slate-200 px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Unpaid Leave Days</label>
                <input
                  type="number"
                  name="unpaidLeaveDays"
                  value={editForm.unpaidLeaveDays}
                  onChange={handleEditChange}
                  className="w-full rounded border border-slate-200 px-3 py-1.5 text-sm"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-500 mb-1">Overtime Hours</label>
                <input
                  type="number"
                  name="overtimeHours"
                  value={editForm.overtimeHours}
                  onChange={handleEditChange}
                  className="w-full rounded border border-slate-200 px-3 py-1.5 text-sm"
                />
              </div>

              <div className="border-t col-span-2 my-2"></div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Gross Salary (₹)</label>
                <input
                  type="number"
                  name="grossSalary"
                  value={editForm.grossSalary}
                  onChange={handleEditChange}
                  className="w-full rounded border border-slate-200 px-3 py-1.5 text-sm font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Total Deductions (₹)</label>
                <input
                  type="number"
                  name="totalDeductions"
                  value={editForm.totalDeductions}
                  onChange={handleEditChange}
                  className="w-full rounded border border-slate-200 px-3 py-1.5 text-sm font-semibold text-rose-600"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-500 mb-1">Net Salary (₹) - Auto-calculated</label>
                <input
                  type="number"
                  name="netSalary"
                  value={editForm.netSalary}
                  disabled
                  className="w-full rounded border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-bold text-slate-800"
                />
              </div>
            </div>

            <div className="px-5 py-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50">
              <button
                onClick={() => setEditingEntry(null)}
                className="px-4 py-2 border rounded text-sm font-medium text-slate-600 bg-white hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded text-sm font-semibold"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayrollProcessing;
