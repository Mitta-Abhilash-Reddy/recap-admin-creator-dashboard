import  { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser, clearAuth } from '../../services/authService';
import { getCreatorEvents, creatorUpload, submitOtp } from '../../services/creatorService';
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

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const STATUS_BADGE: Record<string, string> = {
  UPCOMING: 'rr-badge-purple',
  ONGOING: 'rr-badge-amber',
  COMPLETED: 'rr-badge-green',
  CANCELLED: 'rr-badge-red',
};

const EVENT_TABS = [
  { id: 'upcoming', label: '📅 Upcoming', filter: (e: AssignedEvent) => e.status === 'UPCOMING' },
  { id: 'ongoing',  label: '🔴 Ongoing',  filter: (e: AssignedEvent) => e.status === 'ONGOING' },
  { id: 'done',     label: '✅ Completed', filter: (e: AssignedEvent) => e.status === 'COMPLETED' },
  { id: 'all',      label: '📋 All',       filter: (_: AssignedEvent) => true },
];

// ─── OTP Panel ───────────────────────────────────────────────────────────────
function OtpPanel({ event }: { event: AssignedEvent }) {
  const [startInput, setStartInput] = useState('');
  const [endInput, setEndInput] = useState('');
  const [startMsg, setStartMsg] = useState<{ text: string; type: 'error' | 'success' } | null>(null);
  const [endMsg, setEndMsg] = useState<{ text: string; type: 'error' | 'success' } | null>(null);
  const [startLoading, setStartLoading] = useState(false);
  const [endLoading, setEndLoading] = useState(false);

  async function handleOtp(type: 'start' | 'end') {
    const val = type === 'start' ? startInput : endInput;
    const setLoading = type === 'start' ? setStartLoading : setEndLoading;
    const setMsg = type === 'start' ? setStartMsg : setEndMsg;
    if (!val.trim()) return setMsg({ text: 'Enter the OTP from the client', type: 'error' });
    setLoading(true); setMsg(null);
    try {
      await submitOtp(event.id, type, val.trim());
      setMsg({ text: `${type === 'start' ? 'Event started' : 'Event ended'}! Time recorded. ✓`, type: 'success' });
      if (type === 'start') setStartInput('');
      else setEndInput('');
    } catch (err: any) {
      setMsg({ text: err.message || 'Invalid OTP', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 12, color: 'var(--text3)', padding: '8px 12px', background: 'var(--surface2)', borderRadius: 'var(--r-md)', lineHeight: 1.6 }}>
        💡 Ask the client for their <strong style={{ color: 'var(--text)' }}>Start OTP</strong> when the event begins, and the <strong style={{ color: 'var(--text)' }}>End OTP</strong> when it ends. This tracks event time automatically.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {/* Start OTP */}
        <div style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 'var(--r-lg)', padding: 14 }}>
          <div style={{ fontSize: 11, color: 'var(--green)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Start OTP</div>
          {startMsg && (
            <div style={{ fontSize: 12, padding: '6px 8px', borderRadius: 'var(--r-sm)', marginBottom: 8, background: startMsg.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: startMsg.type === 'success' ? 'var(--green)' : 'var(--red)' }}>
              {startMsg.text}
            </div>
          )}
          <input
            value={startInput}
            onChange={e => setStartInput(e.target.value)}
            placeholder="Enter start OTP"
            style={{ marginBottom: 8, textAlign: 'center', fontWeight: 700, fontSize: 18, letterSpacing: 4, borderColor: 'rgba(34,197,94,0.3)' }}
          />
          <button
            onClick={() => handleOtp('start')}
            disabled={startLoading}
            style={{ width: '100%', padding: '8px', borderRadius: 'var(--r-md)', border: 'none', background: 'var(--green)', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer', opacity: startLoading ? 0.6 : 1 }}
          >
            {startLoading ? <span className="rr-spinner" /> : '▶ Start Event'}
          </button>
        </div>

        {/* End OTP */}
        <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--r-lg)', padding: 14 }}>
          <div style={{ fontSize: 11, color: 'var(--red)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>End OTP</div>
          {endMsg && (
            <div style={{ fontSize: 12, padding: '6px 8px', borderRadius: 'var(--r-sm)', marginBottom: 8, background: endMsg.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: endMsg.type === 'success' ? 'var(--green)' : 'var(--red)' }}>
              {endMsg.text}
            </div>
          )}
          <input
            value={endInput}
            onChange={e => setEndInput(e.target.value)}
            placeholder="Enter end OTP"
            style={{ marginBottom: 8, textAlign: 'center', fontWeight: 700, fontSize: 18, letterSpacing: 4, borderColor: 'rgba(239,68,68,0.3)' }}
          />
          <button
            onClick={() => handleOtp('end')}
            disabled={endLoading}
            style={{ width: '100%', padding: '8px', borderRadius: 'var(--r-md)', border: 'none', background: 'var(--red)', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer', opacity: endLoading ? 0.6 : 1 }}
          >
            {endLoading ? <span className="rr-spinner" /> : '■ End Event'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Event Card ──────────────────────────────────────────────────────────────
function EventCard({ event, onUpload, onOtp }: {
  event: AssignedEvent;
  onUpload: () => void;
  onOtp: () => void;
}) {
  return (
    <div className="rr-card" style={{ cursor: 'default' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>{event.name}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px 10px', marginTop: 5, fontSize: 12, color: 'var(--text2)' }}>
            <span>👤 {event.client.name}</span>
            {event.occasionType && <span>🎉 {event.occasionType}</span>}
            <span>📅 {fmtDate(event.date)}</span>
          </div>
        </div>
        <span className={`rr-badge ${STATUS_BADGE[event.status] || 'rr-badge-purple'}`}>{event.status}</span>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button
          className="rr-btn rr-btn-primary"
          onClick={onUpload}
          style={{ flex: 1, fontSize: 12, height: 36 }}
        >
          ⬆️ Upload Files
        </button>
        <button
          className="rr-btn rr-btn-ghost"
          onClick={onOtp}
          style={{ flex: 1, fontSize: 12, height: 36 }}
        >
          🔑 OTP Check-in
        </button>
      </div>
    </div>
  );
}

// ─── Upload Panel ────────────────────────────────────────────────────────────
function UploadPanel({ event, onClose }: { event: AssignedEvent; onClose: () => void }) {
  const [fileType, setFileType] = useState<'reel' | 'picture' | 'raw'>('reel');

  const handleUpload = useCallback(
    (file: File, onProgress: (p: number) => void) =>
      creatorUpload(file, event.id, fileType, onProgress),
    [event.id, fileType]
  );

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ width: '100%', maxWidth: 540, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-xl) var(--r-xl) 0 0', padding: 24, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, color: 'var(--text)' }}>Upload Files</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{event.name} · {event.client.name}</div>
          </div>
          <button className="rr-btn rr-btn-ghost rr-btn-sm" onClick={onClose}>✕</button>
        </div>

        {/* File type selector — all 3 types for creator */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 16 }}>
          {(['reel', 'picture', 'raw'] as const).map(ft => (
            <button key={ft} type="button" onClick={() => setFileType(ft)}
              style={{ padding: '10px', borderRadius: 'var(--r-md)', border: `1px solid ${fileType === ft ? 'var(--accent)' : 'var(--border)'}`, background: fileType === ft ? 'var(--accent-bg)' : 'var(--surface2)', color: fileType === ft ? 'var(--accent2)' : 'var(--text2)', fontWeight: 600, fontSize: 13, cursor: 'pointer', textAlign: 'center' }}>
              {ft === 'reel' ? '🎬 Reel' : ft === 'picture' ? '🖼️ Picture' : '📦 Raw'}
            </button>
          ))}
        </div>

        <FileUploader
          onUpload={handleUpload}
          label={`Upload ${fileType}s`}
          accept={fileType === 'picture' ? 'image/*' : fileType === 'reel' ? 'video/*' : '*'}
          hint="Drag & drop or tap to browse. Multiple files supported."
        />
      </div>
    </div>
  );
}

// ─── OTP Modal ───────────────────────────────────────────────────────────────
function OtpModal({ event, onClose }: { event: AssignedEvent; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ width: '100%', maxWidth: 480, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-xl)', padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, color: 'var(--text)' }}>🔑 OTP Check-in</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{event.name}</div>
          </div>
          <button className="rr-btn rr-btn-ghost rr-btn-sm" onClick={onClose}>✕</button>
        </div>
        <OtpPanel event={event} />
      </div>
    </div>
  );
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
export default function CreatorDashboard() {
  const navigate = useNavigate();
  const user = getUser();
  const [events, setEvents] = useState<AssignedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [uploadEvent, setUploadEvent] = useState<AssignedEvent | null>(null);
  const [otpEvent, setOtpEvent] = useState<AssignedEvent | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    getCreatorEvents()
      .then(setEvents)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  function handleLogout() { clearAuth(); navigate('/creator/login'); }

  const tabDef = EVENT_TABS.find(t => t.id === activeTab) || EVENT_TABS[3];

  const filtered = events
    .filter(tabDef.filter)
    .filter(e =>
      !search ||
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.client.name.toLowerCase().includes(search.toLowerCase())
    );

  const counts: Record<string, number> = {};
  EVENT_TABS.forEach(t => { counts[t.id] = events.filter(t.filter).length; });

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {uploadEvent && <UploadPanel event={uploadEvent} onClose={() => setUploadEvent(null)} />}
      {otpEvent && <OtpModal event={otpEvent} onClose={() => setOtpEvent(null)} />}

      {/* Header */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0 20px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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

      <div className="rr-fadein" style={{ padding: '20px 16px', maxWidth: 680, margin: '0 auto' }}>
        {/* Page title */}
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>My Events</h2>
          <span className="rr-badge rr-badge-purple">{events.length} assigned</span>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 4, marginBottom: 14 }}>
          {EVENT_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '7px 14px', borderRadius: 999, border: `1px solid ${activeTab === tab.id ? 'var(--accent)' : 'var(--border)'}`,
                background: activeTab === tab.id ? 'var(--accent-bg)' : 'var(--surface)',
                color: activeTab === tab.id ? 'var(--accent2)' : 'var(--text2)',
                fontSize: 12, fontWeight: activeTab === tab.id ? 600 : 400,
                cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
              }}
            >
              {tab.label}
              {counts[tab.id] > 0 && (
                <span style={{ marginLeft: 5, opacity: 0.65 }}>({counts[tab.id]})</span>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, pointerEvents: 'none' }}>🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search events or clients…"
            style={{ paddingLeft: 36, height: 38 }}
          />
        </div>

        {error && <div className="rr-alert rr-alert-error">{error}</div>}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text3)' }}>
            <span className="rr-spinner" style={{ color: 'var(--accent)' }} />
            <div style={{ marginTop: 12, fontSize: 13 }}>Loading events…</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rr-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>
              {activeTab === 'upcoming' ? '📭' : activeTab === 'done' ? '🎉' : '📭'}
            </div>
            <div style={{ color: 'var(--text2)', fontWeight: 600 }}>
              {search ? 'No events match your search' : activeTab === 'upcoming' ? 'No upcoming events' : activeTab === 'done' ? 'No completed events yet' : 'No events assigned yet'}
            </div>
            {!search && activeTab === 'all' && (
              <div style={{ color: 'var(--text3)', fontSize: 12, marginTop: 4 }}>Ask your admin to assign you to an event</div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map(ev => (
              <EventCard
                key={ev.id}
                event={ev}
                onUpload={() => setUploadEvent(ev)}
                onOtp={() => setOtpEvent(ev)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}