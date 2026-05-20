import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  applyRegularization,
  getMyRegularizationRequests,
  getPendingRegularizationRequests,
  updateRegularizationStatus
} from '../api/regularizationApi';

const Regularization = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('my-requests'); // 'my-requests', 'apply', 'pending'
  const [history, setHistory] = useState([]);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [filters, setFilters] = useState({ from: '', to: '' });

  // Form State
  const [formData, setFormData] = useState({
    attendanceDate: '',
    regularizationType: '',
    correctedCheckInTime: '',
    correctedCheckOutTime: '',
    correctionReason: '',
  });

  const regTypes = ['Forgot Check-In', 'Forgot Check-Out', 'Incorrect Attendance Timing'];

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'my-requests') {
        const res = await getMyRegularizationRequests();
        setHistory(res.data);
      } else if (activeTab === 'pending') {
        if (user?.role === 'Manager' || user?.role === 'Admin') {
          const res = await getPendingRegularizationRequests();
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
      // Format dates correctly before submission
      let checkInDate = null;
      let checkOutDate = null;

      if (
        formData.regularizationType === 'Forgot Check-In' ||
        formData.regularizationType === 'Incorrect Attendance Timing'
      ) {
        if (formData.correctedCheckInTime) {
          checkInDate = new Date(`${formData.attendanceDate}T${formData.correctedCheckInTime}`);
        }
      }

      if (
        formData.regularizationType === 'Forgot Check-Out' ||
        formData.regularizationType === 'Incorrect Attendance Timing'
      ) {
        if (formData.correctedCheckOutTime) {
          checkOutDate = new Date(`${formData.attendanceDate}T${formData.correctedCheckOutTime}`);
        }
      }

      const payload = {
        attendanceDate: formData.attendanceDate,
        regularizationType: formData.regularizationType,
        correctedCheckInTime: checkInDate ? checkInDate.toISOString() : null,
        correctedCheckOutTime: checkOutDate ? checkOutDate.toISOString() : null,
        correctionReason: formData.correctionReason,
      };

      const res = await applyRegularization(payload);
      setMessage({ type: 'success', text: res.message || 'Regularization request submitted' });
      setFormData({
        attendanceDate: '',
        regularizationType: '',
        correctedCheckInTime: '',
        correctedCheckOutTime: '',
        correctionReason: '',
      });
      setTimeout(() => setActiveTab('my-requests'), 1500);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to submit request' });
    } finally {
      setFormLoading(false);
    }
  };

  const handleStatusUpdate = async (id, status) => {
    setMessage({ type: '', text: '' });
    const remarks = prompt(`Enter remarks for ${status.toLowerCase()}:`) || '';

    try {
      const res = await updateRegularizationStatus(id, { status, remarks });
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
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Attendance Regularization</h1>
          <p className="text-slate-500 font-medium">Correct incorrect punch-in/out records and check request history.</p>
        </header>

        {/* Tabs */}
        <div className="flex gap-1 bg-white p-1 rounded-2xl border border-slate-100 shadow-sm mb-8 w-fit">
          <button
            onClick={() => setActiveTab('my-requests')}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'my-requests' ? 'bg-brand-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            My Requests
          </button>
          <button
            onClick={() => setActiveTab('apply')}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'apply' ? 'bg-brand-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            Submit Request
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
            {/* History Table */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h3 className="font-black text-slate-900 tracking-tight">Regularization Requests History</h3>
                
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
                      <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-wider">Requested Timings</th>
                      <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-wider">Reason</th>
                      <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {loading ? (
                      <tr><td colSpan="5" className="px-6 py-8 text-center text-slate-400 font-medium">Loading requests...</td></tr>
                    ) : history.filter(item => {
                      if (!filters.from && !filters.to) return true;
                      const reqDate = new Date(item.attendanceDate);
                      const filterFrom = filters.from ? new Date(filters.from) : null;
                      const filterTo = filters.to ? new Date(filters.to) : null;
                      
                      if (filterFrom && reqDate < filterFrom) return false;
                      if (filterTo && reqDate > filterTo) return false;
                      return true;
                    }).length === 0 ? (
                      <tr><td colSpan="5" className="px-6 py-8 text-center text-slate-400 font-medium">No requests found.</td></tr>
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
                        <td className="px-6 py-4 font-bold text-slate-700 text-sm">
                          {item.regularizationType}
                        </td>
                        <td className="px-6 py-4 text-xs font-semibold text-slate-500">
                          <div className="flex flex-col gap-0.5">
                            {item.correctedCheckInTime && (
                              <span>Check-In: {new Date(item.correctedCheckInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            )}
                            {item.correctedCheckOutTime && (
                              <span>Check-Out: {new Date(item.correctedCheckOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 font-medium max-w-xs truncate">
                          {item.correctionReason}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-tight ${getStatusColor(item.requestStatus)}`}>
                            {item.requestStatus}
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

        {activeTab === 'apply' && (
          <div className="max-w-2xl bg-white rounded-3xl border border-slate-100 shadow-xl p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h3 className="text-xl font-black text-slate-900 mb-6 tracking-tight">New Regularization Request</h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <label className="text-xs font-black text-slate-400 uppercase ml-1">Correction Type</label>
                  <select
                    name="regularizationType"
                    value={formData.regularizationType}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all font-bold text-slate-900 outline-none"
                  >
                    <option value="">Select Type</option>
                    {regTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {(formData.regularizationType === 'Forgot Check-In' || formData.regularizationType === 'Incorrect Attendance Timing') && (
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-400 uppercase ml-1">Corrected Check-In Time</label>
                  <input
                    type="time"
                    name="correctedCheckInTime"
                    value={formData.correctedCheckInTime}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all font-bold text-slate-900 outline-none"
                  />
                </div>
              )}

              {(formData.regularizationType === 'Forgot Check-Out' || formData.regularizationType === 'Incorrect Attendance Timing') && (
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-400 uppercase ml-1">Corrected Check-Out Time</label>
                  <input
                    type="time"
                    name="correctedCheckOutTime"
                    value={formData.correctedCheckOutTime}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all font-bold text-slate-900 outline-none"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-400 uppercase ml-1">Reason for Correction</label>
                <textarea
                  name="correctionReason"
                  value={formData.correctionReason}
                  onChange={handleInputChange}
                  required
                  placeholder="Explain why you are requesting this regularization..."
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all font-bold text-slate-900 outline-none min-h-[120px]"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={formLoading}
                className="w-full bg-brand-600 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-brand/20 hover:bg-brand-700 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {formLoading ? 'Submitting...' : 'Submit Request'}
              </button>
            </form>
          </div>
        )}

        {activeTab === 'pending' && (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="px-6 py-5 border-b border-slate-50">
              <h3 className="font-black text-slate-900 tracking-tight">Pending Regularization Approvals</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-wider">Employee</th>
                    <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-wider">Request Details</th>
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
                          <span className="text-sm font-black text-slate-700">{req.regularizationType}</span>
                          <span className="text-[11px] text-slate-500 font-medium mb-1">
                            For {new Date(req.attendanceDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                          </span>
                          <div className="flex flex-col text-[10px] font-bold text-brand-600 bg-brand-50/50 px-2 py-1 rounded-lg border border-brand-100/50 w-fit gap-0.5">
                            {req.correctedCheckInTime && (
                              <span>New Check-In: {new Date(req.correctedCheckInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            )}
                            {req.correctedCheckOutTime && (
                              <span>New Check-Out: {new Date(req.correctedCheckOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 font-medium max-w-xs truncate">{req.correctionReason}</td>
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

export default Regularization;
