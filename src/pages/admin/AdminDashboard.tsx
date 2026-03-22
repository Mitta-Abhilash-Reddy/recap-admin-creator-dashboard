import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser, clearAuth, registerCreator } from '../../services/authService';
import {
  createClient, createEvent, deleteEvent,
  addPayment, assignCreator, uploadFile, deleteFile,
  getClients, getCreators, getAdminEvents,
} from '../../services/adminService';
import FileUploader from '../../components/FileUploader';
import '../../styles/design-system.css';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Client { id: string; name: string; phone: string; uniqueLinkId: string }
interface Event  { id: string; name: string; date: string; status: string; occasionType?: string; clientId?: string; totalAmount?: number }
interface Creator { id: string; name: string; email: string }
interface PaymentRecord { id: string; amount: number; method: string; status: string; createdAt: string }
interface FileRecord { id: string; name: string; url: string; size: number; createdAt: string }

function formatBytes(b: number) {
  if (b < 1048576) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

const NAV = [
  { id: 'clients',   icon: '👥', label: 'Clients' },
  { id: 'events',    icon: '📅', label: 'Events' },
  { id: 'upload',    icon: '📁', label: 'File Upload' },
  { id: 'payments',  icon: '💰', label: 'Payments' },
  { id: 'assign',    icon: '🔗', label: 'Assign Creator' },
  { id: 'creators',  icon: '🎬', label: 'Creators' },
];

// ─── Helper components ───────────────────────────────────────────────────────
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
  return (
    <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text3)', fontSize: 13 }}>
      {label}
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

  const host = window.location.hostname === 'localhost'
    ? 'http://localhost:8080'
    : `https://app.${window.location.hostname.split('.').slice(1).join('.')}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionHeader title="Client Management" icon="👥" />

      <div className="rr-card">
        <div className="rr-card-title">➕ New Client</div>
        {msg && <Alert msg={msg.text} type={msg.type} />}
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="rr-field"><label>Name</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="John Doe" required /></div>
          <div className="rr-field"><label>Phone</label><input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+91 98765 43210" required /></div>
          <button type="submit" className="rr-btn rr-btn-primary" disabled={loading} style={{ alignSelf: 'flex-start' }}>
            {loading ? <span className="rr-spinner" /> : '+ Create Client'}
          </button>
        </form>
      </div>

      <div className="rr-card">
        <div className="rr-card-title">📋 All Clients ({clients.length})</div>
        {fetching ? (
          <div style={{ textAlign: 'center', padding: 24 }}><span className="rr-spinner" style={{ color: 'var(--accent)' }} /></div>
        ) : clients.length === 0 ? <EmptyState label="No clients yet" /> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {clients.map(c => (
              <div key={c.id} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text)' }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{c.phone}</div>
                  </div>
                  <span className="rr-badge rr-badge-purple">Active</span>
                </div>
                <div style={{ marginTop: 10, padding: '8px 12px', background: 'var(--bg)', borderRadius: 'var(--r-sm)', fontSize: 11, color: 'var(--text2)', wordBreak: 'break-all', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span>{host}/p/{c.uniqueLinkId}</span>
                  <button className="rr-btn rr-btn-ghost rr-btn-sm" onClick={() => navigator.clipboard.writeText(`${host}/p/${c.uniqueLinkId}`)}>Copy</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SECTION: Events ─────────────────────────────────────────────────────────
function EventsSection({ events, setEvents, clients }: {
  events: (Event & { clientName?: string })[],
  setEvents: React.Dispatch<React.SetStateAction<(Event & { clientName?: string })[]>>,
  clients: Client[],
}) {
  const [clientId, setClientId] = useState('');
  const [name, setName] = useState('');
  const [occasionType, setOccasionType] = useState('');
  const [date, setDate] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [msg, setMsg] = useState<{ text: string; type: 'error' | 'success' } | null>(null);

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
      const ev = await createEvent({ clientId, name, occasionType, date, totalAmount: Number(totalAmount) || 0 });
      const client = clients.find(c => c.id === clientId);
      setEvents(prev => [{ ...ev, clientName: client?.name }, ...prev]);
      setName(''); setDate(''); setOccasionType(''); setTotalAmount('');
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

  const statusColor: Record<string, string> = {
    UPCOMING: 'rr-badge-purple', ONGOING: 'rr-badge-amber',
    COMPLETED: 'rr-badge-green', CANCELLED: 'rr-badge-red',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionHeader title="Event Management" icon="📅" />

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
          <div className="rr-field"><label>Event Name</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="Priya & Rahul Wedding" required /></div>
          <div className="rr-field"><label>Occasion Type</label><input value={occasionType} onChange={e=>setOccasionType(e.target.value)} placeholder="Wedding / Birthday / etc." /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="rr-field"><label>Date</label><input type="date" value={date} onChange={e=>setDate(e.target.value)} required /></div>
            <div className="rr-field"><label>Total Amount (₹)</label><input type="number" value={totalAmount} onChange={e=>setTotalAmount(e.target.value)} placeholder="50000" /></div>
          </div>
          <button type="submit" className="rr-btn rr-btn-primary" disabled={loading} style={{ alignSelf: 'flex-start' }}>
            {loading ? <span className="rr-spinner" /> : '+ Create Event'}
          </button>
        </form>
      </div>

      <div className="rr-card">
        <div className="rr-card-title">📋 All Events ({events.length})</div>
        {fetching ? (
          <div style={{ textAlign: 'center', padding: 24 }}><span className="rr-spinner" style={{ color: 'var(--accent)' }} /></div>
        ) : events.length === 0 ? <EmptyState label="No events yet" /> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {events.map(ev => (
              <div key={ev.id} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text)' }}>{ev.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
                    {ev.clientName && <span>{ev.clientName} · </span>}
                    {ev.occasionType && <span>{ev.occasionType} · </span>}
                    {ev.date}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className={`rr-badge ${statusColor[ev.status] || 'rr-badge-purple'}`}>{ev.status}</span>
                  <button className="rr-btn rr-btn-danger rr-btn-sm" onClick={() => handleDelete(ev.id)}>Delete</button>
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
function UploadSection({ clients, events }: { clients: Client[]; events: (Event & { clientId?: string })[] }) {
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
        <div className="rr-card-title">⚙️ Upload Settings</div>
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
            <select value={fileType} onChange={e => setFileType(e.target.value as 'reel' | 'picture' | 'raw')}>
              <option value="reel">🎬 Reel</option>
              <option value="picture">🖼️ Picture</option>
              <option value="raw">📦 Raw</option>
            </select>
          </div>
        </div>
      </div>

      <div className="rr-card">
        <div className="rr-card-title">⬆️ Upload Files</div>
        {(!clientId || !eventId) ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text3)', fontSize: 13 }}>
            Select a client and event above to enable upload
          </div>
        ) : (
          <FileUploader
            onUpload={handleUpload}
            label={`Upload ${fileType}s`}
            hint={`Uploading to: ${events.find(e=>e.id===eventId)?.name} — ${fileType}`}
          />
        )}
      </div>
    </div>
  );
}

// ─── SECTION: Payments ───────────────────────────────────────────────────────
function PaymentsSection({ events, clients }: { events: (Event & { clientId?: string; totalAmount?: number })[]; clients: Client[] }) {
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
      setMsg({ text: 'Payment added!', type: 'success' });
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
            { label: 'Total', value: `₹${totalAmount.toLocaleString()}`, color: 'var(--text)' },
            { label: 'Paid', value: `₹${totalPaid.toLocaleString()}`, color: 'var(--green)' },
            { label: 'Due', value: `₹${(totalAmount - totalPaid).toLocaleString()}`, color: 'var(--amber)' },
          ].map(stat => (
            <div key={stat.label} className="rr-card" style={{ textAlign: 'center', padding: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{stat.label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: stat.color, marginTop: 4, fontFamily: 'var(--font-display)' }}>{stat.value}</div>
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
              {events.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="rr-field"><label>Amount (₹)</label><input type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="25000" required /></div>
            <div className="rr-field">
              <label>Method</label>
              <select value={method} onChange={e=>setMethod(e.target.value)}>
                {['CASH','UPI','BANK_TRANSFER','CARD','CHEQUE'].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div className="rr-field">
            <label>Status</label>
            <select value={status} onChange={e=>setStatus(e.target.value)}>
              <option value="PAID">Paid</option>
              <option value="PENDING">Pending</option>
            </select>
          </div>
          <button type="submit" className="rr-btn rr-btn-primary" disabled={loading} style={{ alignSelf: 'flex-start' }}>
            {loading ? <span className="rr-spinner" /> : '+ Add Payment'}
          </button>
        </form>
      </div>

      {history.length > 0 && (
        <div className="rr-card">
          <div className="rr-card-title">📋 Recent Payments</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {history.map(p => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--surface2)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 15 }}>₹{p.amount.toLocaleString()}</div>
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
function AssignSection({ events }: { events: Event[] }) {
  const [creatorId, setCreatorId] = useState('');
  const [eventId, setEventId] = useState('');
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [msg, setMsg] = useState<{ text: string; type: 'error' | 'success' } | null>(null);

  useEffect(() => {
    getCreators()
      .then(setCreators)
      .catch(e => setMsg({ text: e.message, type: 'error' }))
      .finally(() => setFetching(false));
  }, []);

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setMsg(null);
    try {
      await assignCreator(creatorId, eventId);
      setMsg({ text: 'Creator assigned!', type: 'success' });
      setCreatorId(''); setEventId('');
    } catch (err: any) { setMsg({ text: err.message, type: 'error' }); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionHeader title="Assign Creator" icon="🔗" />
      <div className="rr-card">
        <div className="rr-card-title">👨‍💻 Creator Assignment</div>
        {msg && <Alert msg={msg.text} type={msg.type} />}
        <form onSubmit={handleAssign} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="rr-field">
            <label>Creator</label>
            {fetching ? (
              <div style={{ padding: 10, color: 'var(--text3)', fontSize: 13 }}>Loading creators…</div>
            ) : (
              <select value={creatorId} onChange={e => setCreatorId(e.target.value)} required>
                <option value="">Select creator…</option>
                {creators.map(c => (
                  <option key={c.id} value={c.id}>{c.name} — {c.email}</option>
                ))}
              </select>
            )}
            {!fetching && creators.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--amber)', marginTop: 4 }}>
                No creators registered yet. Go to Creators tab to add one.
              </div>
            )}
          </div>
          <div className="rr-field">
            <label>Event</label>
            <select value={eventId} onChange={e => setEventId(e.target.value)} required>
              <option value="">Select event…</option>
              {events.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <button type="submit" className="rr-btn rr-btn-primary" disabled={loading || fetching} style={{ alignSelf: 'flex-start' }}>
            {loading ? <span className="rr-spinner" /> : '✓ Assign Creator'}
          </button>
        </form>
      </div>
    </div>
  );
}

function CreatorsSection() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [msg, setMsg] = useState<{ text: string; type: 'error' | 'success' } | null>(null);

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionHeader title="Creators" icon="🎬" />

      <div className="rr-card">
        <div className="rr-card-title">➕ Register New Creator</div>
        {msg && <Alert msg={msg.text} type={msg.type} />}
        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="rr-field"><label>Name</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="Ravi Kumar" required /></div>
          <div className="rr-field"><label>Email</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="ravi@studio.com" required /></div>
          <div className="rr-field"><label>Password</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Min 6 characters" required /></div>
          <button type="submit" className="rr-btn rr-btn-primary" disabled={loading} style={{ alignSelf: 'flex-start' }}>
            {loading ? <span className="rr-spinner" /> : '+ Register Creator'}
          </button>
        </form>
      </div>

      <div className="rr-card">
        <div className="rr-card-title">📋 All Creators ({creators.length})</div>
        {fetching ? (
          <div style={{ textAlign: 'center', padding: 24 }}><span className="rr-spinner" style={{ color: 'var(--accent)' }} /></div>
        ) : creators.length === 0 ? <EmptyState label="No creators registered yet" /> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {creators.map(c => (
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

  // Shared state (demo: starts empty, real app would fetch from backend)
  const [clients, setClients] = useState<Client[]>([]);
  const [events, setEvents] = useState<(Event & { clientName?: string; clientId?: string })[]>([]);

  function handleLogout() {
    clearAuth();
    navigate('/admin/login');
  }

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
        transform: sidebarOpen || window.innerWidth >= 768 ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.25s',
        zIndex: 100,
      }}>
        {/* Brand */}
        <div style={{ padding: '20px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--accent-bg)', border: '1px solid rgba(108,99,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🎬</div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14, color: 'var(--text)' }}>RecapReels</div>
              <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Admin</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV.map(n => (
            <button
              key={n.id}
              onClick={() => { setActiveSection(n.id); setSidebarOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 'var(--r-md)',
                border: 'none', width: '100%', textAlign: 'left',
                background: activeSection === n.id ? 'var(--accent-bg)' : 'transparent',
                color: activeSection === n.id ? 'var(--accent2)' : 'var(--text2)',
                fontWeight: activeSection === n.id ? 600 : 400,
                fontSize: 13, cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: 16 }}>{n.icon}</span>
              {n.label}
            </button>
          ))}
        </nav>

        {/* User */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8 }}>{user?.name || user?.email}</div>
          <button className="rr-btn rr-btn-ghost rr-btn-sm" onClick={handleLogout} style={{ width: '100%' }}>Sign Out</button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 99 }} />
      )}

      {/* Main content */}
      <main style={{ flex: 1, marginLeft: window.innerWidth >= 768 ? sidebarWidth : 0, minHeight: '100vh' }}>

        {/* Topbar */}
        <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0 20px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button className="rr-btn rr-btn-ghost rr-btn-sm" onClick={() => setSidebarOpen(true)} style={{ display: window.innerWidth >= 768 ? 'none' : 'flex' }}>
            ☰ Menu
          </button>
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
          {activeSection === 'payments' && <PaymentsSection events={events} clients={clients} />}
          {activeSection === 'assign'   && <AssignSection events={events} />}
          {activeSection === 'creators' && <CreatorsSection />}
        </div>
      </main>
    </div>
  );
}
