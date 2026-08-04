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
  getOverview: () => api.get('/analytics/overview'),
  getByCategory: () => api.get('/analytics/by-category'),
  getTrends: (days) => api.get('/analytics/trends', { params: { days } }),
  getDepartment: (id) => api.get(`/analytics/department/${id}`),
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
