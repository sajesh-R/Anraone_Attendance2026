import React, { useState, useEffect } from 'react';
import { getMyPayslips, raiseQuery, downloadPayslipPDF } from '../api/payrollApi';
import { useAuth } from '../context/AuthContext';
import { FileText, FileDown, AlertTriangle, X, Send } from 'lucide-react';

const EmployeePayslips = () => {
  const { user } = useAuth();
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Dispute Modal State
  const [disputeModal, setDisputeModal] = useState(null); // stores the payslip object
  const [disputeDetails, setDisputeDetails] = useState('');
  const [submittingDispute, setSubmittingDispute] = useState(false);

  useEffect(() => {
    fetchPayslips();
  }, []);

  const fetchPayslips = async () => {
    try {
      setLoading(true);
      const res = await getMyPayslips();
      if (res.success) {
        setPayslips(res.data);
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to load payslips.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async (payslip) => {
    try {
      setMessage({ type: '', text: '' });
      const response = await downloadPayslipPDF(payslip._id);
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Payslip_${user?.fullName?.replace(/\s+/g, '_')}_${payslip.payrollMonth}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Failed to download payslip PDF.' });
    }
  };

  const handleOpenDispute = (payslip) => {
    setDisputeModal(payslip);
    setDisputeDetails('');
  };

  const handleSubmitDispute = async () => {
    if (!disputeDetails) return;
    try {
      setSubmittingDispute(true);
      const res = await raiseQuery({
        payslipId: disputeModal._id,
        disputeDetails,
      });
      if (res.success) {
        setMessage({ type: 'success', text: 'Dispute submitted successfully. HR will review it.' });
        setDisputeModal(null);
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to submit query.' });
    } finally {
      setSubmittingDispute(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full gradient-bg">
      {/* Header */}
      <div className="px-6 py-3 flex items-center justify-between glass-panel border-b border-slate-200/60 sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-gradient-to-tr from-brand-100 to-indigo-100 rounded-md">
            <FileText className="w-4 h-4 text-brand-600" />
          </div>
          <h1 className="text-lg font-semibold text-slate-800">My Payslips</h1>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-5xl mx-auto space-y-6 animate-slide-up">
          {message.text && (
            <div className={`p-4 rounded-lg border text-sm font-medium flex justify-between items-center ${
              message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              <span>{message.text}</span>
              <button onClick={() => setMessage({ type: '', text: '' })}><X className="w-4 h-4" /></button>
            </div>
          )}

          {/* Payslips Table */}
          <div className="bg-white rounded-xl shadow-premium border border-slate-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-800">Payslip History</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 font-semibold text-xs uppercase border-b border-slate-100">
                    <th className="px-5 py-3">Payroll Month</th>
                    <th className="px-5 py-3 text-right">Net Payout</th>
                    <th className="px-5 py-3 text-center">Working Days</th>
                    <th className="px-5 py-3 text-center">LOP Days</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {loading ? (
                    <tr>
                      <td colSpan="5" className="px-5 py-8 text-center text-slate-500">Loading payslips...</td>
                    </tr>
                  ) : payslips.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-5 py-8 text-center text-slate-400 font-medium">
                        No payslips generated yet.
                      </td>
                    </tr>
                  ) : (
                    payslips.map((payslip) => (
                      <tr key={payslip._id} className="hover:bg-slate-50/50">
                        <td className="px-5 py-4 font-semibold text-slate-800">{payslip.payrollMonth}</td>
                        <td className="px-5 py-4 text-right font-bold text-slate-900">₹{payslip.netPay.toFixed(2)}</td>
                        <td className="px-5 py-4 text-center">{payslip.payrollId?.presentDays || 0}</td>
                        <td className="px-5 py-4 text-center text-rose-600">{payslip.payrollId?.absentDays || 0}</td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleDownloadPDF(payslip)}
                              className="flex items-center gap-1 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded text-xs font-semibold shadow-sm transition-colors"
                            >
                              <FileDown className="w-3.5 h-3.5" /> Download PDF
                            </button>
                            <button
                              onClick={() => handleOpenDispute(payslip)}
                              className="flex items-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded text-xs font-semibold transition-colors"
                            >
                              <AlertTriangle className="w-3.5 h-3.5" /> Dispute
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* Dispute Modal */}
      {disputeModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-premium border border-slate-100 max-w-md w-full overflow-hidden animate-scale-in">
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-semibold text-slate-800">Raise Dispute - {disputeModal.payrollMonth}</h3>
              <button onClick={() => setDisputeModal(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-800 font-medium">
                Kindly describe the exact discrepancies (e.g. attendance calculations, LOP errors, overtime details) and submit. HR will look into this.
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Explain Discrepancy details</label>
                <textarea
                  value={disputeDetails}
                  onChange={(e) => setDisputeDetails(e.target.value)}
                  placeholder="Enter details..."
                  className="w-full rounded border border-slate-200 p-2 text-sm outline-none focus:border-brand-500"
                  rows="4"
                  required
                />
              </div>
            </div>

            <div className="px-5 py-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50">
              <button
                onClick={() => setDisputeModal(null)}
                className="px-4 py-2 border rounded text-sm font-medium text-slate-600 bg-white hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitDispute}
                disabled={submittingDispute || !disputeDetails}
                className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded text-sm font-semibold transition-colors disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" /> Submit Dispute
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeePayslips;
