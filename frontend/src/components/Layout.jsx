import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../AuthContext';

// The header and page frame shown on every signed-in page
export default function Layout() {
  const { user, logout } = useAuth();
  return (
    <>
      <header className="app-header">
        <Link to="/">Inquiry Manager</Link>
        <div className="who">
          <span>{user.name} ({user.role})</span>
          <button className="secondary" onClick={logout}>Sign out</button>
        </div>
      </header>
      <div className="page">
        <Outlet />
      </div>
    </>
  );
}