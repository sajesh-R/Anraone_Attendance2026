import axios from 'axios';

/**
 * Regularization API Service
 */
export const applyRegularization = async (regularizationData) => {
  const { data } = await axios.post('/api/regularization/apply', regularizationData);
  return data;
};

export const getMyRegularizationRequests = async () => {
  const { data } = await axios.get('/api/regularization/my-requests');
  return data;
};

export const getPendingRegularizationRequests = async () => {
  const { data } = await axios.get('/api/regularization/pending');
  return data;
};

export const updateRegularizationStatus = async (id, statusData) => {
  const { data } = await axios.put(`/api/regularization/approve/${id}`, statusData);
  return data;
};
