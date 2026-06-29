import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import OrganiserHome from './pages/OrganiserHome';
import CheckinHome from './pages/CheckinHome';
import FirstRunSetup from './pages/FirstRunSetup';
import ChangePasswordPage from './pages/ChangePasswordPage';
import { useEffect, useState } from 'react';
import { collection, getDocs, limit, query } from 'firebase/firestore';
import { db } from './services/firebase';
import './styles/global.css';

function FullLoader() {
  return <div className="full-loader"><div className="loader" /></div>;
}

export default function AdminApp() {
  const { user, profile, loading, isOrganiser, isCheckin } = useAuth();
  const [hasUsers, setHasUsers] = useState(null);

  useEffect(() => {
    if (loading || user) { setHasUsers(true); return; }
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, 'users'), limit(1)));
        if (!cancelled) setHasUsers(!snap.empty);
      } catch (e) {
        console.error('First-run check error:', e);
        if (!cancelled) setHasUsers(true);
      }
    })();
    return () => { cancelled = true; };
  }, [loading, user]);

  if (loading || hasUsers === null) return <FullLoader />;

  if (!user || !profile) {
    if (!hasUsers) {
      return (
        <Routes>
          <Route path="setup" element={<FirstRunSetup />} />
          <Route path="*" element={<Navigate to="/admin/setup" replace />} />
        </Routes>
      );
    }
    return (
      <Routes>
        <Route path="login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/admin/login" replace />} />
      </Routes>
    );
  }

  if (isOrganiser) {
    return (
      <Routes>
        <Route path="change-password" element={<ChangePasswordPage />} />
        <Route path="*" element={<OrganiserHome />} />
      </Routes>
    );
  }

  if (isCheckin) {
    return (
      <Routes>
        <Route path="change-password" element={<ChangePasswordPage />} />
        <Route path="*" element={<CheckinHome />} />
      </Routes>
    );
  }

  return (
    <div className="container" style={{ paddingTop: '4rem' }}>
      <div className="card-elevated">
        <h2>Access denied</h2>
        <p className="text-muted mt-2">This portal is for organisers only. If you believe this is an error, contact the head organiser.</p>
      </div>
    </div>
  );
}
