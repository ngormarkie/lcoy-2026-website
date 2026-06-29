import { Routes, Route } from 'react-router-dom';
import AppShell from '../components/AppShell';
import { useAuth } from '../contexts/AuthContext';
import OrganiserDashboard from './organiser/Dashboard';
import OrganiserUsersList from './organiser/UsersList';
import OrganiserCreateUser from './organiser/CreateUser';
import OrganiserUserDetail from './organiser/UserDetail';
import VerifyEntry from './organiser/VerifyEntry';
import MealCheckin from './organiser/MealCheckin';
import SupplyCheckin from './organiser/SupplyCheckin';
import Sessions from './organiser/Sessions';
import Announcements from './organiser/Announcements';
import Resources from './organiser/Resources';
import Reports from './organiser/Reports';
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
    { to: '/admin/supplies', label: 'Supplies', icon: '◇' },
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
        <Route path="/verify" element={<VerifyEntry />} />
        <Route path="/meals" element={<MealCheckin />} />
        <Route path="/supplies" element={<SupplyCheckin />} />
        <Route path="/sessions" element={<Sessions />} />
        <Route path="/announcements" element={<Announcements />} />
        <Route path="/resources" element={<Resources />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="*" element={<OrganiserDashboard />} />
      </Routes>
    </AppShell>
  );
}
