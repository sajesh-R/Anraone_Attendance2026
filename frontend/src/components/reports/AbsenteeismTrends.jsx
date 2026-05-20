import React, { useState } from 'react';
import { fetchAbsenteeismTrends } from '../../api/reportApi';
import { exportToCSV, exportToExcel, exportToPDF } from '../../utils/exportUtils';
import { Download, FileText, FileSpreadsheet, Search } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const AbsenteeismTrends = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!startDate || !endDate) {
      setError('Please select a date range.');
      return;
    }

    setLoading(true);
    try {
      const data = await fetchAbsenteeismTrends(startDate, endDate);
      
      // Process data for chart - group by date, and have keys for each department
      const processedData = data.data.reduce((acc, curr) => {
        const existingDate = acc.find(item => item.date === curr.date);
        if (existingDate) {
          existingDate[curr.department] = (existingDate[curr.department] || 0) + curr.count;
          existingDate.Total = (existingDate.Total || 0) + curr.count;
        } else {
          acc.push({
            date: curr.date,
            [curr.department]: curr.count,
            Total: curr.count
          });
        }
        return acc;
      }, []);

      setReportData({ raw: data.data, chartData: processedData });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate trend report.');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = (type) => {
    if (!reportData || !reportData.raw.length) return;
    
    const formattedData = reportData.raw.map(item => ({
      Date: item.date,
      Department: item.department,
      'Absence Count': item.count,
    }));

    const filename = `Absenteeism_Trends_${startDate}_to_${endDate}`;

    if (type === 'csv') exportToCSV(formattedData, filename);
    if (type === 'excel') exportToExcel(formattedData, filename);
    if (type === 'pdf') {
      const columns = [
        { header: 'Date', key: 'Date' },
        { header: 'Department', key: 'Department' },
        { header: 'Absence Count', key: 'Absence Count' },
      ];
      exportToPDF(formattedData, columns, filename, `Absenteeism Trends (${startDate} to ${endDate})`);
    }
  };

  // Get unique departments for bar colors
  const getDepartments = () => {
    if (!reportData) return [];
    const depts = new Set();
    reportData.raw.forEach(item => depts.add(item.department));
    return Array.from(depts);
  };

  const colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
      <h2 className="text-xl font-bold text-slate-800 mb-6">Absenteeism Trends</h2>
      
      <form onSubmit={handleGenerate} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
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
            {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <><Search className="w-4 h-4 mr-2" /> Analyze Trends</>}
          </button>
        </div>
      </form>

      {error && <div className="p-4 mb-6 bg-red-50 text-red-700 rounded-lg border border-red-200">{error}</div>}

      {reportData && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Trend Analysis</h3>
              <p className="text-sm text-slate-500">From {startDate} to {endDate}</p>
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

          {reportData.chartData.length > 0 ? (
            <div className="h-80 w-full mt-4 border border-slate-100 rounded-xl p-4 bg-slate-50">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={reportData.chartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dx={-10} />
                  <Tooltip 
                    cursor={{fill: '#f1f5f9'}}
                    contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                  />
                  <Legend iconType="circle" wrapperStyle={{paddingTop: '20px'}}/>
                  {getDepartments().map((dept, index) => (
                    <Bar key={dept} dataKey={dept} stackId="a" fill={colors[index % colors.length]} radius={[4, 4, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
             <div className="py-12 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
               No absenteeism records found for this period.
             </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AbsenteeismTrends;
