import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import App from './App.jsx'
import './styles.css'

import { AuthProvider } from './admin/contexts/AuthContext'
import AdminApp from './admin/AdminApp'
import LiveBoard from './admin/pages/LiveBoard'

// Friendlier entry point for delegates than /admin — redirects straight
// into the real app routes, preserving any query string (email/code on
// the auto-login link).
function RedirectKeepingQuery({ to }) {
  const location = useLocation()
  return <Navigate to={to + location.search} replace />
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/admin/*" element={
          <AuthProvider>
            <AdminApp />
          </AuthProvider>
        } />
        <Route path="/delegate/auto-login" element={<RedirectKeepingQuery to="/admin/auto-login" />} />
        <Route path="/delegate/*" element={<RedirectKeepingQuery to="/admin" />} />
        <Route path="/live" element={<LiveBoard />} />
        <Route path="*" element={<App />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)

setTimeout(() => {
  const splash = document.getElementById('splash')
  if (splash) {
    splash.style.opacity = '0'
    setTimeout(() => splash.remove(), 600)
  }
}, 1200)
