import axios from 'axios';

// Rely on axios defaults set in AuthContext and proxy in vite.config.js
const API_BASE = '/api/leave';

export const applyLeave = async (leaveData) => {
  const response = await axios.post(`${API_BASE}/apply`, leaveData);
  return response.data;
};

export const getLeaveHistory = async () => {
  const response = await axios.get(`${API_BASE}/history`);
  return response.data;
};

export const getLeaveBalance = async () => {
  const response = await axios.get(`${API_BASE}/balance`);
  return response.data;
};

export const getPendingRequests = async () => {
  const response = await axios.get(`${API_BASE}/pending`);
  return response.data;
};

export const updateLeaveStatus = async (id, status) => {
  const response = await axios.put(`${API_BASE}/status/${id}`, { status });
  return response.data;
};
