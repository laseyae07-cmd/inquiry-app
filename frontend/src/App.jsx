import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import LoginPage from './pages/LoginPage';

// Temporary home page, we replace it in the next step
function HomePage() {
  const { user, logout } = useAuth();
  return (
    <main className="auth-page">
      <div className="card">
        <h1>Welcome, {user.name}</h1>
        <p className="muted">Role: {user.role}</p>
        <button onClick={logout}>Sign out</button>
      </div>
    </main>
  );
}

// Sends signed-out visitors to the login page
function RequireLogin({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="center-msg">Loading…</p>;
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<RequireLogin><HomePage /></RequireLogin>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}