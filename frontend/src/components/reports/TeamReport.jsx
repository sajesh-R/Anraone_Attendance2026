import React, { useState } from 'react';
import { fetchTeamReport } from '../../api/reportApi';
import { exportToCSV, exportToExcel, exportToPDF } from '../../utils/exportUtils';
import { Download, FileText, FileSpreadsheet, Search } from 'lucide-react';

const TeamReport = () => {
  const [department, setDepartment] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Ideally fetch departments dynamically from backend, for now hardcoded common ones
  const departments = ['Engineering', 'HR', 'Sales', 'Marketing', 'Finance', 'Operations', 'Design'];

  const handleGenerate = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!department || !startDate || !endDate) {
      setError('Please select a department and date range.');
      return;
    }

    setLoading(true);
    try {
      const data = await fetchTeamReport(department, startDate, endDate);
      setReportData(data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate report.');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = (type) => {
    if (!reportData || !reportData.employeeSummary.length) return;
    
    const formattedData = reportData.employeeSummary.map(emp => ({
      'Employee Name': emp.fullName,
      'Employee ID': emp.employeeId,
      'Present Count': emp.present,
      'Absent Count': emp.absent,
      'Late Count': emp.late,
      'Leave Count': emp.leave,
    }));

    const filename = `Team_Report_${reportData.department}_${startDate}_to_${endDate}`;

    if (type === 'csv') exportToCSV(formattedData, filename);
    if (type === 'excel') exportToExcel(formattedData, filename);
    if (type === 'pdf') {
      const columns = [
        { header: 'Employee Name', key: 'Employee Name' },
        { header: 'Employee ID', key: 'Employee ID' },
        { header: 'Present', key: 'Present Count' },
        { header: 'Absent', key: 'Absent Count' },
        { header: 'Late', key: 'Late Count' },
        { header: 'Leave', key: 'Leave Count' },
      ];
      exportToPDF(formattedData, columns, filename, `Team Attendance Report: ${reportData.department}`);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
      <h2 className="text-xl font-bold text-slate-800 mb-6">Team Attendance Report</h2>
      
      <form onSubmit={handleGenerate} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
          <select 
            className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 outline-none"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          >
            <option value="">Select Department</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
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
              <h3 className="text-lg font-semibold text-slate-800">{reportData.department} Department</h3>
              <p className="text-sm text-slate-500">Summary from {startDate} to {endDate}</p>
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
              <p className="text-blue-600 text-sm font-semibold mb-1">Total Present</p>
              <p className="text-2xl font-bold text-blue-900">{reportData.overallSummary.presentCount}</p>
            </div>
            <div className="bg-red-50 p-4 rounded-xl border border-red-100">
              <p className="text-red-600 text-sm font-semibold mb-1">Total Absent</p>
              <p className="text-2xl font-bold text-red-900">{reportData.overallSummary.absentCount}</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100">
              <p className="text-yellow-600 text-sm font-semibold mb-1">Total Late</p>
              <p className="text-2xl font-bold text-yellow-900">{reportData.overallSummary.lateCount}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
              <p className="text-purple-600 text-sm font-semibold mb-1">Total Leave</p>
              <p className="text-2xl font-bold text-purple-900">{reportData.overallSummary.leaveCount}</p>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-semibold">Employee</th>
                  <th className="px-4 py-3 font-semibold text-center">Present</th>
                  <th className="px-4 py-3 font-semibold text-center">Absent</th>
                  <th className="px-4 py-3 font-semibold text-center">Late</th>
                  <th className="px-4 py-3 font-semibold text-center">Leave</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700 bg-white">
                {reportData.employeeSummary.length > 0 ? (
                  reportData.employeeSummary.map((emp) => (
                    <tr key={emp.employeeId} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{emp.fullName}</div>
                        <div className="text-xs text-slate-500">{emp.employeeId}</div>
                      </td>
                      <td className="px-4 py-3 text-center">{emp.present}</td>
                      <td className="px-4 py-3 text-center">{emp.absent}</td>
                      <td className="px-4 py-3 text-center">{emp.late}</td>
                      <td className="px-4 py-3 text-center">{emp.leave}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="px-4 py-8 text-center text-slate-500">No data found for this department in the selected period.</td>
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

export default TeamReport;
