import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Users, Building2, Clock, Shield,
  CheckCircle2, AlertCircle, XCircle,
  Home, Calendar, ArrowUpRight, Loader2,
  ExternalLink, User as UserIcon
} from 'lucide-react';
import { getDashboardSummary, getLiveStatus } from '../api/attendanceApi';
import NotificationBell from '../components/NotificationBell';


const ROLE_COLORS = {
  Admin: 'bg-indigo-100 text-indigo-700',
  Manager: 'bg-emerald-100 text-emerald-700',
  Employee: 'bg-amber-100 text-amber-700',
};

const QuickStat = ({ icon: Icon, label, value, colorClass }) => (
  <div className="bg-white rounded-3xl p-6 shadow-premium border border-slate-50">
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${colorClass}`}>
      <Icon size={20} />
    </div>
    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">{label}</p>
    <h3 className="text-2xl font-black text-slate-800 mt-1">{value}</h3>
  </div>
);

const Dashboard = () => {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [liveStatus, setLiveStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [sumRes, liveRes] = await Promise.all([
        getDashboardSummary(),
        getLiveStatus()
      ]);
      setSummary(sumRes.data);
      setLiveStatus(liveRes.data);
    } catch (err) {
      console.error('Dashboard data fetch failed', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
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
      <div className="max-w-7xl mx-auto px-6 py-6 md:py-10 space-y-10 animate-fade-in">

        {/* Top Header Bar */}
        <div className="flex items-center justify-between mb-2">
          <div className="hidden md:block">
            <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Workspace Overview</h2>
          </div>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <div className="w-px h-6 bg-slate-200 hidden md:block" />
            <div className="flex items-center gap-3 px-3 py-1.5 bg-white rounded-2xl border border-slate-100 shadow-sm hidden md:flex">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-black text-slate-600 uppercase tracking-tight">System Online</span>
            </div>
          </div>
        </div>


        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900 rounded-[40px] p-8 md:p-12 text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl" />
          <div className="relative z-10 space-y-4">
            <h1 className="text-4xl md:text-5xl font-black tracking-tight">
              {greeting()}, <br />
              <span className="text-brand-400">{user?.fullName?.split(' ')[0]}!</span>
            </h1>
            <p className="text-slate-400 font-medium max-w-md">
              Welcome back to your workspace. Here is a quick snapshot of your presence for the current period.
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              <a href="/clock-in" className="px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl font-black text-sm transition-all shadow-brand flex items-center gap-2">
                <Clock size={18} /> Clock In Now
              </a>
              <a href="/attendance" className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-black text-sm transition-all border border-white/10 flex items-center gap-2">
                View Records <ArrowUpRight size={18} />
              </a>
            </div>
          </div>

          {/* Live Badge */}
          <div className="relative z-10 bg-white/10 backdrop-blur-xl rounded-[32px] p-6 border border-white/10 min-w-[240px]">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-3 h-3 rounded-full animate-pulse ${liveStatus?.status === 'Absent' ? 'bg-red-500' : 'bg-emerald-500'}`} />
              <p className="text-xs font-black uppercase tracking-widest text-slate-300">Live Status</p>
            </div>
            <h2 className="text-3xl font-black">{liveStatus?.status || 'Detecting...'}</h2>
            <p className="text-sm text-slate-400 font-medium mt-1">
              Started at: <span className="text-white">{liveStatus?.checkIn ? new Date(liveStatus.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '--:--'}</span>

            </p>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <QuickStat icon={CheckCircle2} label="Present Days" value={summary?.present || 0} colorClass="bg-emerald-50 text-emerald-600" />
          <QuickStat icon={AlertCircle} label="Late Entries" value={summary?.late || 0} colorClass="bg-amber-50 text-amber-600" />
          <QuickStat icon={Home} label="WFH Sessions" value={summary?.wfh || 0} colorClass="bg-blue-50 text-blue-600" />
          <QuickStat icon={Calendar} label="Approved Leaves" value={summary?.leave || 0} colorClass="bg-purple-50 text-purple-600" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quick Actions */}
          <div className="lg:col-span-2 bg-white rounded-[40px] p-8 shadow-premium border border-slate-50">
            <h3 className="text-xl font-black text-slate-800 mb-8">Management & Shortcuts</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: 'My Profile', desc: 'Manage your personal info', icon: UserIcon, path: '/profile', color: 'bg-brand-50 text-brand-600' },
                { label: 'Apply Leave', desc: 'Request time off', icon: Calendar, path: '/leave', color: 'bg-rose-50 text-rose-600' },
                { label: 'Attendance Logs', desc: 'Detailed history & records', icon: Calendar, path: '/attendance', color: 'bg-indigo-50 text-indigo-600' },
                { label: 'Company Policy', desc: 'Read workplace rules', icon: Shield, path: '#', color: 'bg-slate-100 text-slate-600' },
              ].map((action, i) => (

                <a key={i} href={action.path} className="flex items-center gap-5 p-5 rounded-[24px] bg-slate-50 hover:bg-white hover:shadow-premium transition-all group border border-transparent hover:border-slate-100">
                  <div className={`w-12 h-12 rounded-[18px] flex items-center justify-center shrink-0 ${action.color}`}>
                    <action.icon size={24} />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-800 group-hover:text-brand-600 transition-colors">{action.label}</h4>
                    <p className="text-xs text-slate-500 font-medium">{action.desc}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>

          {/* User Side Card */}
          <div className="bg-white rounded-[40px] p-8 shadow-premium border border-slate-50 space-y-8">
            <div className="text-center space-y-4">
              <div className="w-24 h-24 rounded-[32px] bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center mx-auto shadow-brand ring-4 ring-brand-50">
                <span className="text-3xl font-black text-white">{user?.fullName?.charAt(0)}</span>
              </div>
              <div>
                <h4 className="text-xl font-black text-slate-800">{user?.fullName}</h4>
                <p className="text-sm text-slate-500 font-medium uppercase tracking-widest">{user?.role} Portal</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 px-4 bg-slate-50 rounded-2xl">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Department</span>
                <span className="text-xs font-black text-slate-700">{user?.department || 'Operations'}</span>
              </div>
              <div className="flex justify-between items-center p-3 px-4 bg-slate-50 rounded-2xl">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Shift</span>
                <span className="text-xs font-black text-slate-700">{user?.shiftType || 'General'}</span>
              </div>
            </div>

            <button
              onClick={() => window.location.href = '/profile'}
              className="w-full py-4 bg-slate-900 text-white rounded-[20px] font-black text-sm shadow-xl hover:bg-slate-800 transition-all"
            >
              Update Settings
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;


