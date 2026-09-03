import { Routes, Route } from 'react-router-dom';
import AppShell from '../components/AppShell';
import AttendeeWelcome from './attendee/Welcome';
import MySessions from './attendee/MySessions';
import Directory from './attendee/Directory';
import AgendaView from '../components/AgendaView';
import AnnouncementsView from '../components/AnnouncementsView';
import ResourcesView from '../components/ResourcesView';

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
        <Route path="/sessions" element={<MySessions />} />
        <Route path="/directory" element={<Directory />} />
        <Route path="/announcements" element={<AnnouncementsView />} />
        <Route path="/resources" element={<ResourcesView />} />
        <Route path="*" element={<AttendeeWelcome />} />
      </Routes>
    </AppShell>
  );
}
