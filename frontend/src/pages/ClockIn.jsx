import React, { useState, useEffect, useCallback } from 'react';
import { MapPin, Clock, Globe, Shield, CheckCircle2, XCircle, Loader2, Navigation, Laptop, Building2 } from 'lucide-react';
import { checkIn, checkOut, getLiveStatus, getUserIP } from '../api/attendanceApi';
import { useAuth } from '../context/AuthContext';

const ClockIn = () => {
  const { user } = useAuth();
  const [liveStatus, setLiveStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [location, setLocation] = useState({ lat: null, lon: null });
  const [ip, setIp] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [workMode, setWorkMode] = useState('Office');

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getLiveStatus();
      setLiveStatus(res.data);
    } catch (err) {
      console.error('Failed to fetch attendance status');
    } finally {
      setLoading(false);
    }
  }, []);

  const getClientDetails = useCallback(async () => {
    // Get IP
    const userIp = await getUserIP();
    setIp(userIp);

    // Get Geo Location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          });
        },
        (err) => {
          console.error('Geolocation error:', err);
          setError('GPS Permission Denied. Please enable location access for Office mode.');
        }
      );
    } else {
      setError('Geolocation is not supported by this browser.');
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    getClientDetails();
  }, [fetchStatus, getClientDetails]);

  const handleAction = async (type) => {
    setActionLoading(true);
    setError('');
    setMessage('');

    if (workMode === 'Office' && (!location.lat || !location.lon)) {
      setError('Location not captured. Please allow GPS access for Office mode.');
      setActionLoading(false);
      return;
    }

    const payload = {
      latitude: location.lat || 0,
      longitude: location.lon || 0,
      ipAddress: ip,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      utcTimestamp: new Date().toISOString(),
      workMode
    };

    try {
      let res;
      if (type === 'in') {
        res = await checkIn(payload);
      } else {
        res = await checkOut(payload);
      }

      if (res.success) {
        setMessage(res.message);
        await fetchStatus();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Action failed. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const isCheckedIn = liveStatus && (liveStatus.status === 'Present' || liveStatus.status === 'Late' || liveStatus.status === 'WFH') && !liveStatus.checkOut;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 lg:p-10 gradient-bg min-h-screen overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-8 animate-slide-up">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Clock In / Out</h1>

            <p className="text-slate-500 mt-1.5 font-medium">Capture your daily presence with smart validation.</p>
          </div>
          <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-2xl shadow-premium border border-slate-100">
            <Clock className="w-5 h-5 text-brand-500" />
            <span className="text-sm font-bold text-slate-700">
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}

            </span>
            <span className="w-px h-4 bg-slate-200" />
            <span className="text-xs font-bold text-slate-400">
              {new Date().toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Action Card */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-panel p-8 rounded-3xl shadow-premium border border-white relative overflow-hidden">
              {/* Background Glow */}
              <div className="absolute -top-24 -right-24 w-64 h-64 bg-brand-500/5 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 flex flex-col items-center text-center space-y-6">
                
                {/* Work Mode Toggle */}
                {!isCheckedIn && (
                  <div className="flex bg-slate-100 p-1 rounded-xl w-full max-w-xs mx-auto">
                    <button 
                      onClick={() => setWorkMode('Office')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${workMode === 'Office' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      <Building2 size={16} /> Office
                    </button>
                    <button 
                      onClick={() => setWorkMode('WFH')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${workMode === 'WFH' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      <Laptop size={16} /> WFH
                    </button>
                  </div>
                )}

                <div className={`w-20 h-20 rounded-full flex items-center justify-center ${isCheckedIn ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
                  {isCheckedIn ? <CheckCircle2 size={40} /> : <Clock size={40} />}
                </div>

                <div>
                  <h2 className="text-2xl font-extrabold text-slate-900">
                    {isCheckedIn ? 'Session Active' : (liveStatus?.checkOut ? 'Day Completed' : 'Ready to Start?')}
                  </h2>
                  <p className="text-slate-500 font-medium mt-1">
                    {isCheckedIn 
                      ? `Logged in via ${liveStatus.workMode} at ${new Date(liveStatus.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}`
                      : (liveStatus?.checkOut ? `Clocked out at ${new Date(liveStatus.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}` : `Choose your mode and clock in.`)}
                  </p>
                </div>

                <div className="w-full pt-4">
                  {!isCheckedIn ? (
                    <button
                      onClick={() => handleAction('in')}
                      disabled={actionLoading || liveStatus?.checkOut}
                      className="group relative w-full max-w-xs mx-auto flex items-center justify-center gap-3 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-200 disabled:text-slate-400 text-white py-4 rounded-2xl font-bold text-lg transition-all duration-200 shadow-brand hover:shadow-brand-hover active:scale-[0.98]"
                    >
                      {actionLoading ? <Loader2 className="animate-spin w-6 h-6" /> : <Navigation className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
                      {liveStatus?.checkOut ? 'Attendance Marked' : 'Clock In Now'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleAction('out')}
                      disabled={actionLoading}
                      className="group relative w-full max-w-xs mx-auto flex items-center justify-center gap-3 bg-red-500 hover:bg-red-600 disabled:bg-slate-300 text-white py-4 rounded-2xl font-bold text-lg transition-all duration-200 shadow-lg shadow-red-200 hover:shadow-red-300 active:scale-[0.98]"
                    >
                      {actionLoading ? <Loader2 className="animate-spin w-6 h-6" /> : <XCircle className="w-5 h-5" />}
                      Clock Out Now
                    </button>
                  )}
                </div>

                {(error || message) && (
                  <div className={`w-full p-4 rounded-xl flex items-center gap-3 animate-fade-in ${error ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                    {error ? <XCircle size={18} /> : <CheckCircle2 size={18} />}
                    <span className="text-sm font-bold">{error || message}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Validation Info Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <MapPin size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xxs font-bold text-slate-400 uppercase tracking-wider">GPS Validation</p>
                  <p className="text-sm font-bold text-slate-700 truncate">
                    {location.lat ? `${location.lat.toFixed(4)}, ${location.lon.toFixed(4)}` : 'Waiting for GPS...'}
                  </p>
                </div>
                {location.lat && <CheckCircle2 size={16} className="text-emerald-500" />}
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Globe size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xxs font-bold text-slate-400 uppercase tracking-wider">Network IP</p>
                  <p className="text-sm font-bold text-slate-700 truncate">{ip || 'Detecting IP...'}</p>
                </div>
                {ip && <CheckCircle2 size={16} className="text-emerald-500" />}
              </div>
            </div>
          </div>

          {/* Sidebar Info */}
          <div className="space-y-6">
             <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16" />
                <div className="relative z-10 space-y-4">
                   <div className="flex items-center gap-2 mb-2">
                      <Shield className="text-brand-400 w-5 h-5" />
                      <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Logging Policy</span>
                   </div>
                   <ul className="space-y-3">
                      <li className="flex items-start gap-3">
                         <div className="mt-1 w-1.5 h-1.5 rounded-full bg-brand-400 flex-shrink-0" />
                         <p className="text-sm text-slate-300 font-medium">Office mode requires GPS verification.</p>
                      </li>
                      <li className="flex items-start gap-3">
                         <div className="mt-1 w-1.5 h-1.5 rounded-full bg-brand-400 flex-shrink-0" />
                         <p className="text-sm text-slate-300 font-medium">Clock in before 9:30 AM to avoid Late status.</p>
                      </li>
                      <li className="flex items-start gap-3">
                         <div className="mt-1 w-1.5 h-1.5 rounded-full bg-brand-400 flex-shrink-0" />
                         <p className="text-sm text-slate-300 font-medium">WFH mode skips location fencing.</p>
                      </li>
                   </ul>
                </div>
             </div>

             <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-premium">
                <h3 className="font-bold text-slate-900 mb-4">Real-time Stats</h3>
                <div className="space-y-4">
                   <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-400">Work Mode</span>
                      <span className="text-xs font-bold text-slate-700">{liveStatus?.workMode || workMode}</span>
                   </div>
                   <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-400">Current Status</span>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${isCheckedIn ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                        {isCheckedIn ? liveStatus?.status?.toUpperCase() : 'OFFLINE'}
                      </span>
                   </div>
                   {liveStatus?.checkIn && (
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-400">Session Start</span>
                        <span className="text-xs font-bold text-slate-700">{new Date(liveStatus.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                      </div>
                   )}
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClockIn;
