import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import StatusBadge from '../components/StatusBadge';
import useDebounce from '../hooks/useDebounce';

const STATUSES = ['New', 'In Progress', 'Resolved'];

export default function InquiryListPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const debouncedSearch = useDebounce(search);
  const filtering = Boolean(debouncedSearch || status);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.listInquiries({ q: debouncedSearch, status });
      setInquiries(data.inquiries);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, status]);

  useEffect(() => { load(); }, [load]);

  return (
    <>
      <div className="toolbar">
        <input
          type="search"
          placeholder="Search name, contact or subject"
          aria-label="Search inquiries"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select aria-label="Filter by status" value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <Link to="/inquiries/new"><button>+ New inquiry</button></Link>
      </div>

      {loading && (
        <div aria-label="Loading inquiries">
          <div className="skeleton" /><div className="skeleton" /><div className="skeleton" />
        </div>
      )}

      {!loading && error && (
        <div className="error" role="alert">
          {error} <button className="secondary" onClick={load}>Try again</button>
        </div>
      )}

      {!loading && !error && inquiries.length === 0 && (
        <div className="empty">
          {filtering ? (
            <>
              <p>No inquiries match your search.</p>
              <button className="secondary" onClick={() => { setSearch(''); setStatus(''); }}>Clear filters</button>
            </>
          ) : (
            <>
              <p>No inquiries yet.</p>
              <Link to="/inquiries/new"><button>Record your first inquiry</button></Link>
            </>
          )}
        </div>
      )}

      {!loading && !error && inquiries.length > 0 && (
        <table>
          <thead>
            <tr><th>Subject</th><th>Customer</th><th>Status</th><th>Created</th></tr>
          </thead>
          <tbody>
            {inquiries.map(i => (
              <tr key={i.id}>
                <td><Link to={`/inquiries/${i.id}`}>{i.subject}</Link></td>
                <td>{i.customer_name}</td>
                <td><StatusBadge status={i.status} /></td>
                <td>{new Date(i.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}