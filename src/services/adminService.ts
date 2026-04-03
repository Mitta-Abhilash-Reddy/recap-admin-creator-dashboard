import { authHeaders } from './authService';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';

async function apiFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...authHeaders(), ...(options.headers || {}) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

// ─── Clients ──────────────────────────────────────────────────────────────────
export async function createClient(data: { name: string; phone: string }) {
  return apiFetch('/admin/client', { method: 'POST', body: JSON.stringify(data) });
}

export async function getClients() {
  return apiFetch('/admin/clients');
}

// ─── Events ───────────────────────────────────────────────────────────────────
export async function createEvent(data: {
  clientId: string;
  name: string;
  occasionType: string;
  date: string;
  status?: string;
  totalAmount?: number;
  startTime?: string;
  endTime?: string;
  duration?: string;
  poc?: { name: string; phone: string };
  otp?: { startOtp: string; endOtp: string };
}) {
  return apiFetch('/admin/event', { method: 'POST', body: JSON.stringify(data) });
}

export async function deleteEvent(id: string) {
  return apiFetch(`/admin/event/${id}`, { method: 'DELETE' });
}

export async function getAdminEvents() {
  return apiFetch('/admin/events');
}

// ─── Event Details (description, music, location) ────────────────────────────
export async function updateEventDetails(eventId: string, data: {
  description?: string;
  musicPreferences?: string;
  locationLink?: string;
  clientPoc?: { name: string; phone: string };
}) {
  return apiFetch(`/event-details/${eventId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// ─── Payments ─────────────────────────────────────────────────────────────────
export async function addPayment(data: {
  eventId: string;
  amount: number;
  method: string;
  status: string;
}) {
  return apiFetch('/admin/payment', { method: 'POST', body: JSON.stringify(data) });
}

// ─── Creator Assignment ───────────────────────────────────────────────────────
export async function assignCreator(creatorId: string, eventId: string) {
  return apiFetch('/admin/assign-creator', {
    method: 'POST',
    body: JSON.stringify({ creatorId, eventId }),
  });
}

export async function getCreators() {
  return apiFetch('/admin/creators');
}

// ─── File Upload ──────────────────────────────────────────────────────────────
export async function uploadFile(
  file: File,
  clientId: string,
  eventId: string,
  fileType: 'reel' | 'picture' | 'raw',
  onProgress?: (pct: number) => void
): Promise<{ id: string; name: string; url: string; size: number; createdAt: string }> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('clientId', clientId);
    formData.append('eventId', eventId);
    formData.append('fileType', fileType);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/admin/upload`);

    const token = localStorage.getItem('rr_admin_token');
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve(JSON.parse(xhr.responseText));
      else reject(new Error(JSON.parse(xhr.responseText)?.error || 'Upload failed'));
    };
    xhr.onerror = () => reject(new Error('Network error'));
    xhr.send(formData);
  });
}

export async function deleteFile(id: string) {
  return apiFetch(`/admin/file/${id}`, { method: 'DELETE' });
}

// ─── Dashboard (for client detail view in admin) ─────────────────────────────
export async function getClientDashboard(uniqueLinkId: string) {
  return apiFetch(`/p/${uniqueLinkId}`);
}