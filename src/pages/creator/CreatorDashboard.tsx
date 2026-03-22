import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser, clearAuth } from '../../services/authService';
import { getCreatorEvents, creatorUpload } from '../../services/creatorService';
import FileUploader from '../../components/FileUploader';
import '../../styles/design-system.css';

interface AssignedEvent {
  id: string;
  name: string;
  occasionType: string;
  date: string;
  status: string;
  client: { id: string; name: string };
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const statusBadge: Record<string, string> = {
  UPCOMING: 'rr-badge-purple',
  ONGOING: 'rr-badge-amber',
  COMPLETED: 'rr-badge-green',
  CANCELLED: 'rr-badge-red',
};

export default function CreatorDashboard() {
  const navigate = useNavigate();
  const user = getUser();
  const [events, setEvents] = useState<AssignedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<AssignedEvent | null>(null);
  const [fileType, setFileType] = useState<'reel' | 'picture' | 'raw'>('picture');
  const [view, setView] = useState<'events' | 'upload'>('events');

  useEffect(() => {
    getCreatorEvents()
      .then(setEvents)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  function handleLogout() {
    clearAuth();
    navigate('/creator/login');
  }

  const handleUpload = useCallback(
    (file: File, onProgress: (p: number) => void) => {
      if (!selectedEvent) return Promise.reject(new Error('Select an event first'));
      return creatorUpload(file, selectedEvent.id, fileType, onProgress);
    },
    [selectedEvent, fileType]
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        padding: '0 20px',
        height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--green-bg)', border: '1px solid rgba(34,197,94,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🎬</div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13, color: 'var(--text)' }}>RecapReels</div>
            <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Creator</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: 'var(--text2)' }}>{user?.name || user?.email}</span>
          <button className="rr-btn rr-btn-ghost rr-btn-sm" onClick={handleLogout}>Sign Out</button>
        </div>
      </header>

      {/* Tab bar */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0 20px', display: 'flex', gap: 4 }}>
        {[
          { id: 'events', label: '📅 My Events' },
          { id: 'upload', label: '⬆️ Upload' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setView(tab.id as 'events' | 'upload')}
            style={{
              padding: '12px 16px', border: 'none', background: 'transparent',
              color: view === tab.id ? 'var(--accent2)' : 'var(--text2)',
              fontWeight: view === tab.id ? 600 : 400,
              fontSize: 13, cursor: 'pointer',
              borderBottom: `2px solid ${view === tab.id ? 'var(--accent)' : 'transparent'}`,
              transition: 'all 0.15s',
            }}
          >{tab.label}</button>
        ))}
      </div>

      <div className="rr-fadein" style={{ padding: '24px 20px', maxWidth: 700, margin: '0 auto' }}>

        {/* ── EVENTS VIEW ── */}
        {view === 'events' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>
                Assigned Events
              </h2>
              <span className="rr-badge rr-badge-purple">{events.length} total</span>
            </div>

            {error && <div className="rr-alert rr-alert-error">{error}</div>}

            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text3)' }}>
                <span className="rr-spinner" style={{ color: 'var(--accent)' }} />
                <div style={{ marginTop: 12, fontSize: 13 }}>Loading events…</div>
              </div>
            ) : events.length === 0 ? (
              <div className="rr-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
                <div style={{ color: 'var(--text2)', fontWeight: 600 }}>No events assigned yet</div>
                <div style={{ color: 'var(--text3)', fontSize: 12, marginTop: 4 }}>Ask your admin to assign you to an event</div>
              </div>
            ) : (
              events.map(ev => (
                <div key={ev.id} className="rr-card" style={{ cursor: 'pointer', transition: 'border-color 0.15s', borderColor: selectedEvent?.id === ev.id ? 'var(--accent)' : 'var(--border)' }}
                  onClick={() => { setSelectedEvent(ev); setView('upload'); }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>{ev.name}</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', marginTop: 6 }}>
                        <span style={{ fontSize: 12, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          👤 {ev.client.name}
                        </span>
                        {ev.occasionType && (
                          <span style={{ fontSize: 12, color: 'var(--text2)' }}>🎉 {ev.occasionType}</span>
                        )}
                        <span style={{ fontSize: 12, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          📅 {formatDate(ev.date)}
                        </span>
                      </div>
                    </div>
                    <span className={`rr-badge ${statusBadge[ev.status] || 'rr-badge-purple'}`}>{ev.status}</span>
                  </div>

                  <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                    <span style={{ fontSize: 12, color: 'var(--accent2)', fontWeight: 600 }}>Upload files →</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── UPLOAD VIEW ── */}
        {view === 'upload' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>
              Upload Files
            </h2>

            {/* Restriction notice */}
            <div style={{ padding: '10px 14px', background: 'var(--amber-bg)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 'var(--r-md)', fontSize: 12, color: 'var(--amber)' }}>
              ⚠️ You can upload <strong>pictures</strong> and <strong>raw files</strong> only. Reels are managed by admin.
            </div>

            {/* Event selector */}
            <div className="rr-card">
              <div className="rr-card-title">📅 Select Event</div>
              {events.length === 0 ? (
                <div style={{ color: 'var(--text3)', fontSize: 13 }}>No events available</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {events.map(ev => (
                    <button
                      key={ev.id}
                      onClick={() => setSelectedEvent(ev)}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '10px 14px', borderRadius: 'var(--r-md)', border: `1px solid ${selectedEvent?.id === ev.id ? 'var(--accent)' : 'var(--border)'}`,
                        background: selectedEvent?.id === ev.id ? 'var(--accent-bg)' : 'var(--surface2)',
                        color: 'var(--text)', textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{ev.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>{ev.client.name} · {formatDate(ev.date)}</div>
                      </div>
                      {selectedEvent?.id === ev.id && <span style={{ color: 'var(--accent)', fontSize: 16 }}>✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* File type selector */}
            <div className="rr-card">
              <div className="rr-card-title">📂 File Type</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {(['picture', 'raw'] as const).map(ft => (
                  <button
                    key={ft}
                    onClick={() => setFileType(ft)}
                    style={{
                      padding: '12px', border: `1px solid ${fileType === ft ? 'var(--accent)' : 'var(--border)'}`,
                      borderRadius: 'var(--r-md)', background: fileType === ft ? 'var(--accent-bg)' : 'var(--surface2)',
                      color: fileType === ft ? 'var(--accent2)' : 'var(--text2)',
                      fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s',
                      textAlign: 'center',
                    }}
                  >
                    {ft === 'picture' ? '🖼️ Picture' : '📦 Raw'}
                  </button>
                ))}
              </div>
            </div>

            {/* Uploader */}
            <div className="rr-card">
              <div className="rr-card-title">⬆️ Upload</div>
              {!selectedEvent ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text3)', fontSize: 13 }}>
                  Select an event above to start uploading
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: 14, padding: '8px 12px', background: 'var(--surface2)', borderRadius: 'var(--r-md)', fontSize: 12 }}>
                    <span style={{ color: 'var(--text3)' }}>Uploading to: </span>
                    <span style={{ color: 'var(--text)', fontWeight: 600 }}>{selectedEvent.name}</span>
                    <span style={{ color: 'var(--text3)' }}> · </span>
                    <span style={{ color: 'var(--accent2)', fontWeight: 600, textTransform: 'capitalize' }}>{fileType}</span>
                  </div>
                  <FileUploader
                    onUpload={handleUpload}
                    label={`Upload ${fileType}s`}
                    accept={fileType === 'picture' ? 'image/*' : '*'}
                    hint="Drag & drop or click to browse multiple files"
                  />
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
