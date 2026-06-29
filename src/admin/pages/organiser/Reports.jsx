import { useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';

function toCSV(headers, rows) {
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [headers.map(escape).join(',')];
  rows.forEach(r => lines.push(r.map(escape).join(',')));
  return lines.join('\n');
}

function download(filename, csv) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export default function Reports() {
  const [busy, setBusy] = useState('');

  const exportRegistrations = async () => {
    setBusy('reg');
    try {
      const snap = await getDocs(collection(db, 'users'));
      const headers = ['Name', 'Email', 'Phone', 'Organisation', 'Category', 'Role', 'Badge Code', 'Region', 'District', 'City', 'Working Group', 'Access Level', 'Registered At'];
      const rows = [];
      snap.forEach(d => {
        const u = d.data();
        const regAt = u.registeredAt?.toDate ? u.registeredAt.toDate().toISOString() : '';
        rows.push([u.name, u.email, u.phone, u.org, u.category, u.role, u.code, u.region, u.district, u.city, u.workingGroup, u.accessLevel, regAt]);
      });
      download('lcoy2026_registrations.csv', toCSV(headers, rows));
    } catch (e) { console.error(e); alert('Export failed.'); }
    setBusy('');
  };

  const exportEntries = async () => {
    setBusy('entries');
    try {
      const snap = await getDocs(collection(db, 'users'));
      const headers = ['Name', 'Badge Code', 'Category', 'Entry Time'];
      const rows = [];
      snap.forEach(d => {
        const u = d.data();
        (u.entries || []).forEach(e => {
          const t = e.timestamp || '';
          rows.push([u.name, u.code, u.category, t]);
        });
      });
      download('lcoy2026_entries.csv', toCSV(headers, rows));
    } catch (e) { console.error(e); alert('Export failed.'); }
    setBusy('');
  };

  const exportMeals = async () => {
    setBusy('meals');
    try {
      const snap = await getDocs(collection(db, 'users'));
      const headers = ['Name', 'Badge Code', 'Category', 'Day 1 Breakfast', 'Day 1 Lunch', 'Day 2 Breakfast', 'Day 2 Lunch'];
      const rows = [];
      snap.forEach(d => {
        const u = d.data();
        const m = u.meals || {};
        rows.push([u.name, u.code, u.category, m.day1_breakfast || '', m.day1_lunch || '', m.day2_breakfast || '', m.day2_lunch || '']);
      });
      download('lcoy2026_meals.csv', toCSV(headers, rows));
    } catch (e) { console.error(e); alert('Export failed.'); }
    setBusy('');
  };

  const exportSessions = async () => {
    setBusy('sessions');
    try {
      const snap = await getDocs(collection(db, 'sessions'));
      const headers = ['Title', 'Day', 'Time', 'Type', 'Room', 'Capacity', 'Speakers', 'Description'];
      const rows = [];
      snap.forEach(d => {
        const s = d.data();
        rows.push([s.title, s.day, s.time, s.type, s.room, s.capacity, s.speakers, s.description]);
      });
      download('lcoy2026_sessions.csv', toCSV(headers, rows));
    } catch (e) { console.error(e); alert('Export failed.'); }
    setBusy('');
  };

  const reports = [
    { id: 'reg', label: 'All registrations', desc: 'Name, email, phone, organisation, category, role, badge code, location, working group.', fn: exportRegistrations },
    { id: 'entries', label: 'Entry log', desc: 'Every verified entry with timestamp.', fn: exportEntries },
    { id: 'meals', label: 'Meal collection', desc: 'Per-person meal collection status for all 4 meals.', fn: exportMeals },
    { id: 'sessions', label: 'Sessions / agenda', desc: 'Full programme export with details.', fn: exportSessions },
  ];

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <header className="page-header"><div><span className="dashboard-eyebrow">Data</span><h1>Reports</h1><p className="text-muted" style={{ marginTop: '0.25rem' }}>Export conference data as CSV files.</p></div></header>
      <div style={{ display: 'grid', gap: '0.75rem' }}>
        {reports.map(r => (
          <div key={r.id} className="card-elevated" style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
            <div>
              <div style={{ fontWeight: 700 }}>{r.label}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--ink-soft)', marginTop: '0.15rem' }}>{r.desc}</div>
            </div>
            <button className="btn btn-secondary" onClick={r.fn} disabled={!!busy} style={{ flexShrink: 0 }}>
              {busy === r.id ? 'Exporting…' : 'Export CSV'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
