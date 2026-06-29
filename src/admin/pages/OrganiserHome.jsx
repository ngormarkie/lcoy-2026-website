import { Routes, Route } from 'react-router-dom';
import AppShell from '../components/AppShell';
import { useAuth } from '../contexts/AuthContext';
import OrganiserDashboard from './organiser/Dashboard';
import OrganiserUsersList from './organiser/UsersList';
import OrganiserCreateUser from './organiser/CreateUser';
import OrganiserUserDetail from './organiser/UserDetail';
import Placeholder from '../components/Placeholder';

export default function OrganiserHome() {
  const { isSuperAdmin, profile } = useAuth();
  const access = profile?.accessLevel || 'full';
  const isFull = isSuperAdmin || access === 'full';
  const canManagePeople = isFull || access === 'attendee_mgmt';
  const canManageProgramme = isFull || access === 'programme_mgmt';
  const canManageComms = isFull || access === 'comms' || access === 'programme_mgmt';

  const navItems = [
    { to: '/admin', label: 'Dashboard', icon: '◆' },
    ...(canManagePeople ? [
      { to: '/admin/users', label: 'People', icon: '◉' },
      { to: '/admin/users/new', label: 'Add person', icon: '＋' },
    ] : []),
    { to: '/admin/verify', label: 'Verify entry', icon: '◐' },
    { to: '/admin/meals', label: 'Meal check-in', icon: '◍' },
    ...(canManageProgramme ? [
      { to: '/admin/sessions', label: 'Sessions', icon: '◎' },
    ] : []),
    ...(canManageComms ? [
      { to: '/admin/announcements', label: 'Announcements', icon: '◈' },
      { to: '/admin/resources', label: 'Resources', icon: '◇' },
    ] : []),
    { to: '/admin/reports', label: 'Reports', icon: '◌' },
  ];

  return (
    <AppShell navItems={navItems}>
      <Routes>
        <Route path="/" element={<OrganiserDashboard />} />
        <Route path="/users" element={<OrganiserUsersList />} />
        <Route path="/users/new" element={<OrganiserCreateUser />} />
        <Route path="/users/:uid" element={<OrganiserUserDetail />} />
        <Route path="/verify" element={<Placeholder title="Verify Entry" note="Coming next: scan QR or type 2-character badge code to verify entry." />} />
        <Route path="/meals" element={<Placeholder title="Meal Check-In" note="Coming next: per-meal scanning with one-time redemption." />} />
        <Route path="/sessions" element={<Placeholder title="Sessions" note="Coming next: create, edit, and manage agenda sessions." />} />
        <Route path="/announcements" element={<Placeholder title="Announcements" note="Coming next: post broadcast announcements." />} />
        <Route path="/resources" element={<Placeholder title="Resources" note="Coming next: upload documents and links." />} />
        <Route path="/reports" element={<Placeholder title="Reports" note="Coming next: CSV exports for all data." />} />
        <Route path="*" element={<OrganiserDashboard />} />
      </Routes>
    </AppShell>
  );
}
