// src/lib/api.js
// Thin fetch wrapper. In dev, Vite's proxy (vite.config.js) forwards /api/*
// to the backend so no CORS handling is needed. In production, either serve
// this build behind the same reverse proxy as the API, or set
// VITE_API_BASE_URL at build time to the full backend origin.

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

function getToken(kind) {
  return localStorage.getItem(kind === 'admin' ? 'adminToken' : 'studentToken');
}

async function apiRequest(path, { method = 'GET', body, tokenKind = 'student', isFormData = false, signal } = {}) {
  const headers = {};
  const token = getToken(tokenKind);
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!isFormData && body) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: isFormData ? body : body ? JSON.stringify(body) : undefined,
    signal,
  });

  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const error = new Error((data && data.error) || `Request failed with status ${res.status}`);
    error.status = res.status;
    error.payload = data;
    throw error;
  }

  return data;
}

export const studentApi = {
  login: (studentNumber, password) =>
    apiRequest('/api/auth/login', { method: 'POST', body: { studentNumber, password } }),
  changePassword: (currentPassword, newPassword) =>
    apiRequest('/api/auth/change-password', { method: 'POST', body: { currentPassword, newPassword } }),
  me: () => apiRequest('/api/auth/me'),
  activeElection: (signal) => apiRequest('/api/elections/active', { signal }),
  ballot: (electionId, signal) => apiRequest(`/api/elections/${electionId}/ballot`, { signal }),
  submitVote: (electionId, selections) =>
    apiRequest(`/api/elections/${electionId}/vote`, { method: 'POST', body: { selections } }),
};

export const adminApi = {
  login: (username, password) =>
    apiRequest('/api/auth/admin-login', { method: 'POST', body: { username, password } }),
  bulkImport: (formData) =>
    apiRequest('/api/admin/students/bulk-import', {
      method: 'POST',
      body: formData,
      tokenKind: 'admin',
      isFormData: true,
    }),
  listElections: (signal) => apiRequest('/api/admin/elections', { tokenKind: 'admin', signal }),
  createElection: (payload) =>
    apiRequest('/api/admin/elections', { method: 'POST', body: payload, tokenKind: 'admin' }),
  setElectionStatus: (id, status) =>
    apiRequest(`/api/admin/elections/${id}/status`, { method: 'PATCH', body: { status }, tokenKind: 'admin' }),
  addPosition: (electionId, payload) =>
    apiRequest(`/api/admin/elections/${electionId}/positions`, { method: 'POST', body: payload, tokenKind: 'admin' }),
  listPositions: (electionId, signal) =>
    apiRequest(`/api/admin/elections/${electionId}/positions`, { tokenKind: 'admin', signal }),
  addCandidate: (positionId, payload) =>
    apiRequest(`/api/admin/elections/positions/${positionId}/candidates`, {
      method: 'POST',
      body: payload,
      tokenKind: 'admin',
    }),
  deleteCandidate: (candidateId) =>
    apiRequest(`/api/admin/elections/candidates/${candidateId}`, {
      method: 'DELETE',
      tokenKind: 'admin',
    }),
  turnout: (electionId, signal) =>
    apiRequest(`/api/admin/elections/${electionId}/turnout`, { tokenKind: 'admin', signal }),
  results: (electionId, signal) =>
    apiRequest(`/api/admin/elections/${electionId}/results`, { tokenKind: 'admin', signal }),
};

export function saveToken(kind, token) {
  localStorage.setItem(kind === 'admin' ? 'adminToken' : 'studentToken', token);
}

export function clearToken(kind) {
  localStorage.removeItem(kind === 'admin' ? 'adminToken' : 'studentToken');
}
