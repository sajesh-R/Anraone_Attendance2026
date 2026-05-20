import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAuditTrail } from '../api/auditApi';

const AuditTrail = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    requestType: '',
    employeeId: '',
  });

  useEffect(() => {
    fetchLogs();
  }, [filters]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await getAuditTrail(filters);
      setLogs(res.data);
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const getActionBadgeColor = (actionType) => {
    switch (actionType) {
      case 'Submission':
        return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'Approval':
        return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
      case 'Rejection':
        return 'bg-rose-100 text-rose-800 border border-rose-200';
      default:
        return 'bg-slate-100 text-slate-800 border border-slate-200';
    }
  };

  const renderValueComparison = (log) => {
    if (log.actionType === 'Submission') {
      if (log.requestType === 'Overtime') {
        return (
          <div className="text-xs">
            <span className="font-semibold text-slate-400">Hours Requested:</span>{' '}
            <span className="font-extrabold text-brand-600">{log.newValue?.overtimeHours} hrs</span>
          </div>
        );
      } else {
        return (
          <div className="text-xs space-y-1">
            <div>
              <span className="font-semibold text-slate-400">Correction Type:</span>{' '}
              <span className="font-bold text-slate-800">{log.newValue?.regularizationType}</span>
            </div>
            {log.newValue?.correctedCheckInTime && (
              <div>
                <span className="font-semibold text-slate-400">Check-In:</span>{' '}
                <span className="font-semibold text-slate-600">
                  {new Date(log.newValue.correctedCheckInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )}
            {log.newValue?.correctedCheckOutTime && (
              <div>
                <span className="font-semibold text-slate-400">Check-Out:</span>{' '}
                <span className="font-semibold text-slate-600">
                  {new Date(log.newValue.correctedCheckOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )}
          </div>
        );
      }
    }

    // Approved or Rejected
    const oldVal = log.oldValue;
    const newVal = log.newValue;

    if (log.requestType === 'Overtime') {
      return (
        <div className="flex items-center gap-1.5 text-xs">
          <span className="bg-amber-50 text-amber-600 border border-amber-100 px-1.5 py-0.5 rounded font-bold uppercase text-[9px] tracking-tight">
            {oldVal?.overtimeStatus || 'Pending'}
          </span>
          <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
          <span
            className={`px-1.5 py-0.5 rounded font-bold uppercase text-[9px] tracking-tight ${
              newVal?.overtimeStatus === 'Approved'
                ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                : 'bg-rose-50 text-rose-600 border border-rose-100'
            }`}
          >
            {newVal?.overtimeStatus}
          </span>
        </div>
      );
    }

    // Regularization
    const oldAtt = oldVal?.attendance;
    const newAtt = newVal?.attendance;

    return (
      <div className="text-[11px] font-medium text-slate-600 space-y-1.5">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-slate-400 w-16">Request:</span>
          <span className="bg-amber-50 text-amber-600 border border-amber-100 px-1.5 py-0.5 rounded font-bold uppercase text-[9px] tracking-tight">
            {oldVal?.requestStatus || 'Pending'}
          </span>
          <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
          <span
            className={`px-1.5 py-0.5 rounded font-bold uppercase text-[9px] tracking-tight ${
              newVal?.requestStatus === 'Approved'
                ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                : 'bg-rose-50 text-rose-600 border border-rose-100'
            }`}
          >
            {newVal?.requestStatus}
          </span>
        </div>

        {newVal?.requestStatus === 'Approved' && (
          <div className="border-t border-slate-100 pt-1.5 space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-400 w-16">Status:</span>
              <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">{oldAtt?.status || 'N/A'}</span>
              <span>→</span>
              <span className="bg-brand-50 text-brand-600 px-1.5 py-0.5 rounded text-[10px] font-bold">{newAtt?.status || 'N/A'}</span>
            </div>
            {(oldAtt?.checkInTime || newAtt?.checkInTime) && (
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-400 w-16">Check-In:</span>
                <span className="line-through text-slate-400">
                  {oldAtt?.checkInTime ? new Date(oldAtt.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'None'}
                </span>
                <span>→</span>
                <span className="font-bold text-slate-800">
                  {newAtt?.checkInTime ? new Date(newAtt.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'None'}
                </span>
              </div>
            )}
            {(oldAtt?.checkOutTime || newAtt?.checkOutTime) && (
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-400 w-16">Check-Out:</span>
                <span className="line-through text-slate-400">
                  {oldAtt?.checkOutTime ? new Date(oldAtt.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'None'}
                </span>
                <span>→</span>
                <span className="font-bold text-slate-800">
                  {newAtt?.checkOutTime ? new Date(newAtt.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'None'}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Audit Trail</h1>
          <p className="text-slate-500 font-medium">Verify system activity, log history, and attendance correction logs.</p>
        </header>

        {/* Filter Toolbar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm mb-6 flex flex-wrap gap-4 items-center">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-0.5">Request Type</span>
            <select
              value={filters.requestType}
              onChange={(e) => setFilters({ ...filters, requestType: e.target.value })}
              className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-100 text-sm font-bold text-slate-700 outline-none focus:border-brand-500"
            >
              <option value="">All Types</option>
              <option value="Overtime">Overtime</option>
              <option value="Regularization">Regularization</option>
            </select>
          </div>

          {(filters.requestType || filters.employeeId) && (
            <button
              onClick={() => setFilters({ requestType: '', employeeId: '' })}
              className="self-end px-4 py-2 text-xs font-black uppercase text-rose-500 hover:bg-rose-50 rounded-xl transition-all h-[38px] flex items-center"
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Audit Logs Table */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden animate-in fade-in duration-500">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-wider">Timestamp</th>
                  <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-wider">Employee</th>
                  <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-wider">Type & Action</th>
                  <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-wider">Changes Logged</th>
                  <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-wider">Performed By</th>
                  <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-wider">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-slate-400 font-medium">
                      Loading audit records...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-slate-400 font-medium">
                      No audit activities logged.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log._id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Timestamp */}
                      <td className="px-6 py-4 text-xs font-medium text-slate-500">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800">
                            {new Date(log.actionTimestamp).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(log.actionTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                      </td>

                      {/* Employee */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-900">{log.employeeId?.fullName}</span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase">{log.employeeId?.department || 'General'}</span>
                        </div>
                      </td>

                      {/* Type & Action */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span className="text-xs font-black text-slate-700 tracking-tight">{log.requestType}</span>
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${getActionBadgeColor(log.actionType)}`}>
                            {log.actionType}
                          </span>
                        </div>
                      </td>

                      {/* Changes Logged */}
                      <td className="px-6 py-4">{renderValueComparison(log)}</td>

                      {/* Performed By */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-800">{log.actionPerformedBy?.fullName}</span>
                          <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-tight">{log.actionPerformedBy?.role}</span>
                        </div>
                      </td>

                      {/* Remarks */}
                      <td className="px-6 py-4 text-xs font-medium text-slate-500 max-w-xs break-words">{log.remarks || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditTrail;
