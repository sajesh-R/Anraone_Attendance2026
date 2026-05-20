import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const getAuthHeaders = () => {
  // Support both legacy `token` key and current `att_token` key
  const token = localStorage.getItem('att_token') || localStorage.getItem('token');
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};

export const fetchIndividualReport = async (employeeId, startDate, endDate) => {
  const res = await axios.get(`${API_URL}/reports/individual`, {
    params: { employeeId, startDate, endDate },
    ...getAuthHeaders()
  });
  return res.data;
};

export const fetchTeamReport = async (department, startDate, endDate) => {
  const res = await axios.get(`${API_URL}/reports/team`, {
    params: { department, startDate, endDate },
    ...getAuthHeaders()
  });
  return res.data;
};

export const fetchAbsenteeismTrends = async (startDate, endDate) => {
  const res = await axios.get(`${API_URL}/reports/absenteeism`, {
    params: { startDate, endDate },
    ...getAuthHeaders()
  });
  return res.data;
};

export const fetchLateArrivalHeatmap = async (startDate, endDate) => {
  const res = await axios.get(`${API_URL}/reports/late-heatmap`, {
    params: { startDate, endDate },
    ...getAuthHeaders()
  });
  return res.data;
};
