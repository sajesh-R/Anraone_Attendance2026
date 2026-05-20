import React, { useState } from 'react';
import { fetchLateArrivalHeatmap } from '../../api/reportApi';
import { exportToCSV, exportToExcel, exportToPDF } from '../../utils/exportUtils';
import { Download, FileText, FileSpreadsheet, Search } from 'lucide-react';

const LateArrivalHeatmap = () => {
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
      const data = await fetchLateArrivalHeatmap(startDate, endDate);
      
      // Process data for heatmap grid
      // X-axis: Dates, Y-axis: Hours (0-23)
      const dates = [...new Set(data.data.map(d => d.date))].sort();
      const hours = Array.from({length: 24}, (_, i) => i);
      
      const grid = {};
      hours.forEach(h => {
        grid[h] = {};
        dates.forEach(d => {
          grid[h][d] = 0;
        });
      });

      let maxCount = 0;
      data.data.forEach(item => {
        if(grid[item.hour] && grid[item.hour][item.date] !== undefined) {
          grid[item.hour][item.date] += item.count;
          if (grid[item.hour][item.date] > maxCount) maxCount = grid[item.hour][item.date];
        }
      });

      setReportData({ raw: data.data, dates, hours, grid, maxCount });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate heatmap report.');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = (type) => {
    if (!reportData || !reportData.raw.length) return;
    
    const formattedData = reportData.raw.map(item => ({
      Date: item.date,
      Department: item.department,
      Hour: `${item.hour}:00 - ${item.hour}:59`,
      'Late Count': item.count,
    }));

    const filename = `Late_Arrivals_${startDate}_to_${endDate}`;

    if (type === 'csv') exportToCSV(formattedData, filename);
    if (type === 'excel') exportToExcel(formattedData, filename);
    if (type === 'pdf') {
      const columns = [
        { header: 'Date', key: 'Date' },
        { header: 'Department', key: 'Department' },
        { header: 'Hour Window', key: 'Hour' },
        { header: 'Late Count', key: 'Late Count' },
      ];
      exportToPDF(formattedData, columns, filename, `Late Arrivals (${startDate} to ${endDate})`);
    }
  };

  const getColorIntensity = (count) => {
    if (count === 0) return 'bg-slate-50';
    if (!reportData.maxCount) return 'bg-orange-100';
    const ratio = count / reportData.maxCount;
    if (ratio > 0.8) return 'bg-red-600 text-white';
    if (ratio > 0.6) return 'bg-orange-500 text-white';
    if (ratio > 0.4) return 'bg-orange-400 text-white';
    if (ratio > 0.2) return 'bg-orange-300';
    return 'bg-orange-200';
  };

  // Only show hours that have some data across the dataset to avoid huge empty grids
  const getActiveHours = () => {
    if(!reportData) return [];
    return reportData.hours.filter(h => {
      return reportData.dates.some(d => reportData.grid[h][d] > 0);
    });
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
      <h2 className="text-xl font-bold text-slate-800 mb-6">Late Arrival Heatmap</h2>
      
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
            {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <><Search className="w-4 h-4 mr-2" /> Generate Heatmap</>}
          </button>
        </div>
      </form>

      {error && <div className="p-4 mb-6 bg-red-50 text-red-700 rounded-lg border border-red-200">{error}</div>}

      {reportData && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Frequency Analysis</h3>
              <p className="text-sm text-slate-500">Peak late arrival timings</p>
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

          {reportData.raw.length > 0 ? (
            <div className="overflow-x-auto mt-4 pb-4">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="p-2 border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600 text-left min-w-[80px]">Time / Date</th>
                    {reportData.dates.map(date => (
                      <th key={date} className="p-2 border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600 text-center whitespace-nowrap">
                        {date.substring(5)} {/* show MM-DD */}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {getActiveHours().map(hour => (
                    <tr key={hour}>
                      <td className="p-2 border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600 whitespace-nowrap">
                        {hour.toString().padStart(2, '0')}:00
                      </td>
                      {reportData.dates.map(date => {
                        const count = reportData.grid[hour][date];
                        return (
                          <td 
                            key={`${hour}-${date}`} 
                            className={`p-2 border border-slate-200 text-center text-xs font-medium transition-colors ${getColorIntensity(count)}`}
                            title={`${count} late arrivals on ${date} at ${hour}:00`}
                          >
                            {count > 0 ? count : ''}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              
              <div className="flex items-center justify-end mt-4 text-xs text-slate-500 gap-2">
                <span>Less</span>
                <div className="w-4 h-4 bg-slate-50 border border-slate-200 rounded"></div>
                <div className="w-4 h-4 bg-orange-200 rounded"></div>
                <div className="w-4 h-4 bg-orange-400 rounded"></div>
                <div className="w-4 h-4 bg-red-600 rounded"></div>
                <span>More</span>
              </div>
            </div>
          ) : (
             <div className="py-12 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
               No late arrivals recorded for this period.
             </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LateArrivalHeatmap;
