import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getPayrollConfig, savePayrollConfig } from '../api/payrollApi';
import { DollarSign, Save, User, ShieldAlert, Award, PiggyBank, RefreshCw } from 'lucide-react';

const PayrollConfig = () => {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingConfig, setFetchingConfig] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [form, setForm] = useState({
    baseSalary: '',
    hraAmount: '',
    transportAllowance: '',
    medicalAllowance: '',
    specialAllowance: '',
    pfDeduction: '',
    esiDeduction: '',
    tdsDeduction: '',
    loanDeduction: '',
    advanceDeduction: '',
    payCycle: 'Monthly',
    lopRule: 'Standard',
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get('/api/users', { params: { limit: 1000 } });
      // Filter out only active employees or show all
      const filtered = data.users.filter(emp => emp.role === 'Employee' && emp.isActive);
      setEmployees(filtered);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to fetch employees list.' });
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeChange = async (e) => {
    const empId = e.target.value;
    setSelectedEmployee(empId);
    if (!empId) {
      resetForm();
      return;
    }

    try {
      setFetchingConfig(true);
      setMessage({ type: '', text: '' });
      const res = await getPayrollConfig(empId);
      if (res.success && res.data) {
        setForm({
          baseSalary: res.data.baseSalary || '',
          hraAmount: res.data.hraAmount || '',
          transportAllowance: res.data.transportAllowance || '',
          medicalAllowance: res.data.medicalAllowance || '',
          specialAllowance: res.data.specialAllowance || '',
          pfDeduction: res.data.pfDeduction || '',
          esiDeduction: res.data.esiDeduction || '',
          tdsDeduction: res.data.tdsDeduction || '',
          loanDeduction: res.data.loanDeduction || '',
          advanceDeduction: res.data.advanceDeduction || '',
          payCycle: res.data.payCycle || 'Monthly',
          lopRule: res.data.lopRule || 'Standard',
        });
      }
    } catch (err) {
      // If config not found (404), reset form to allow fresh configuration
      resetForm();
      if (err.response && err.response.status !== 404) {
        setMessage({ type: 'error', text: 'Error fetching payroll configuration.' });
      }
    } finally {
      setFetchingConfig(false);
    }
  };

  const resetForm = () => {
    setForm({
      baseSalary: '',
      hraAmount: '',
      transportAllowance: '',
      medicalAllowance: '',
      specialAllowance: '',
      pfDeduction: '',
      esiDeduction: '',
      tdsDeduction: '',
      loanDeduction: '',
      advanceDeduction: '',
      payCycle: 'Monthly',
      lopRule: 'Standard',
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedEmployee) {
      setMessage({ type: 'error', text: 'Please select an employee.' });
      return;
    }

    if (!form.baseSalary || parseFloat(form.baseSalary) <= 0) {
      setMessage({ type: 'error', text: 'Base Salary is required and must be greater than 0.' });
      return;
    }

    try {
      setLoading(true);
      setMessage({ type: '', text: '' });

      const payload = {
        employeeId: selectedEmployee,
        baseSalary: parseFloat(form.baseSalary),
        hraAmount: parseFloat(form.hraAmount) || 0,
        transportAllowance: parseFloat(form.transportAllowance) || 0,
        medicalAllowance: parseFloat(form.medicalAllowance) || 0,
        specialAllowance: parseFloat(form.specialAllowance) || 0,
        pfDeduction: parseFloat(form.pfDeduction) || 0,
        esiDeduction: parseFloat(form.esiDeduction) || 0,
        tdsDeduction: parseFloat(form.tdsDeduction) || 0,
        loanDeduction: parseFloat(form.loanDeduction) || 0,
        advanceDeduction: parseFloat(form.advanceDeduction) || 0,
        payCycle: form.payCycle,
        lopRule: form.lopRule,
      };

      const res = await savePayrollConfig(payload);
      if (res.success) {
        setMessage({ type: 'success', text: 'Payroll Configuration Saved Successfully' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to save configuration.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full gradient-bg">
      {/* Header */}
      <div className="px-6 py-3 flex items-center justify-between glass-panel border-b border-slate-200/60 sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-gradient-to-tr from-brand-100 to-indigo-100 rounded-md">
            <DollarSign className="w-4 h-4 text-brand-600" />
          </div>
          <h1 className="text-lg font-semibold text-slate-800">Payroll Configuration</h1>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-6 animate-slide-up">
          {/* Card Selection */}
          <div className="bg-white rounded-xl shadow-premium border border-slate-100 p-5">
            <h2 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-slate-500" /> Select Employee
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <select
                  value={selectedEmployee}
                  onChange={handleEmployeeChange}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                >
                  <option value="">-- Choose Employee --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName} ({emp.employeeId || 'No ID'}) - {emp.department || 'No Dept'}
                    </option>
                  ))}
                </select>
              </div>
              {fetchingConfig && (
                <div className="flex items-center text-slate-500 text-sm gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" /> Loading configurations...
                </div>
              )}
            </div>
          </div>

          {message.text && (
            <div className={`p-4 rounded-lg border text-sm font-medium ${
              message.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              {message.text}
            </div>
          )}

          {selectedEmployee && !fetchingConfig && (
            <form onSubmit={handleSave} className="space-y-6">
              {/* Base Salary & Cycle */}
              <div className="bg-white rounded-xl shadow-premium border border-slate-100 p-5 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-3">
                  <h3 className="text-sm font-semibold text-slate-800 mb-1 border-b pb-2 flex items-center gap-2">
                    <Award className="w-4 h-4 text-brand-600" /> Core Structure
                  </h3>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Base Salary (Monthly/Bi-Weekly)</label>
                  <input
                    type="number"
                    name="baseSalary"
                    value={form.baseSalary}
                    onChange={handleChange}
                    placeholder="Enter Base Salary Amount"
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Pay Cycle</label>
                  <select
                    name="payCycle"
                    value={form.payCycle}
                    onChange={handleChange}
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="Bi-Weekly">Bi-Weekly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">LOP Rules</label>
                  <select
                    name="lopRule"
                    value={form.lopRule}
                    onChange={handleChange}
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  >
                    <option value="Standard">Standard (Deduct base / days)</option>
                    <option value="Strict">Strict (Double LOP)</option>
                  </select>
                </div>
              </div>

              {/* Allowances */}
              <div className="bg-white rounded-xl shadow-premium border border-slate-100 p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <h3 className="text-sm font-semibold text-slate-800 mb-1 border-b pb-2 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-600" /> Allowances
                  </h3>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">HRA Amount</label>
                  <input
                    type="number"
                    name="hraAmount"
                    value={form.hraAmount}
                    onChange={handleChange}
                    placeholder="Enter HRA"
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Transport Allowance</label>
                  <input
                    type="number"
                    name="transportAllowance"
                    value={form.transportAllowance}
                    onChange={handleChange}
                    placeholder="Enter Transport"
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Medical Allowance</label>
                  <input
                    type="number"
                    name="medicalAllowance"
                    value={form.medicalAllowance}
                    onChange={handleChange}
                    placeholder="Enter Medical"
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Special Allowance</label>
                  <input
                    type="number"
                    name="specialAllowance"
                    value={form.specialAllowance}
                    onChange={handleChange}
                    placeholder="Enter Special Allowance"
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              {/* Deductions */}
              <div className="bg-white rounded-xl shadow-premium border border-slate-100 p-5 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-3">
                  <h3 className="text-sm font-semibold text-slate-800 mb-1 border-b pb-2 flex items-center gap-2">
                    <PiggyBank className="w-4 h-4 text-rose-600" /> Deductions
                  </h3>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Provident Fund (PF)</label>
                  <input
                    type="number"
                    name="pfDeduction"
                    value={form.pfDeduction}
                    onChange={handleChange}
                    placeholder="Enter PF"
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">ESI</label>
                  <input
                    type="number"
                    name="esiDeduction"
                    value={form.esiDeduction}
                    onChange={handleChange}
                    placeholder="Enter ESI"
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Tax (TDS)</label>
                  <input
                    type="number"
                    name="tdsDeduction"
                    value={form.tdsDeduction}
                    onChange={handleChange}
                    placeholder="Enter TDS"
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Loan Deduction</label>
                  <input
                    type="number"
                    name="loanDeduction"
                    value={form.loanDeduction}
                    onChange={handleChange}
                    placeholder="Enter Loan"
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Advance Deduction</label>
                  <input
                    type="number"
                    name="advanceDeduction"
                    value={form.advanceDeduction}
                    onChange={handleChange}
                    placeholder="Enter Advance"
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 border border-slate-200 rounded-md text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Reset
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-md text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" /> Save Configuration
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
};

export default PayrollConfig;
