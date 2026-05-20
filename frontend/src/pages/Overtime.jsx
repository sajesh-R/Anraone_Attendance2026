import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  logOvertime,
  getMyOvertimeRequests,
  getPendingOvertimeRequests,
  updateOvertimeStatus
} from '../api/overtimeApi';

const Overtime = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('my-requests'); // 'my-requests', 'log', 'pending'
  const [history, setHistory] = useState([]);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [filters, setFilters] = useState({ from: '', to: '' });

  // Form State
  const [formData, setFormData] = useState({
    attendanceDate: '',
    overtimeHours: '',
    overtimeReason: '',
  });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'my-requests') {
        const res = await getMyOvertimeRequests();
        setHistory(res.data);
      } else if (activeTab === 'pending') {
        if (user?.role === 'Manager' || user?.role === 'Admin') {
          const res = await getPendingOvertimeRequests();
          setPending(res.data);
        }
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to fetch data' });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await logOvertime({
        attendanceDate: formData.attendanceDate,
        overtimeHours: parseFloat(formData.overtimeHours),
        overtimeReason: formData.overtimeReason,
      });
      setMessage({ type: 'success', text: res.message || 'Overtime logged successfully' });
      setFormData({ attendanceDate: '', overtimeHours: '', overtimeReason: '' });
      setTimeout(() => setActiveTab('my-requests'), 1500);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to log overtime' });
    } finally {
      setFormLoading(false);
    }
  };

  const handleStatusUpdate = async (id, status) => {
    setMessage({ type: '', text: '' });
    const remarks = prompt(`Enter remarks for ${status.toLowerCase()}:`) || '';
    
    try {
      const res = await updateOvertimeStatus(id, { status, remarks });
      setMessage({ type: 'success', text: res.message });
      fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Action failed' });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Approved': return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
      case 'Rejected': return 'bg-rose-100 text-rose-700 border border-rose-200';
      default: return 'bg-amber-100 text-amber-700 border border-amber-200';
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Overtime Management</h1>
          <p className="text-slate-500 font-medium">Log your overtime hours and track your request statuses.</p>
        </header>

        {/* Tabs */}
        <div className="flex gap-1 bg-white p-1 rounded-2xl border border-slate-100 shadow-sm mb-8 w-fit">
          <button
            onClick={() => setActiveTab('my-requests')}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'my-requests' ? 'bg-brand-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            My OT Log
          </button>
          <button
            onClick={() => setActiveTab('log')}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'log' ? 'bg-brand-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            Log Overtime
          </button>
          {(user?.role === 'Manager' || user?.role === 'Admin') && (
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'pending' ? 'bg-brand-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              Pending Approval
            </button>
          )}
        </div>

        {message.text && (
          <div className={`mb-6 p-4 rounded-xl font-bold text-sm shadow-sm animate-in fade-in slide-in-from-top-4 duration-300 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
            {message.text}
          </div>
        )}

        {activeTab === 'my-requests' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Summary statistics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Hours Logged</p>
                <h4 className="text-3xl font-black text-slate-900 leading-none">
                  {history.reduce((sum, r) => sum + r.overtimeHours, 0).toFixed(1)}
                </h4>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Approved Hours</p>
                <h4 className="text-3xl font-black text-emerald-600 leading-none">
                  {history.filter(r => r.overtimeStatus === 'Approved').reduce((sum, r) => sum + r.overtimeHours, 0).toFixed(1)}
                </h4>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pending Requests</p>
                <h4 className="text-3xl font-black text-amber-600 leading-none">
                  {history.filter(r => r.overtimeStatus === 'Pending').length}
                </h4>
              </div>
            </div>

            {/* History Table */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h3 className="font-black text-slate-900 tracking-tight">Overtime History</h3>
                
                {/* Date Filters */}
                <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-xl shadow-sm border border-slate-100">
                    <span className="text-[10px] font-black text-slate-400 uppercase">From</span>
                    <input
                      type="date"
                      value={filters.from}
                      onChange={(e) => setFilters({ ...filters, from: e.target.value })}
                      className="text-xs font-bold text-slate-700 bg-transparent outline-none cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-xl shadow-sm border border-slate-100">
                    <span className="text-[10px] font-black text-slate-400 uppercase">To</span>
                    <input
                      type="date"
                      value={filters.to}
                      onChange={(e) => setFilters({ ...filters, to: e.target.value })}
                      className="text-xs font-bold text-slate-700 bg-transparent outline-none cursor-pointer"
                    />
                  </div>
                  {(filters.from || filters.to) && (
                    <button
                      onClick={() => setFilters({ from: '', to: '' })}
                      className="px-3 py-1.5 text-[10px] font-black text-rose-500 uppercase hover:bg-rose-50 rounded-xl transition-all"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-wider">Attendance Date</th>
                      <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-wider">Hours</th>
                      <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-wider">Reason</th>
                      <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {loading ? (
                      <tr><td colSpan="4" className="px-6 py-8 text-center text-slate-400 font-medium">Loading history...</td></tr>
                    ) : history.filter(item => {
                      if (!filters.from && !filters.to) return true;
                      const reqDate = new Date(item.attendanceDate);
                      const filterFrom = filters.from ? new Date(filters.from) : null;
                      const filterTo = filters.to ? new Date(filters.to) : null;
                      
                      if (filterFrom && reqDate < filterFrom) return false;
                      if (filterTo && reqDate > filterTo) return false;
                      return true;
                    }).length === 0 ? (
                      <tr><td colSpan="4" className="px-6 py-8 text-center text-slate-400 font-medium">No overtime records found.</td></tr>
                    ) : history.filter(item => {
                      if (!filters.from && !filters.to) return true;
                      const reqDate = new Date(item.attendanceDate);
                      const filterFrom = filters.from ? new Date(filters.from) : null;
                      const filterTo = filters.to ? new Date(filters.to) : null;
                      
                      if (filterFrom && reqDate < filterFrom) return false;
                      if (filterTo && reqDate > filterTo) return false;
                      return true;
                    }).map((item) => (
                      <tr key={item._id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-950">
                          {new Date(item.attendanceDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                        </td>
                        <td className="px-6 py-4 font-extrabold text-brand-600 text-sm">
                          {item.overtimeHours} hrs
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 font-medium max-w-xs truncate">
                          {item.overtimeReason}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-tight ${getStatusColor(item.overtimeStatus)}`}>
                            {item.overtimeStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'log' && (
          <div className="max-w-2xl bg-white rounded-3xl border border-slate-100 shadow-xl p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h3 className="text-xl font-black text-slate-900 mb-6 tracking-tight">Log Overtime Hours</h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-400 uppercase ml-1">Attendance Date</label>
                <input
                  type="date"
                  name="attendanceDate"
                  value={formData.attendanceDate}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all font-bold text-slate-900 outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-400 uppercase ml-1">Overtime Hours</label>
                <input
                  type="number"
                  name="overtimeHours"
                  step="0.5"
                  min="0.5"
                  max="24"
                  placeholder="e.g. 2.5"
                  value={formData.overtimeHours}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all font-bold text-slate-900 outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-400 uppercase ml-1">Reason for Overtime</label>
                <textarea
                  name="overtimeReason"
                  value={formData.overtimeReason}
                  onChange={handleInputChange}
                  required
                  placeholder="Describe the tasks completed during overtime..."
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all font-bold text-slate-900 outline-none min-h-[120px]"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={formLoading}
                className="w-full bg-brand-600 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-brand/20 hover:bg-brand-700 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {formLoading ? 'Submitting...' : 'Submit OT Request'}
              </button>
            </form>
          </div>
        )}

        {activeTab === 'pending' && (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="px-6 py-5 border-b border-slate-50">
              <h3 className="font-black text-slate-900 tracking-tight">Pending Overtime Approvals</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-wider">Employee</th>
                    <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-wider">Date & Hours</th>
                    <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-wider">Reason</th>
                    <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr><td colSpan="4" className="px-6 py-8 text-center text-slate-400 font-medium">Loading requests...</td></tr>
                  ) : pending.length === 0 ? (
                    <tr><td colSpan="4" className="px-6 py-8 text-center text-slate-400 font-medium">No pending requests.</td></tr>
                  ) : pending.map((req) => (
                    <tr key={req._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-950">{req.employeeId?.fullName}</span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase">{req.employeeId?.department || 'General'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-brand-600">{req.overtimeHours} hrs</span>
                          <span className="text-[11px] text-slate-500 font-medium">
                            {new Date(req.attendanceDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 font-medium max-w-xs truncate">{req.overtimeReason}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleStatusUpdate(req._id, 'Approved')}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-tight transition-all"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(req._id, 'Rejected')}
                            className="bg-rose-500 hover:bg-rose-600 text-white px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-tight transition-all"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Overtime;
