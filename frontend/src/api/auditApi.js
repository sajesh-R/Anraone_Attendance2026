import axios from 'axios';

/**
 * Audit Trail API Service
 */
export const getAuditTrail = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const { data } = await axios.get(`/api/audit-trail?${query}`);
  return data;
};
