import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Building2, Clock, CheckCircle2, AlertCircle, XCircle, 
  Home, Calendar, Filter, ChevronRight, Loader2, ArrowUpRight
} from 'lucide-react';
import { getDashboardSummary, getAttendanceHistory } from '../api/attendanceApi';

const StatCard = ({ icon: Icon, label, value, colorClass, trend }) => (
  <div className="bg-white rounded-3xl p-6 shadow-premium hover-lift border border-slate-50 relative overflow-hidden group">
    <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-5 group-hover:scale-110 transition-transform duration-500 ${colorClass.split(' ')[0]}`} />
    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${colorClass}`}>
      <Icon size={24} />
    </div>
    <div className="space-y-1">
      <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{label}</p>
      <div className="flex items-baseline gap-2">
        <h3 className="text-3xl font-black text-slate-800">{value}</h3>
      </div>
    </div>
  </div>
);

const Attendance = () => {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState([]);
  const [viewMode, setViewMode] = useState('monthly');
  const [selectedDate, setSelectedDate] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = selectedDate ? { startDate: selectedDate, endDate: selectedDate } : { view: viewMode };
      const [sumRes, histRes] = await Promise.all([
        getDashboardSummary(),
        getAttendanceHistory(params)
      ]);
      setSummary(sumRes.data);
      setHistory(histRes.data);
    } catch (err) {
      console.error('Attendance data fetch failed', err);
    } finally {
      setLoading(false);
    }
  }, [viewMode, selectedDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleViewChange = (v) => {
    setSelectedDate('');
    setViewMode(v);
  };

  const handleDateChange = (e) => {
    const date = e.target.value;
    setSelectedDate(date);
    if (date) setViewMode(''); // Clear toggle selection if specific date is picked
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '--:--';
    return new Date(timeStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Present': return 'bg-emerald-100 text-emerald-700';
      case 'Late': return 'bg-amber-100 text-amber-700';
      case 'WFH': return 'bg-blue-100 text-blue-700';
      case 'On Leave': return 'bg-purple-100 text-purple-700';
      case 'Absent': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  if (loading && !summary) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 text-brand-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto gradient-bg min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-10 animate-fade-in">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Attendance Records</h1>
            <p className="text-slate-500 font-medium mt-1">Review your historical presence and summaries.</p>
          </div>
          <a href="/clock-in" className="flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl font-black text-sm shadow-brand transition-all">
            <Clock size={18} /> Clock In / Out
          </a>
        </div>

        {/* Summary Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 lg:gap-6">
          <StatCard icon={CheckCircle2} label="Present" value={summary?.present || 0} colorClass="bg-emerald-50 text-emerald-600" />
          <StatCard icon={AlertCircle} label="Late" value={summary?.late || 0} colorClass="bg-amber-50 text-amber-600" />
          <StatCard icon={Home} label="WFH" value={summary?.wfh || 0} colorClass="bg-blue-50 text-blue-600" />
          <StatCard icon={Calendar} label="Leave" value={summary?.leave || 0} colorClass="bg-purple-50 text-purple-600" />
          <StatCard icon={XCircle} label="Absent" value={summary?.absent || 0} colorClass="bg-red-50 text-red-600" />
        </div>

        {/* History Table */}
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <h3 className="text-xl font-black text-slate-800">History Log</h3>
            <div className="flex items-center gap-3">
              <div className="flex bg-white/50 p-1 rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {['daily', 'weekly', 'monthly'].map((v) => (
                  <button 
                    key={v}
                    onClick={() => handleViewChange(v)}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${viewMode === v ? 'bg-white text-brand-600 shadow-premium' : 'text-slate-500 hover:text-brand-600'}`}
                  >
                    {v}
                  </button>
                ))}
              </div>
              <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors pointer-events-none">
                  <Calendar size={14} />
                </div>
                <input 
                  type="date" 
                  value={selectedDate}
                  onChange={handleDateChange}
                  className="pl-9 pr-4 py-2 bg-white/50 rounded-2xl border border-slate-100 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[32px] shadow-premium border border-slate-50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Check In</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Check Out</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Mode</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {history.length > 0 ? history.map((record) => (
                    <tr key={record._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-slate-700">{formatDate(record.attendanceDate)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${getStatusBadge(record.status)}`}>
                          {record.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-600">{formatTime(record.checkInTime)}</td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-600">{formatTime(record.checkOutTime)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-slate-400">
                          {record.workMode === 'WFH' ? <Home size={14} /> : <Building2 size={14} />}
                          <span className="text-xs font-bold text-slate-500">{record.workMode}</span>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="5" className="px-6 py-20 text-center text-slate-400 font-medium">
                        No attendance records found for this period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Attendance;
