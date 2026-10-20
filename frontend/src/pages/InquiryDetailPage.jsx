import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import StatusBadge from '../components/StatusBadge';

export default function InquiryDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);      // { inquiry, events, allowed_transitions }
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null); // { status, message }
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setData(await api.getInquiry(id));
    } catch (err) {
      setLoadError({ status: err.status, message: err.message });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function changeStatus(newStatus) {
    setSaving(true);
    setActionError('');
    setNotice('');
    try {
      await api.changeStatus(id, newStatus, data.inquiry.version);
      // Reload so the status, version, buttons and history all match the server
      setData(await api.getInquiry(id));
    } catch (err) {
      if (err.code === 'STALE_VERSION') {
        // Someone else changed it: show the latest copy and explain
        try { setData(await api.getInquiry(id)); } catch { /* keep the old copy */ }
        setNotice('This inquiry was changed in another tab or by someone else. We have loaded the latest version. Please check it and try again if you still want to make this change.');
      } else {
        setActionError(err.message);
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading && !data) {
    return <div aria-label="Loading inquiry"><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /></div>;
  }

  if (loadError) {
    const notFound = loadError.status === 404 || loadError.status === 400;
    return (
      <div className="empty">
        <p>{notFound ? 'This inquiry does not exist, or you do not have access to it.' : loadError.message}</p>
        {notFound
          ? <Link to="/"><button>Back to inquiries</button></Link>
          : <button onClick={load}>Try again</button>}
      </div>
    );
  }

  const { inquiry, events, allowed_transitions } = data;

  return (
    <div className="card wide">
      <p><Link to="/">← Back to inquiries</Link></p>
      <h1>{inquiry.subject}</h1>
      <StatusBadge status={inquiry.status} />

      <dl className="detail-grid">
        <dt>Customer</dt><dd>{inquiry.customer_name}</dd>
        <dt>Contact</dt><dd>{inquiry.contact}</dd>
        <dt>Description</dt><dd>{inquiry.description}</dd>
        <dt>Recorded by</dt><dd>{inquiry.created_by_name} on {new Date(inquiry.created_at).toLocaleString()}</dd>
      </dl>

      {notice && <p className="notice" role="status">{notice}</p>}
      {actionError && <p className="error" role="alert">{actionError}</p>}

      <h2>Change status</h2>
      <div className="actions">
        {allowed_transitions.map(s => (
          <button key={s} disabled={saving} onClick={() => changeStatus(s)}>
            {saving ? 'Saving…' : `Mark as ${s}`}
          </button>
        ))}
      </div>

      <h2>History</h2>
      <ul className="timeline">
        {events.map(e => (
          <li key={e.id}>
            {e.from_status ? `${e.from_status} → ${e.to_status}` : `Created as ${e.to_status}`}
            {' '}by {e.user_name}, {new Date(e.created_at).toLocaleString()}
          </li>
        ))}
      </ul>
    </div>
  );
}