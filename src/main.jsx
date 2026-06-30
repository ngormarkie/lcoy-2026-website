import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App.jsx'
import './styles.css'

import { AuthProvider } from './admin/contexts/AuthContext'
import AdminApp from './admin/AdminApp'
import LiveBoard from './admin/pages/LiveBoard'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/admin/*" element={
          <AuthProvider>
            <AdminApp />
          </AuthProvider>
        } />
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
