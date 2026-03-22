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
  fileType: 'picture' | 'raw',
  onProgress?: (pct: number) => void
): Promise<{ id: string; name: string; url: string; size: number; createdAt: string }> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('eventId', eventId);
    formData.append('fileType', fileType);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/creator/upload`);

    const token = localStorage.getItem('rr_token');
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
