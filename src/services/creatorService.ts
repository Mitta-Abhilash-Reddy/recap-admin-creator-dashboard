import { authHeaders } from './authService';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';

export async function getCreatorEvents() {
  const res = await fetch(`${API_BASE}/creator/events`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to fetch events');
  return res.json();
}

export async function creatorUpload(
  file: File,
  eventId: string,
  fileType: 'reel' | 'picture' | 'raw',
  onProgress?: (pct: number) => void
): Promise<{ id: string; name: string; url: string; size: number; createdAt: string }> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('eventId', eventId);
    formData.append('fileType', fileType);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/creator/upload`);

    // Use the correct token key (same as authService)
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

// Submit OTP to track event start/end time
export async function submitOtp(eventId: string, otpType: 'start' | 'end', otpValue: string) {
  const res = await fetch(`${API_BASE}/creator/otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ eventId, otpType, otpValue }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'OTP failed' }));
    throw new Error(err.error || 'OTP submission failed');
  }
  return res.json();
}

// Get dashboard data for a specific event's client link (for creator to view their event)
export async function getEventDashboard(uniqueLinkId: string) {
  const res = await fetch(`${API_BASE}/p/${uniqueLinkId}`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to fetch event dashboard');
  return res.json();
}