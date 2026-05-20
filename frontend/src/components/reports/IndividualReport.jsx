import React, { useState, useEffect } from 'react';
import { fetchIndividualReport } from '../../api/reportApi';
import { exportToCSV, exportToExcel, exportToPDF } from '../../utils/exportUtils';
import { Download, FileText, FileSpreadsheet, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const IndividualReport = () => {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { user } = useAuth();
  const API_URL = import.meta.env.VITE_API_URL || '/api';

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        if (!user) return;
        if (user.role === 'Admin' || user.role === 'Manager') {
          const token = localStorage.getItem('att_token');
          const res = await axios.get(`${API_URL}/users?limit=1000`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          // Ensure compatibility: backend returns `id`, while some code expects `_id`.
          const users = (res.data.users || []).map(u => ({ ...u, _id: u._id || u.id }));
          setEmployees(users);
        } else {
          // Employees can only view their own report
          setEmployees([{ _id: user.id || user._id, fullName: user.fullName, employeeId: user.employeeId }]);
          setSelectedEmployee(user.id || user._id);
        }
      } catch (err) {
        console.error('Failed to fetch employees', err);
      }
    };
    fetchEmployees();
  }, [user]);

  const handleGenerate = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!selectedEmployee || !startDate || !endDate) {
      setError('Please select an employee and date range.');
      return;
    }

    setLoading(true);
    try {
      const data = await fetchIndividualReport(selectedEmployee, startDate, endDate);
      setReportData(data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate report.');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = (type) => {
    if (!reportData || !reportData.records.length) return;
    
    const formattedData = reportData.records.map(record => ({
      Date: new Date(record.attendanceDate).toLocaleDateString(),
      'Check In': record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString() : 'N/A',
      'Check Out': record.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString() : 'N/A',
      Status: record.status,
    }));

    const filename = `Individual_Report_${reportData.user.fullName}_${startDate}_to_${endDate}`;

    if (type === 'csv') exportToCSV(formattedData, filename);
    if (type === 'excel') exportToExcel(formattedData, filename);
    if (type === 'pdf') {
      const columns = [
        { header: 'Date', key: 'Date' },
        { header: 'Check In', key: 'Check In' },
        { header: 'Check Out', key: 'Check Out' },
        { header: 'Status', key: 'Status' }
      ];
      exportToPDF(formattedData, columns, filename, `Individual Attendance Report: ${reportData.user.fullName}`);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
      <h2 className="text-xl font-bold text-slate-800 mb-6">Individual Attendance Report</h2>
      
      <form onSubmit={handleGenerate} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Employee</label>
          <select 
            className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 outline-none"
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
          >
            <option value="">Select Employee</option>
            {employees.map(emp => (
              <option key={emp._id || emp.id} value={emp._id || emp.id}>{emp.fullName} ({emp.employeeId})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
          <input 
            type="date" 
            className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 outline-none"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
          <input 
            type="date" 
            className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 outline-none"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <div className="flex items-end">
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center transition-colors disabled:opacity-70"
          >
            {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <><Search className="w-4 h-4 mr-2" /> Generate</>}
          </button>
        </div>
      </form>

      {error && <div className="p-4 mb-6 bg-red-50 text-red-700 rounded-lg border border-red-200">{error}</div>}

      {reportData && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">{reportData.user.fullName}</h3>
              <p className="text-sm text-slate-500">ID: {reportData.user.employeeId} | Dept: {reportData.user.department}</p>
            </div>
            
            <div className="flex gap-2">
              <button onClick={() => handleExport('csv')} className="flex items-center px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors border border-slate-300">
                <FileText className="w-4 h-4 mr-1.5 text-slate-500" /> CSV
              </button>
              <button onClick={() => handleExport('excel')} className="flex items-center px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 text-sm font-medium rounded-lg transition-colors border border-green-200">
                <FileSpreadsheet className="w-4 h-4 mr-1.5 text-green-600" /> Excel
              </button>
              <button onClick={() => handleExport('pdf')} className="flex items-center px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-sm font-medium rounded-lg transition-colors border border-red-200">
                <Download className="w-4 h-4 mr-1.5 text-red-600" /> PDF
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
              <p className="text-blue-600 text-sm font-semibold mb-1">Present</p>
              <p className="text-2xl font-bold text-blue-900">{reportData.summary.presentCount}</p>
            </div>
            <div className="bg-red-50 p-4 rounded-xl border border-red-100">
              <p className="text-red-600 text-sm font-semibold mb-1">Absent</p>
              <p className="text-2xl font-bold text-red-900">{reportData.summary.absentCount}</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100">
              <p className="text-yellow-600 text-sm font-semibold mb-1">Late</p>
              <p className="text-2xl font-bold text-yellow-900">{reportData.summary.lateCount}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
              <p className="text-purple-600 text-sm font-semibold mb-1">Leave</p>
              <p className="text-2xl font-bold text-purple-900">{reportData.summary.leaveCount}</p>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Check In</th>
                  <th className="px-4 py-3 font-semibold">Check Out</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700 bg-white">
                {reportData.records.length > 0 ? (
                  reportData.records.map((record) => (
                    <tr key={record._id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 whitespace-nowrap">{new Date(record.attendanceDate).toLocaleDateString()}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString() : '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{record.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString() : '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          record.status === 'Present' || record.status.includes('Check') ? 'bg-green-100 text-green-700' :
                          record.status === 'Absent' ? 'bg-red-100 text-red-700' :
                          record.status === 'Late' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-purple-100 text-purple-700'
                        }`}>
                          {record.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="px-4 py-8 text-center text-slate-500">No attendance records found for this period.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default IndividualReport;
