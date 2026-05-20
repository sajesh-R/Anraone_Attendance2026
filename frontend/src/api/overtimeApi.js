import axios from 'axios';

/**
 * Overtime API Service
 */
export const logOvertime = async (overtimeData) => {
  const { data } = await axios.post('/api/overtime/log', overtimeData);
  return data;
};

export const getMyOvertimeRequests = async () => {
  const { data } = await axios.get('/api/overtime/my-requests');
  return data;
};

export const getPendingOvertimeRequests = async () => {
  const { data } = await axios.get('/api/overtime/pending');
  return data;
};

export const updateOvertimeStatus = async (id, statusData) => {
  const { data } = await axios.put(`/api/overtime/approve/${id}`, statusData);
  return data;
};
