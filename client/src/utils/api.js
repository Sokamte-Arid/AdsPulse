import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL
  ? `${process.env.REACT_APP_API_URL}/api`
  : '/api';

const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    const status  = err.response?.status;
    const message = err.response?.data?.message || err.message;
    console.error(`[API] ${err.config?.method?.toUpperCase()} ${err.config?.url} → ${status}: ${message}`);
    if (status === 401 && !err.config?.url?.includes('/auth/')) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  login:                (data)           => api.post('/auth/login', data),
  register:             (data)           => api.post('/auth/register', data),
  me:                   ()               => api.get('/auth/me'),
  verify2FA:            (data)           => api.post('/auth/verify-2fa', data),
  resendOTP:            (data)           => api.post('/auth/2fa/resend-otp', data),
  setup2FA:             (data)           => api.post('/auth/2fa/setup', data),
  enable2FA:            (data)           => api.post('/auth/2fa/enable', data),
  disable2FA:           (data)           => api.post('/auth/2fa/disable', data),
  forgotPassword:       (email)          => api.post('/auth/forgot-password', { email }),
  verifyResetToken:     (token)          => api.post('/auth/verify-reset-token', { token }),
  resetPassword:        (token, password)=> api.post('/auth/reset-password', { token, password }),
  changePassword:       (data)           => api.post('/auth/change-password', data),
  // Email verification
  verifyEmail:          (token)          => api.post('/auth/verify-email', { token }),
  resendVerification:   (email)          => api.post('/auth/resend-verification', { email }),
};

export const campaignAPI = {
  getAll:               (params)             => api.get('/campaigns', { params }),
  getById:              (id)                 => api.get(`/campaigns/${id}`),
  create:               (data)               => api.post('/campaigns', data),
  update:               (id, data)           => api.put(`/campaigns/${id}`, data),
  delete:               (id)                 => api.delete(`/campaigns/${id}`),
  toggleStatus:         (id)                 => api.patch(`/campaigns/${id}/toggle-status`),
  push:                 (id)                 => api.post(`/campaigns/${id}/push`),
  updatePlatformBudget: (id, platform, data) => api.patch(`/campaigns/${id}/platforms/${platform}/budget`, data),
  updatePlatformStatus: (id, platform, data) => api.patch(`/campaigns/${id}/platforms/${platform}/status`, data),
};

export const analyticsAPI = {
  getOverview:            (params) => api.get('/analytics/overview', { params }),
  getTimeseries:          (params) => api.get('/analytics/timeseries', { params }),
  getCompare:             (params) => api.get('/analytics/compare', { params }),
  getPlatformPerformance: ()       => api.get('/analytics/platform-performance'),
};

export const platformAPI = {
  getAll:          ()         => api.get('/platforms'),
  getObjectives:   (platform) => api.get(`/platforms/objectives/${platform}`),
  getAllObjectives: ()         => api.get('/platforms/objectives'),
};

export const integrationsAPI = {
  getAll:           ()                => api.get('/integrations'),
  connect:          (platform, creds) => api.post(`/integrations/${platform}/connect`, creds),
  disconnect:       (platform)        => api.delete(`/integrations/${platform}`),
  sync:             (platform)        => api.post(`/integrations/${platform}/sync`),
  checkPermissions: (platform)        => api.get(`/integrations/${platform}/check-permissions`),
};

export const paymentAPI = {
  getAll:     ()     => api.get('/payment-methods'),
  add:        (data) => api.post('/payment-methods', data),
  setDefault: (id)   => api.patch(`/payment-methods/${id}/set-default`),
  delete:     (id)   => api.delete(`/payment-methods/${id}`),
  charge:     (data) => api.post('/payment-methods/charge', data),
};

export const notificationsAPI = {
  getAll:      ()   => api.get('/notifications'),
  markRead:    (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: ()   => api.patch('/notifications/read-all'),
  dismiss:     (id) => api.delete(`/notifications/${id}`),
  clearRead:   ()   => api.delete('/notifications/clear-read'),
};

export default api;
