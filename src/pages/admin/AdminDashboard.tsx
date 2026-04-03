import React, { useState, useEffect, useCallback,  } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser, clearAuth, registerCreator } from '../../services/authService';
import {
  createClient, createEvent, deleteEvent,
  addPayment, assignCreator, uploadFile,
  getClients, getCreators, getAdminEvents,
  updateEventDetails, getClientDashboard,
} from '../../services/adminService';
import FileUploader from '../../components/FileUploader';
import '../../styles/design-system.css';

// ─── Types ───────────────────────────────────────────────────────────────────
interface Client { id: string; name: string; phone: string; uniqueLinkId: string; createdAt?: string }
interface AdminEvent { id: string; name: string; date: string; status: string; occasionType?: string; clientId?: string; clientName?: string; totalAmount?: number }
interface Creator { id: string; name: string; email: string }
interface PaymentRecord { id: string; amount: number; method: string; status: string; createdAt: string }

const NAV = [
  { id: 'clients',  icon: '👥', label: 'Clients' },
  { id: 'events',   icon: '📅', label: 'Events' },
  { id: 'upload',   icon: '📁', label: 'Upload' },
  { id: 'payments', icon: '💰', label: 'Payments' },
  { id: 'assign',   icon: '🔗', label: 'Assign' },
  { id: 'creators', icon: '🎬', label: 'Creators' },
];

const STATUS_BADGE: Record<string, string> = {
  UPCOMING: 'rr-badge-purple', ONGOING: 'rr-badge-amber',
  COMPLETED: 'rr-badge-green', CANCELLED: 'rr-badge-red',
};

function fmt(n: number) { return `₹${n.toLocaleString('en-IN')}`; }
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
// function formatBytes(b: number) {
//   if (b < 1048576) return `${(b / 1024).toFixed(0)} KB`;
//   return `${(b / 1048576).toFixed(1)} MB`;
// }

// ─── Tiny helper components ───────────────────────────────────────────────────
function SectionHeader({ title, icon }: { title: string; icon: string }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>{icon}</span>{title}
      </h2>
    </div>
  );
}
function Alert({ msg, type }: { msg: string; type: 'error' | 'success' }) {
  return <div className={`rr-alert rr-alert-${type}`}>{msg}</div>;
}
function EmptyState({ label }: { label: string }) {
  return <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text3)', fontSize: 13 }}>{label}</div>;
}

// ─── Search bar ──────────────────────────────────────────────────────────────
function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div style={{ position: 'relative', marginBottom: 14 }}>
      <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, pointerEvents: 'none' }}>🔍</span>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder || 'Search…'}
        style={{ paddingLeft: 36, height: 38 }}
      />
    </div>
  );
}

// ─── Copy button with "Copied!" feedback ────────────────────────────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button
      className="rr-btn rr-btn-ghost rr-btn-sm"
      onClick={handleCopy}
      style={{
        minWidth: 68,
        background: copied ? 'var(--green-bg)' : undefined,
        color: copied ? 'var(--green)' : undefined,
        borderColor: copied ? 'rgba(34,197,94,0.35)' : undefined,
        transition: 'all 0.2s',
      }}
    >
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  );
}

// ─── Client Detail Modal ─────────────────────────────────────────────────────
function ClientDetailModal({ client, onClose }: { client: Client; onClose: () => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getClientDashboard(client.uniqueLinkId)
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [client.uniqueLinkId]);

  const host = window.location.hostname === 'localhost'
    ? 'http://localhost:8080'
    : `https://${window.location.hostname.replace('admin.', '')}`;
  const link = `${host}/p/${client.uniqueLinkId}`;

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '20px 16px', overflowY: 'auto' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ width: '100%', maxWidth: 640, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-xl)', padding: 24, marginTop: 20 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, color: 'var(--text)' }}>{client.name}</h2>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 3 }}>{client.phone}</div>
          </div>
          <button className="rr-btn rr-btn-ghost rr-btn-sm" onClick={onClose}>✕ Close</button>
        </div>

        {/* Link */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--surface2)', borderRadius: 'var(--r-md)', marginBottom: 20, fontSize: 12, color: 'var(--text2)', wordBreak: 'break-all' }}>
          <span style={{ flex: 1 }}>{link}</span>
          <CopyButton text={link} />
        </div>

        {loading && <div style={{ textAlign: 'center', padding: 32 }}><span className="rr-spinner" style={{ color: 'var(--accent)' }} /></div>}
        {error && <Alert msg={error} type="error" />}

        {data && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Events */}
            {(data.eventsFull || []).map((ev: any) => (
              <div key={ev.id} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{ev.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{ev.occasionType} · {fmtDate(ev.date)}</div>
                  </div>
                  <span className={`rr-badge ${STATUS_BADGE[ev.status] || 'rr-badge-purple'}`}>{ev.status}</span>
                </div>

                {/* OTPs */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                  <div style={{ padding: '8px 12px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 'var(--r-md)', textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: 'var(--green)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Start OTP</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--green)', fontFamily: 'var(--font-display)' }}>{ev.otp?.startOtp || '—'}</div>
                  </div>
                  <div style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--r-md)', textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: 'var(--red)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>End OTP</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--red)', fontFamily: 'var(--font-display)' }}>{ev.otp?.endOtp || '—'}</div>
                  </div>
                </div>

                {/* POC */}
                {ev.poc?.name && (
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8 }}>
                    🎯 ROG Buddy: <span style={{ color: 'var(--accent2)', fontWeight: 600 }}>{ev.poc.name}</span> · {ev.poc.phone}
                  </div>
                )}

                {/* Payment summary */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6, marginBottom: 10 }}>
                  {[
                    { label: 'Total', val: fmt(ev.payments?.total || 0), c: 'var(--text)' },
                    { label: 'Paid', val: fmt(ev.payments?.paid || 0), c: 'var(--green)' },
                    { label: 'Due', val: fmt(ev.payments?.due || 0), c: 'var(--amber)' },
                  ].map(s => (
                    <div key={s.label} style={{ background: 'var(--bg)', borderRadius: 'var(--r-sm)', padding: '6px 8px', textAlign: 'center' }}>
                      <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase' }}>{s.label}</div>
                      <div style={{ fontWeight: 700, color: s.c, fontSize: 13 }}>{s.val}</div>
                    </div>
                  ))}
                </div>

                {/* Payment history */}
                {(ev.payments?.history || []).length > 0 && (
                  <div style={{ marginTop: 6 }}>
                    <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Payment History</div>
                    {ev.payments.history.map((p: any) => (
                      <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                        <span style={{ color: 'var(--text2)' }}>{p.method} · {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '—'}</span>
                        <span style={{ fontWeight: 700, color: p.status === 'PAID' ? 'var(--green)' : 'var(--amber)' }}>{fmt(p.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Files count */}
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text3)' }}>
                  📁 {ev.files?.reels?.length || 0} reels · {ev.files?.pictures?.length || 0} pictures · {ev.files?.raw?.length || 0} raw
                </div>
              </div>
            ))}
            {(!data.eventsFull || data.eventsFull.length === 0) && (
              <EmptyState label="No events for this client yet" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SECTION: Clients ────────────────────────────────────────────────────────
function ClientsSection({ clients, setClients }: { clients: Client[]; setClients: React.Dispatch<React.SetStateAction<Client[]>> }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [msg, setMsg] = useState<{ text: string; type: 'error' | 'success' } | null>(null);
  const [search, setSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const host = window.location.hostname === 'localhost'
    ? 'http://localhost:8080'
    : `https://${window.location.hostname.replace('admin.', '')}`;

  useEffect(() => {
    getClients()
      .then(setClients)
      .catch(e => setMsg({ text: e.message, type: 'error' }))
      .finally(() => setFetching(false));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setMsg(null);
    try {
      const c = await createClient({ name, phone });
      setClients(prev => [c, ...prev]);
      setName(''); setPhone('');
      setMsg({ text: 'Client created!', type: 'success' });
    } catch (err: any) { setMsg({ text: err.message, type: 'error' }); }
    finally { setLoading(false); }
  }

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {selectedClient && (
        <ClientDetailModal client={selectedClient} onClose={() => setSelectedClient(null)} />
      )}

      <SectionHeader title="Client Management" icon="👥" />

      <div className="rr-card">
        <div className="rr-card-title">➕ New Client</div>
        {msg && <Alert msg={msg.text} type={msg.type} />}
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="rr-field"><label>Name</label><input value={name} onChange={e => setName(e.target.value)} placeholder="John Doe" required /></div>
            <div className="rr-field"><label>Phone</label><input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" required /></div>
          </div>
          <button type="submit" className="rr-btn rr-btn-primary" disabled={loading} style={{ alignSelf: 'flex-start' }}>
            {loading ? <span className="rr-spinner" /> : '+ Create Client'}
          </button>
        </form>
      </div>

      <div className="rr-card">
        <div className="rr-card-title">📋 All Clients ({clients.length})</div>
        <SearchBar value={search} onChange={setSearch} placeholder="Search by name or phone…" />
        {fetching ? (
          <div style={{ textAlign: 'center', padding: 24 }}><span className="rr-spinner" style={{ color: 'var(--accent)' }} /></div>
        ) : filtered.length === 0 ? <EmptyState label={search ? 'No clients match your search' : 'No clients yet'} /> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(c => {
              const link = `${host}/p/${c.uniqueLinkId}`;
              return (
                <div key={c.id} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '12px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <button
                      onClick={() => setSelectedClient(c)}
                      style={{ textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                    >
                      <div style={{ fontWeight: 600, color: 'var(--accent2)', fontSize: 14 }}>{c.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{c.phone}</div>
                    </button>
                    <span className="rr-badge rr-badge-green">Active</span>
                  </div>
                  <div style={{ marginTop: 10, padding: '8px 12px', background: 'var(--bg)', borderRadius: 'var(--r-sm)', fontSize: 11, color: 'var(--text2)', wordBreak: 'break-all', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{link}</span>
                    <CopyButton text={link} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SECTION: Events ─────────────────────────────────────────────────────────
const EVENT_FILTERS = ['ALL', 'UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED'] as const;

function EventsSection({ events, setEvents, clients }: {
  events: AdminEvent[];
  setEvents: React.Dispatch<React.SetStateAction<AdminEvent[]>>;
  clients: Client[];
}) {
  const [clientId, setClientId] = useState('');
  const [name, setName] = useState('');
  const [occasionType, setOccasionType] = useState('');
  const [date, setDate] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [description, setDescription] = useState('');
  const [musicPrefs, setMusicPrefs] = useState('');
  const [locationLink, setLocationLink] = useState('');
  const [showOptional, setShowOptional] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [msg, setMsg] = useState<{ text: string; type: 'error' | 'success' } | null>(null);
  const [filter, setFilter] = useState<typeof EVENT_FILTERS[number]>('ALL');
  const [search, setSearch] = useState('');

  useEffect(() => {
    getAdminEvents()
      .then(setEvents)
      .catch(e => setMsg({ text: e.message, type: 'error' }))
      .finally(() => setFetching(false));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId) return setMsg({ text: 'Select a client', type: 'error' });
    setLoading(true); setMsg(null);
    try {
      const ev = await createEvent({
        clientId, name, occasionType, date,
        totalAmount: Number(totalAmount) || 0,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
      });
      const client = clients.find(c => c.id === clientId);
      const newEv = { ...ev, clientName: client?.name, clientId };
      setEvents(prev => [newEv, ...prev]);

      // If optional fields filled, patch event_details
      if (description || musicPrefs || locationLink) {
        await updateEventDetails(ev.id, {
          description: description || undefined,
          musicPreferences: musicPrefs || undefined,
          locationLink: locationLink || undefined,
        }).catch(() => {});
      }

      setName(''); setDate(''); setOccasionType(''); setTotalAmount('');
      setStartTime(''); setEndTime(''); setDescription(''); setMusicPrefs(''); setLocationLink('');
      setMsg({ text: 'Event created!', type: 'success' });
    } catch (err: any) { setMsg({ text: err.message, type: 'error' }); }
    finally { setLoading(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this event?')) return;
    try {
      await deleteEvent(id);
      setEvents(prev => prev.filter(e => e.id !== id));
    } catch (err: any) { alert(err.message); }
  }

  const filtered = events.filter(ev => {
    const matchFilter = filter === 'ALL' || ev.status === filter;
    const matchSearch = !search ||
      ev.name.toLowerCase().includes(search.toLowerCase()) ||
      (ev.clientName || '').toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const counts: Record<string, number> = {};
  EVENT_FILTERS.forEach(f => {
    counts[f] = f === 'ALL' ? events.length : events.filter(e => e.status === f).length;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionHeader title="Event Management" icon="📅" />

      {/* Create form */}
      <div className="rr-card">
        <div className="rr-card-title">➕ New Event</div>
        {msg && <Alert msg={msg.text} type={msg.type} />}
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="rr-field">
            <label>Client</label>
            <select value={clientId} onChange={e => setClientId(e.target.value)} required>
              <option value="">Select client…</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="rr-field"><label>Event Name</label><input value={name} onChange={e => setName(e.target.value)} placeholder="Priya & Rahul Wedding" required /></div>
          <div className="rr-field"><label>Occasion Type</label><input value={occasionType} onChange={e => setOccasionType(e.target.value)} placeholder="Wedding / Birthday / Corporate…" /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="rr-field"><label>Date</label><input type="date" value={date} onChange={e => setDate(e.target.value)} required /></div>
            <div className="rr-field"><label>Total Amount (₹)</label><input type="number" value={totalAmount} onChange={e => setTotalAmount(e.target.value)} placeholder="50000" /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="rr-field"><label>Start Time</label><input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} /></div>
            <div className="rr-field"><label>End Time</label><input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} /></div>
          </div>

          {/* Optional fields toggle */}
          <button
            type="button"
            onClick={() => setShowOptional(!showOptional)}
            style={{ background: 'none', border: 'none', color: 'var(--accent2)', fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'left', padding: 0 }}
          >
            {showOptional ? '▲ Hide' : '▼ Show'} optional details (description, music, location)
          </button>

          {showOptional && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '12px 14px', background: 'var(--surface2)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
              <div className="rr-field">
                <label>Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Event details, special notes…" style={{ resize: 'vertical' }} />
              </div>
              <div className="rr-field">
                <label>Music Preferences</label>
                <input value={musicPrefs} onChange={e => setMusicPrefs(e.target.value)} placeholder="Bollywood, EDM, Classical…" />
              </div>
              <div className="rr-field">
                <label>Location Link</label>
                <input value={locationLink} onChange={e => setLocationLink(e.target.value)} placeholder="https://maps.google.com/…" />
              </div>
            </div>
          )}

          <button type="submit" className="rr-btn rr-btn-primary" disabled={loading} style={{ alignSelf: 'flex-start' }}>
            {loading ? <span className="rr-spinner" /> : '+ Create Event'}
          </button>
        </form>
      </div>

      {/* Filter + search */}
      <div className="rr-card">
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          {EVENT_FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '5px 14px', borderRadius: 999, border: `1px solid ${filter === f ? 'var(--accent)' : 'var(--border)'}`,
                background: filter === f ? 'var(--accent-bg)' : 'var(--surface2)',
                color: filter === f ? 'var(--accent2)' : 'var(--text2)',
                fontSize: 12, fontWeight: filter === f ? 600 : 400, cursor: 'pointer',
              }}
            >
              {f} {counts[f] > 0 && <span style={{ opacity: 0.7 }}>({counts[f]})</span>}
            </button>
          ))}
        </div>
        <SearchBar value={search} onChange={setSearch} placeholder="Search events or clients…" />
        <div className="rr-card-title" style={{ marginBottom: 10 }}>📋 Events ({filtered.length})</div>
        {fetching ? (
          <div style={{ textAlign: 'center', padding: 24 }}><span className="rr-spinner" style={{ color: 'var(--accent)' }} /></div>
        ) : filtered.length === 0 ? <EmptyState label="No events match" /> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(ev => (
              <div key={ev.id} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 14 }}>{ev.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 3, display: 'flex', flexWrap: 'wrap', gap: '2px 10px' }}>
                      {ev.clientName && <span>👤 {ev.clientName}</span>}
                      {ev.occasionType && <span>🎉 {ev.occasionType}</span>}
                      <span>📅 {fmtDate(ev.date)}</span>
                      {ev.totalAmount ? <span style={{ color: 'var(--green)' }}>💰 {fmt(ev.totalAmount)}</span> : null}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span className={`rr-badge ${STATUS_BADGE[ev.status] || 'rr-badge-purple'}`}>{ev.status}</span>
                    <button className="rr-btn rr-btn-danger rr-btn-sm" onClick={() => handleDelete(ev.id)}>✕</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SECTION: File Upload ────────────────────────────────────────────────────
function UploadSection({ clients, events }: { clients: Client[]; events: AdminEvent[] }) {
  const [clientId, setClientId] = useState('');
  const [eventId, setEventId] = useState('');
  const [fileType, setFileType] = useState<'reel' | 'picture' | 'raw'>('reel');

  const filteredEvents = events.filter(e => !clientId || e.clientId === clientId);

  const handleUpload = useCallback(
    (file: File, onProgress: (p: number) => void) => {
      if (!clientId || !eventId) return Promise.reject(new Error('Select client and event first'));
      return uploadFile(file, clientId, eventId, fileType, onProgress);
    },
    [clientId, eventId, fileType]
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionHeader title="File Upload" icon="📁" />
      <div className="rr-card">
        <div className="rr-card-title">⚙️ Settings</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="rr-field">
            <label>Client</label>
            <select value={clientId} onChange={e => { setClientId(e.target.value); setEventId(''); }}>
              <option value="">Select client…</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="rr-field">
            <label>Event</label>
            <select value={eventId} onChange={e => setEventId(e.target.value)}>
              <option value="">Select event…</option>
              {filteredEvents.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div className="rr-field">
            <label>File Type</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
              {(['reel', 'picture', 'raw'] as const).map(ft => (
                <button key={ft} type="button" onClick={() => setFileType(ft)}
                  style={{ padding: '9px', borderRadius: 'var(--r-md)', border: `1px solid ${fileType === ft ? 'var(--accent)' : 'var(--border)'}`, background: fileType === ft ? 'var(--accent-bg)' : 'var(--surface2)', color: fileType === ft ? 'var(--accent2)' : 'var(--text2)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                  {ft === 'reel' ? '🎬 Reel' : ft === 'picture' ? '🖼️ Pic' : '📦 Raw'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="rr-card">
        <div className="rr-card-title">⬆️ Upload Files</div>
        {(!clientId || !eventId) ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text3)', fontSize: 13 }}>Select a client and event above</div>
        ) : (
          <>
            <div style={{ marginBottom: 12, fontSize: 12, color: 'var(--text2)', padding: '6px 10px', background: 'var(--surface2)', borderRadius: 'var(--r-sm)' }}>
              Uploading to: <strong style={{ color: 'var(--text)' }}>{events.find(e => e.id === eventId)?.name}</strong>
              {' · '}<span style={{ color: 'var(--accent2)', textTransform: 'capitalize', fontWeight: 600 }}>{fileType}</span>
            </div>
            <FileUploader onUpload={handleUpload} label={`Upload ${fileType}s`} />
          </>
        )}
      </div>
    </div>
  );
}

// ─── SECTION: Payments ───────────────────────────────────────────────────────
function PaymentsSection({ events }: { events: AdminEvent[] }) {
  const [eventId, setEventId] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('CASH');
  const [status, setStatus] = useState('PAID');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'error' | 'success' } | null>(null);
  const [history, setHistory] = useState<PaymentRecord[]>([]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!eventId) return setMsg({ text: 'Select an event', type: 'error' });
    setLoading(true); setMsg(null);
    try {
      const p = await addPayment({ eventId, amount: Number(amount), method, status });
      setHistory(prev => [p, ...prev]);
      setAmount('');
      setMsg({ text: 'Payment recorded!', type: 'success' });
    } catch (err: any) { setMsg({ text: err.message, type: 'error' }); }
    finally { setLoading(false); }
  }

  const totalPaid = history.filter(p => p.status === 'PAID').reduce((s, p) => s + p.amount, 0);
  const selectedEvent = events.find(e => e.id === eventId);
  const totalAmount = selectedEvent?.totalAmount || 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionHeader title="Payment Management" icon="💰" />
      {totalAmount > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {[
            { label: 'Total', value: fmt(totalAmount), color: 'var(--text)' },
            { label: 'Paid', value: fmt(totalPaid), color: 'var(--green)' },
            { label: 'Due', value: fmt(totalAmount - totalPaid), color: 'var(--amber)' },
          ].map(s => (
            <div key={s.label} className="rr-card" style={{ textAlign: 'center', padding: 16 }}>
              <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: s.color, marginTop: 4, fontFamily: 'var(--font-display)' }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}
      <div className="rr-card">
        <div className="rr-card-title">➕ Add Payment</div>
        {msg && <Alert msg={msg.text} type={msg.type} />}
        <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="rr-field">
            <label>Event</label>
            <select value={eventId} onChange={e => setEventId(e.target.value)} required>
              <option value="">Select event…</option>
              {events.map(e => <option key={e.id} value={e.id}>{e.name}{e.clientName ? ` — ${e.clientName}` : ''}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="rr-field"><label>Amount (₹)</label><input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="25000" required /></div>
            <div className="rr-field">
              <label>Method</label>
              <select value={method} onChange={e => setMethod(e.target.value)}>
                {['CASH', 'UPI', 'BANK_TRANSFER', 'CARD', 'CHEQUE'].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div className="rr-field">
            <label>Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)}>
              <option value="PAID">Paid</option>
              <option value="PENDING">Pending</option>
            </select>
          </div>
          <button type="submit" className="rr-btn rr-btn-primary" disabled={loading} style={{ alignSelf: 'flex-start' }}>
            {loading ? <span className="rr-spinner" /> : '+ Record Payment'}
          </button>
        </form>
      </div>
      {history.length > 0 && (
        <div className="rr-card">
          <div className="rr-card-title">📋 Session History</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {history.map(p => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--surface2)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 15 }}>{fmt(p.amount)}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>{p.method} · {new Date(p.createdAt).toLocaleDateString()}</div>
                </div>
                <span className={`rr-badge ${p.status === 'PAID' ? 'rr-badge-green' : 'rr-badge-amber'}`}>{p.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SECTION: Assign Creator ─────────────────────────────────────────────────
function AssignSection({ events }: { events: AdminEvent[] }) {
  const [creatorId, setCreatorId] = useState('');
  const [eventId, setEventId] = useState('');
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [msg, setMsg] = useState<{ text: string; type: 'error' | 'success' } | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    getCreators()
      .then(setCreators)
      .catch(e => setMsg({ text: e.message, type: 'error' }))
      .finally(() => setFetching(false));
  }, []);

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!creatorId || !eventId) return setMsg({ text: 'Select both a creator and an event', type: 'error' });
    setLoading(true); setMsg(null);
    try {
      await assignCreator(creatorId, eventId);
      const creator = creators.find(c => c.id === creatorId);
      const event = events.find(ev => ev.id === eventId);
      setMsg({ text: `✓ ${creator?.name} assigned to "${event?.name}"! Client dashboard will now show their details.`, type: 'success' });
      setCreatorId(''); setEventId('');
    } catch (err: any) { setMsg({ text: err.message, type: 'error' }); }
    finally { setLoading(false); }
  }

  const filteredCreators = creators.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionHeader title="Assign Creator to Event" icon="🔗" />

      <div className="rr-card">
        <div className="rr-card-title">👨‍💻 Assignment</div>
        {msg && <Alert msg={msg.text} type={msg.type} />}

        <div style={{ marginBottom: 12, padding: '10px 14px', background: 'var(--accent-bg)', border: '1px solid rgba(108,99,255,0.2)', borderRadius: 'var(--r-md)', fontSize: 12, color: 'var(--accent2)' }}>
          💡 Assigning a creator will update the client dashboard to show their name and phone as the ROG Buddy.
        </div>

        <form onSubmit={handleAssign} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="rr-field">
            <label>Select Creator</label>
            {fetching ? (
              <div style={{ padding: 10, color: 'var(--text3)', fontSize: 13 }}>Loading creators…</div>
            ) : (
              <>
                <SearchBar value={search} onChange={setSearch} placeholder="Search creators…" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
                  {filteredCreators.length === 0 ? (
                    <div style={{ fontSize: 12, color: 'var(--text3)', padding: '8px 0' }}>No creators found</div>
                  ) : filteredCreators.map(c => (
                    <button
                      key={c.id} type="button"
                      onClick={() => setCreatorId(c.id)}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '10px 14px', borderRadius: 'var(--r-md)',
                        border: `1px solid ${creatorId === c.id ? 'var(--accent)' : 'var(--border)'}`,
                        background: creatorId === c.id ? 'var(--accent-bg)' : 'var(--surface2)',
                        cursor: 'pointer', textAlign: 'left',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{c.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>{c.email}</div>
                      </div>
                      {creatorId === c.id && <span style={{ color: 'var(--accent)', fontSize: 16 }}>✓</span>}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="rr-field">
            <label>Select Event</label>
            <select value={eventId} onChange={e => setEventId(e.target.value)} required>
              <option value="">Select event…</option>
              {events.map(e => (
                <option key={e.id} value={e.id}>
                  {e.name}{e.clientName ? ` — ${e.clientName}` : ''}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="rr-btn rr-btn-primary"
            disabled={loading || fetching || !creatorId || !eventId}
            style={{ alignSelf: 'flex-start' }}
          >
            {loading ? <span className="rr-spinner" /> : '✓ Assign Creator'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── SECTION: Creators ───────────────────────────────────────────────────────
function CreatorsSection() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [msg, setMsg] = useState<{ text: string; type: 'error' | 'success' } | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    getCreators()
      .then(setCreators)
      .catch(e => setMsg({ text: e.message, type: 'error' }))
      .finally(() => setFetching(false));
  }, []);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setMsg(null);
    try {
      const c = await registerCreator(name, email, password);
      setCreators(prev => [c, ...prev]);
      setName(''); setEmail(''); setPassword('');
      setMsg({ text: `Creator "${c.name}" registered!`, type: 'success' });
    } catch (err: any) { setMsg({ text: err.message, type: 'error' }); }
    finally { setLoading(false); }
  }

  const filtered = creators.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionHeader title="Creators" icon="🎬" />
      <div className="rr-card">
        <div className="rr-card-title">➕ Register New Creator</div>
        {msg && <Alert msg={msg.text} type={msg.type} />}
        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="rr-field"><label>Name</label><input value={name} onChange={e => setName(e.target.value)} placeholder="Ravi Kumar" required /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="rr-field"><label>Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="ravi@studio.com" required /></div>
            <div className="rr-field"><label>Password</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 6 chars" required /></div>
          </div>
          <button type="submit" className="rr-btn rr-btn-primary" disabled={loading} style={{ alignSelf: 'flex-start' }}>
            {loading ? <span className="rr-spinner" /> : '+ Register Creator'}
          </button>
        </form>
      </div>
      <div className="rr-card">
        <div className="rr-card-title">📋 All Creators ({creators.length})</div>
        <SearchBar value={search} onChange={setSearch} placeholder="Search creators…" />
        {fetching ? (
          <div style={{ textAlign: 'center', padding: 24 }}><span className="rr-spinner" style={{ color: 'var(--accent)' }} /></div>
        ) : filtered.length === 0 ? <EmptyState label={search ? 'No creators match' : 'No creators yet'} /> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(c => (
              <div key={c.id} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text)' }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{c.email}</div>
                </div>
                <span className="rr-badge rr-badge-green">Creator</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MAIN DASHBOARD ──────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const navigate = useNavigate();
  const user = getUser();
  const [activeSection, setActiveSection] = useState('clients');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const [clients, setClients] = useState<Client[]>([]);
  const [events, setEvents] = useState<AdminEvent[]>([]);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  function handleLogout() { clearAuth(); navigate('/admin/login'); }

  const sidebarWidth = 220;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex' }}>
      {/* Sidebar */}
      <aside style={{
        width: sidebarWidth,
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: 0, bottom: 0,
        transform: (!isMobile || sidebarOpen) ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.25s',
        zIndex: 100,
      }}>
        <div style={{ padding: '20px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--accent-bg)', border: '1px solid rgba(108,99,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🎬</div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14, color: 'var(--text)' }}>RecapReels</div>
              <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Admin</div>
            </div>
          </div>
        </div>
        <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV.map(n => (
            <button key={n.id}
              onClick={() => { setActiveSection(n.id); setSidebarOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 'var(--r-md)',
                border: 'none', width: '100%', textAlign: 'left',
                background: activeSection === n.id ? 'var(--accent-bg)' : 'transparent',
                color: activeSection === n.id ? 'var(--accent2)' : 'var(--text2)',
                fontWeight: activeSection === n.id ? 600 : 400,
                fontSize: 13, cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: 16 }}>{n.icon}</span>{n.label}
            </button>
          ))}
        </nav>
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8 }}>{user?.name || user?.email}</div>
          <button className="rr-btn rr-btn-ghost rr-btn-sm" onClick={handleLogout} style={{ width: '100%' }}>Sign Out</button>
        </div>
      </aside>

      {sidebarOpen && isMobile && (
        <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 99 }} />
      )}

      <main style={{ flex: 1, marginLeft: isMobile ? 0 : sidebarWidth, minHeight: '100vh' }}>
        <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0 20px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {isMobile && (
            <button className="rr-btn rr-btn-ghost rr-btn-sm" onClick={() => setSidebarOpen(true)}>☰</button>
          )}
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>
            {NAV.find(n => n.id === activeSection)?.icon} {NAV.find(n => n.id === activeSection)?.label}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>
            {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
        </div>
        <div className="rr-fadein" style={{ padding: '24px 20px', maxWidth: 760, margin: '0 auto' }}>
          {activeSection === 'clients'  && <ClientsSection clients={clients} setClients={setClients} />}
          {activeSection === 'events'   && <EventsSection events={events} setEvents={setEvents} clients={clients} />}
          {activeSection === 'upload'   && <UploadSection clients={clients} events={events} />}
          {activeSection === 'payments' && <PaymentsSection events={events} />}
          {activeSection === 'assign'   && <AssignSection events={events} />}
          {activeSection === 'creators' && <CreatorsSection />}
        </div>
      </main>
    </div>
  );
}