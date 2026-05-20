import axios from 'axios';

/**
 * Attendance API Service
 */
export const checkIn = async (attendanceData) => {
  const { data } = await axios.post('/api/attendance/check-in', attendanceData);
  return data;
};

export const checkOut = async (attendanceData) => {
  const { data } = await axios.post('/api/attendance/check-out', attendanceData);
  return data;
};

export const getLiveStatus = async () => {
  const { data } = await axios.get('/api/attendance/live-status');
  return data;
};

export const getDashboardSummary = async () => {
  const { data } = await axios.get('/api/attendance/dashboard-summary');
  return data;
};

export const getAttendanceHistory = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const { data } = await axios.get(`/api/attendance/history?${query}`);
  return data;
};


export const getUserIP = async () => {
  try {
    const { data } = await axios.get('https://api.ipify.org?format=json');
    return data.ip;
  } catch (error) {
    console.warn('External IP fetch failed, trying backend fallback...');
    try {
      const { data } = await axios.get('/api/attendance/my-ip');
      return data.ip;
    } catch (fallbackError) {
      console.error('All IP detection methods failed:', fallbackError);
      return '0.0.0.0';
    }
  }
};

