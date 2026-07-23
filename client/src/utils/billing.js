import api from './api';

export const billingAPI = {
  getPlans: () => api.get('/billing/plans'),
  getStatus: () => api.get('/billing/status'),
  createCheckout: (planId) => api.post('/billing/create-checkout-session', { planId }),
  openPortal: () => api.post('/billing/portal'),
};
