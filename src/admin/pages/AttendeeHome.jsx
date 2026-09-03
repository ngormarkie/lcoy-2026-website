import { Routes, Route } from 'react-router-dom';
import AppShell from '../components/AppShell';
import AttendeeWelcome from './attendee/Welcome';
import AgendaView from '../components/AgendaView';
import AnnouncementsView from '../components/AnnouncementsView';
import ResourcesView from '../components/ResourcesView';
import Placeholder from '../components/Placeholder';

export default function AttendeeHome() {
  const navItems = [
    { to: '/admin', label: 'My badge', icon: '◆' },
    { to: '/admin/agenda', label: 'Agenda', icon: '◎' },
    { to: '/admin/sessions', label: 'My sessions', icon: '◇' },
    { to: '/admin/directory', label: 'Attendees', icon: '◉' },
    { to: '/admin/announcements', label: 'Announcements', icon: '◐' },
    { to: '/admin/resources', label: 'Resources', icon: '◍' },
  ];

  return (
    <AppShell navItems={navItems}>
      <Routes>
        <Route path="/" element={<AttendeeWelcome />} />
        <Route path="/agenda" element={<AgendaView />} />
        <Route path="/sessions" element={<Placeholder title="My Sessions" note="Coming soon: your personalised schedule." />} />
        <Route path="/directory" element={<Placeholder title="Attendee Directory" note="Coming soon: search and connect with other delegates." />} />
        <Route path="/announcements" element={<AnnouncementsView />} />
        <Route path="/resources" element={<ResourcesView />} />
        <Route path="*" element={<AttendeeWelcome />} />
      </Routes>
    </AppShell>
  );
}
