import { useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

function downloadPDF(title, headers, rows, filename) {
  const doc = new jsPDF({ orientation: rows[0]?.length > 6 ? 'landscape' : 'portrait' });
  doc.setFontSize(16);
  doc.text(title, 14, 20);
  doc.setFontSize(9);
  doc.text(`LCOY Sierra Leone 2026 — Generated ${new Date().toLocaleDateString()}`, 14, 28);
  autoTable(doc, { head: [headers], body: rows, startY: 34, styles: { fontSize: 8 }, headStyles: { fillColor: [11, 34, 51] } });
  doc.save(filename);
}

export default function Reports() {
  const [busy, setBusy] = useState('');

  const exportRegistrations = async (fmt) => {
    const snap = await getDocs(collection(db, 'users'));
    const headers = ['Name', 'Email', 'Phone', 'Organisation', 'Category', 'Role', 'Badge Code', 'Region', 'District', 'City'];
    const rows = [];
    snap.forEach(d => { const u = d.data(); rows.push([u.name, u.email, u.phone, u.org, u.category, u.role, u.code, u.region, u.district, u.city]); });
    if (fmt === 'pdf') downloadPDF('All Registrations', headers, rows, 'lcoy2026_registrations.pdf');
    else download('lcoy2026_registrations.csv', toCSV(headers, rows));
  };

  const exportEntries = async (fmt) => {
    const snap = await getDocs(collection(db, 'users'));
    const headers = ['Name', 'Badge Code', 'Category', 'Entry Time'];
    const rows = [];
    snap.forEach(d => { const u = d.data(); (u.entries || []).forEach(e => rows.push([u.name, u.code, u.category, e.timestamp || ''])); });
    if (fmt === 'pdf') downloadPDF('Entry Log', headers, rows, 'lcoy2026_entries.pdf');
    else download('lcoy2026_entries.csv', toCSV(headers, rows));
  };

  const exportMeals = async (fmt) => {
    const snap = await getDocs(collection(db, 'users'));
    const headers = ['Name', 'Badge Code', 'Category', 'Day 1 Breakfast', 'Day 1 Lunch', 'Day 2 Breakfast', 'Day 2 Lunch'];
    const rows = [];
    snap.forEach(d => { const u = d.data(); const m = u.meals || {}; rows.push([u.name, u.code, u.category, m.day1_breakfast || '', m.day1_lunch || '', m.day2_breakfast || '', m.day2_lunch || '']); });
    if (fmt === 'pdf') downloadPDF('Meal Collection', headers, rows, 'lcoy2026_meals.pdf');
    else download('lcoy2026_meals.csv', toCSV(headers, rows));
  };

  const exportSupplies = async (fmt) => {
    const snap = await getDocs(collection(db, 'users'));
    const headers = ['Name', 'Badge Code', 'Category', 'Supplies Issued'];
    const rows = [];
    snap.forEach(d => { const u = d.data(); rows.push([u.name, u.code, u.category, u.suppliesIssued || '']); });
    if (fmt === 'pdf') downloadPDF('Supply Distribution', headers, rows, 'lcoy2026_supplies.pdf');
    else download('lcoy2026_supplies.csv', toCSV(headers, rows));
  };

  const exportSessions = async (fmt) => {
    const snap = await getDocs(collection(db, 'sessions'));
    const headers = ['Title', 'Day', 'Time', 'Type', 'Room', 'Capacity', 'Speakers'];
    const rows = [];
    snap.forEach(d => { const s = d.data(); rows.push([s.title, s.day, s.time, s.type, s.room, s.capacity, s.speakers]); });
    if (fmt === 'pdf') downloadPDF('Sessions / Agenda', headers, rows, 'lcoy2026_sessions.pdf');
    else download('lcoy2026_sessions.csv', toCSV(headers, rows));
  };

  const doExport = async (id, format) => {
    setBusy(id + format);
    try {
      if (id === 'reg') { await exportRegistrations(format); }
      else if (id === 'entries') { await exportEntries(format); }
      else if (id === 'meals') { await exportMeals(format); }
      else if (id === 'supplies') { await exportSupplies(format); }
      else if (id === 'sessions') { await exportSessions(format); }
    } catch (e) { console.error(e); alert('Export failed.'); }
    setBusy('');
  };

  // Patch export functions to accept format
  const origReg = exportRegistrations;
  const origEntries = exportEntries;
  const origMeals = exportMeals;
  const origSupplies = exportSupplies;
  const origSessions = exportSessions;

  const reports = [
    { id: 'reg', label: 'All registrations', desc: 'Name, email, phone, organisation, category, role, badge code, location.' },
    { id: 'entries', label: 'Entry log', desc: 'Every verified entry with timestamp.' },
    { id: 'meals', label: 'Meal collection', desc: 'Per-person meal collection status for all 4 meals.' },
    { id: 'supplies', label: 'Supply distribution', desc: 'Per-person supply issue status.' },
    { id: 'sessions', label: 'Sessions / agenda', desc: 'Full programme export with details.' },
  ];

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <header className="page-header"><div><span className="dashboard-eyebrow">Data</span><h1>Reports</h1><p className="text-muted" style={{ marginTop: '0.25rem' }}>Export conference data as CSV or PDF.</p></div></header>
      <div style={{ display: 'grid', gap: '0.75rem' }}>
        {reports.map(r => (
          <div key={r.id} className="card-elevated" style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 200px' }}>
              <div style={{ fontWeight: 700 }}>{r.label}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--ink-soft)', marginTop: '0.15rem' }}>{r.desc}</div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => doExport(r.id, 'csv')} disabled={!!busy}>
                {busy === r.id + 'csv' ? '…' : 'CSV'}
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => doExport(r.id, 'pdf')} disabled={!!busy}>
                {busy === r.id + 'pdf' ? '…' : 'PDF'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
