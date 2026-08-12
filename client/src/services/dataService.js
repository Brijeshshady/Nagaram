import api from './api';

export const authService = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (data) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
};

export const complaintService = {
  create: (formData) => api.post('/complaints', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getAll: (params) => api.get('/complaints', { params }),
  getById: (id) => api.get(`/complaints/${id}`),
  getDailyUpdates: () => api.get('/complaints/daily-updates'),
  assign: (id, data) => api.patch(`/complaints/${id}/assign`, data),
  updateStatus: (id, data) => api.patch(`/complaints/${id}/status`, data),
  verify: (id, formData) => api.patch(`/complaints/${id}/verify`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  submitFeedback: (id, data) => api.post(`/complaints/${id}/feedback`, data),
  escalate: (id, data) => api.post(`/complaints/${id}/escalate`, data),
};

export const userService = {
  getAll: (params) => api.get('/users', { params }),
  create: (data) => api.post('/users', data),
  getById: (id) => api.get(`/users/${id}`),
  update: (id, data) => api.patch(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
};

export const departmentService = {
  getAll: () => api.get('/departments'),
  create: (data) => api.post('/departments', data),
  update: (id, data) => api.patch(`/departments/${id}`, data),
  delete: (id) => api.delete(`/departments/${id}`),
};

export const wardService = {
  getAll: () => api.get('/wards'),
  create: (data) => api.post('/wards', data),
  update: (id, data) => api.patch(`/wards/${id}`, data),
  delete: (id) => api.delete(`/wards/${id}`),
};

export const analyticsService = {
  getOverview: (params) => api.get('/analytics/overview', { params }),
  getByCategory: (params) => api.get('/analytics/by-category', { params }),
  getTrends: (days = 7) => api.get('/analytics/trends', { params: { days } }),
  getHeatmap: () => api.get('/analytics/heatmap'),
};

export const dustbinService = {
  getAll: (params) => api.get('/dustbins', { params }),
  create: (data) => api.post('/dustbins', data),
  update: (id, data) => api.patch(`/dustbins/${id}`, data),
  remove: (id) => api.delete(`/dustbins/${id}`),
};

export const routeService = {
  getRoute: (params) => api.get('/routes', { params }),
  assignRoute: (data) => api.post('/routes/assign', data),
  autoCalculate: (data) => api.post('/routes/auto-calculate', data),
};

export const notificationService = {
  getAll: (params) => api.get('/notifications', { params }),
  markAsRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: () => api.patch('/notifications/read-all'),
};

export const announcementService = {
  getAll: () => api.get('/announcements'),
  create: (data) => api.post('/announcements', data),
  update: (id, data) => api.patch(`/announcements/${id}`, data),
  delete: (id) => api.delete(`/announcements/${id}`),
};
