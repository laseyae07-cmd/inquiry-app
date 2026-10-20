import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import LoginPage from './pages/LoginPage';
import InquiryListPage from './pages/InquiryListPage';
import CreateInquiryPage from './pages/CreateInquiryPage';
import InquiryDetailPage from './pages/InquiryDetailPage';
import Layout from './components/Layout';

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
          <Route element={<RequireLogin><Layout /></RequireLogin>}>
            <Route path="/" element={<InquiryListPage />} />
            <Route path="/inquiries/new" element={<CreateInquiryPage />} />
            <Route path="/inquiries/:id" element={<InquiryDetailPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}