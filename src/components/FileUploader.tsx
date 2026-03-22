import React, { useCallback, useState } from 'react';

export interface UploadTask {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
  result?: { id: string; name: string; url: string; size: number; createdAt: string };
}

interface FileUploaderProps {
  accept?: string;
  onUpload: (
    file: File,
    onProgress: (pct: number) => void
  ) => Promise<{ id: string; name: string; url: string; size: number; createdAt: string }>;
  label?: string;
  hint?: string;
}

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

export default function FileUploader({ accept, onUpload, label = 'Upload Files', hint }: FileUploaderProps) {
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const [dragging, setDragging] = useState(false);

  const processFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files);
    arr.forEach((file) => {
      const id = Math.random().toString(36).slice(2);
      setTasks((prev) => [...prev, { file, progress: 0, status: 'uploading' }]);

      onUpload(
        file,
        (pct) => setTasks((prev) =>
          prev.map((t) => (t.file === file ? { ...t, progress: pct } : t))
        )
      )
        .then((result) =>
          setTasks((prev) =>
            prev.map((t) => (t.file === file ? { ...t, status: 'done', progress: 100, result } : t))
          )
        )
        .catch((err) =>
          setTasks((prev) =>
            prev.map((t) => (t.file === file ? { ...t, status: 'error', error: err.message } : t))
          )
        );
    });
  }, [onUpload]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    processFiles(e.dataTransfer.files);
  }, [processFiles]);

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(e.target.files);
    e.target.value = '';
  };

  const clearDone = () => setTasks((prev) => prev.filter((t) => t.status !== 'done'));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Drop zone */}
      <label
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: '28px 20px',
          borderRadius: 'var(--r-lg)',
          border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border2)'}`,
          background: dragging ? 'var(--accent-bg)' : 'var(--surface2)',
          cursor: 'pointer',
          transition: 'all 0.2s',
          textAlign: 'center',
        }}
      >
        <input type="file" accept={accept} multiple onChange={onFileInput} style={{ display: 'none' }} />
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
          <path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/>
        </svg>
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13 }}>{label}</div>
          <div style={{ color: 'var(--text3)', fontSize: 12, marginTop: 2 }}>
            {hint || 'Drag & drop or click to browse'}
          </div>
        </div>
      </label>

      {/* Task list */}
      {tasks.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {tasks.filter(t => t.status === 'done').length}/{tasks.length} uploaded
            </span>
            {tasks.some(t => t.status === 'done') && (
              <button className="rr-btn rr-btn-ghost rr-btn-sm" onClick={clearDone}>Clear done</button>
            )}
          </div>
          {tasks.map((t, i) => (
            <div key={i} style={{
              background: 'var(--surface2)',
              border: `1px solid ${t.status === 'error' ? 'rgba(239,68,68,0.3)' : t.status === 'done' ? 'rgba(34,197,94,0.2)' : 'var(--border)'}`,
              borderRadius: 'var(--r-md)',
              padding: '10px 14px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: t.status === 'uploading' ? 8 : 0 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{t.file.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>{formatBytes(t.file.size)}</div>
                </div>
                <div>
                  {t.status === 'uploading' && <span className="rr-spinner" style={{ color: 'var(--accent)' }} />}
                  {t.status === 'done' && <span style={{ color: 'var(--green)', fontSize: 18 }}>✓</span>}
                  {t.status === 'error' && <span style={{ color: 'var(--red)', fontSize: 18 }}>✗</span>}
                </div>
              </div>
              {t.status === 'uploading' && (
                <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${t.progress}%`, background: 'var(--accent)', borderRadius: 2, transition: 'width 0.2s' }} />
                </div>
              )}
              {t.status === 'error' && <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 4 }}>{t.error}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
