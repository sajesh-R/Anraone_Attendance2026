import axios from 'axios';

const API_BASE = '/api/payroll';

export const getPayrollConfig = async (employeeId) => {
  const response = await axios.get(`${API_BASE}/config/${employeeId}`);
  return response.data;
};

export const savePayrollConfig = async (configData) => {
  const response = await axios.post(`${API_BASE}/config`, configData);
  return response.data;
};

export const processPayroll = async (payrollData) => {
  const response = await axios.post(`${API_BASE}/process`, payrollData);
  return response.data;
};

export const getDrafts = async (month) => {
  const response = await axios.get(`${API_BASE}/drafts`, { params: { month } });
  return response.data;
};

export const updatePayrollEntry = async (payrollId, data) => {
  const response = await axios.put(`${API_BASE}/update/${payrollId}`, data);
  return response.data;
};

export const reviewPayroll = async (payrollId) => {
  const response = await axios.put(`${API_BASE}/review/${payrollId}`);
  return response.data;
};

export const approveAndLockPayroll = async (payrollId) => {
  const response = await axios.put(`${API_BASE}/approve/${payrollId}`);
  return response.data;
};

export const getMyPayslips = async () => {
  const response = await axios.get(`${API_BASE}/my-payslips`);
  return response.data;
};

export const downloadPayslipPDF = async (payslipId) => {
  const response = await axios.get(`${API_BASE}/payslip/${payslipId}/pdf`, {
    responseType: 'blob',
  });
  return response;
};

export const raiseQuery = async (disputeData) => {
  const response = await axios.post(`${API_BASE}/dispute`, disputeData);
  return response.data;
};

export const getAllQueries = async () => {
  const response = await axios.get(`${API_BASE}/disputes`);
  return response.data;
};

export const resolveQuery = async (queryId, resolution) => {
  const response = await axios.put(`${API_BASE}/dispute/${queryId}/resolve`, { resolution });
  return response.data;
};

export const getPayrollSummary = async (month) => {
  const response = await axios.get(`${API_BASE}/summary`, { params: { month } });
  return response.data;
};

export const getAuditTrail = async () => {
  const response = await axios.get(`${API_BASE}/audit`);
  return response.data;
};

export const getYearEndSummary = async (employeeId, year) => {
  const response = await axios.get(`${API_BASE}/year-end`, { params: { employeeId, year } });
  return response.data;
};
