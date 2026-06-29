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

async function loadLogoBase64() {
  try {
    const resp = await fetch('/photos/LCOY-2026-Logo.png');
    const blob = await resp.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch { return null; }
}

async function downloadPDF(title, headers, rows, filename) {
  const isWide = headers.length > 6;
  const doc = new jsPDF({ orientation: isWide ? 'landscape' : 'portrait' });
  const pageW = doc.internal.pageSize.getWidth();
  const logoData = await loadLogoBase64();

  const drawHeader = () => {
    doc.setFillColor(11, 34, 51);
    doc.rect(0, 0, pageW, 48, 'F');

    if (logoData) {
      // White rounded background for logo
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(8, 5, 40, 22, 4, 4, 'F');
      // Logo at 2:1 ratio (width:height)
      doc.addImage(logoData, 'PNG', 10, 7, 36, 18);
    }

    const textX = logoData ? 54 : 14;

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('LCOY Sierra Leone 2026', textX, 18);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(title, textX, 28);

    doc.setFontSize(8);
    doc.setTextColor(180, 200, 220);
    doc.text(`Freetown · 7–9 October 2026 · ${rows.length} records`, textX, 36);
    doc.text(`Generated ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`, textX, 42);

    doc.setTextColor(0, 0, 0);
  };

  drawHeader();

  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 54,
    styles: { fontSize: 7.5, cellPadding: 3.5, lineColor: [220, 220, 220], lineWidth: 0.1 },
    headStyles: { fillColor: [0, 114, 198], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: [244, 248, 246] },
    margin: { left: 14, right: 14 },
    didDrawPage: (data) => {
      if (data.pageNumber > 1) drawHeader();
      const pageH = doc.internal.pageSize.getHeight();
      doc.setDrawColor(200, 200, 200);
      doc.line(14, pageH - 14, pageW - 14, pageH - 14);
      doc.setFontSize(7);
      doc.setTextColor(140, 140, 140);
      doc.text('LCOY Sierra Leone 2026 · Inclusive Climate Action: Leaving No Youth Behind', 14, pageH - 8);
      doc.text(`Page ${data.pageNumber}`, pageW - 14, pageH - 8, { align: 'right' });
    },
  });

  doc.save(filename);
}

export default function Reports() {
  const [busy, setBusy] = useState('');

  const exportRegistrations = async (fmt) => {
    const snap = await getDocs(collection(db, 'users'));
    const headers = ['Name', 'Email', 'Phone', 'Organisation', 'Category', 'Role', 'Badge Code', 'Region', 'District', 'City'];
    const rows = [];
    snap.forEach(d => { const u = d.data(); rows.push([u.name, u.email, u.phone, u.org, u.category, u.role, u.code, u.region, u.district, u.city]); });
    if (fmt === 'pdf') await downloadPDF('All Registrations', headers, rows, 'lcoy2026_registrations.pdf');
    else download('lcoy2026_registrations.csv', toCSV(headers, rows));
  };

  const exportEntries = async (fmt) => {
    const snap = await getDocs(collection(db, 'users'));
    const headers = ['Name', 'Badge Code', 'Category', 'Entry Time'];
    const rows = [];
    snap.forEach(d => { const u = d.data(); (u.entries || []).forEach(e => rows.push([u.name, u.code, u.category, e.timestamp || ''])); });
    if (fmt === 'pdf') await downloadPDF('Entry Log', headers, rows, 'lcoy2026_entries.pdf');
    else download('lcoy2026_entries.csv', toCSV(headers, rows));
  };

  const exportMeals = async (fmt) => {
    const snap = await getDocs(collection(db, 'users'));
    const headers = ['Name', 'Badge Code', 'Category', 'Day 1 Breakfast', 'Day 1 Lunch', 'Day 2 Breakfast', 'Day 2 Lunch'];
    const rows = [];
    snap.forEach(d => { const u = d.data(); const m = u.meals || {}; rows.push([u.name, u.code, u.category, m.day1_breakfast || '', m.day1_lunch || '', m.day2_breakfast || '', m.day2_lunch || '']); });
    if (fmt === 'pdf') await downloadPDF('Meal Collection', headers, rows, 'lcoy2026_meals.pdf');
    else download('lcoy2026_meals.csv', toCSV(headers, rows));
  };

  const exportSupplies = async (fmt) => {
    const snap = await getDocs(collection(db, 'users'));
    const headers = ['Name', 'Badge Code', 'Category', 'Supplies Issued'];
    const rows = [];
    snap.forEach(d => { const u = d.data(); rows.push([u.name, u.code, u.category, u.suppliesIssued || '']); });
    if (fmt === 'pdf') await downloadPDF('Supply Distribution', headers, rows, 'lcoy2026_supplies.pdf');
    else download('lcoy2026_supplies.csv', toCSV(headers, rows));
  };

  const exportSessions = async (fmt) => {
    const snap = await getDocs(collection(db, 'sessions'));
    const headers = ['Title', 'Day', 'Time', 'Type', 'Room', 'Capacity', 'Speakers'];
    const rows = [];
    snap.forEach(d => { const s = d.data(); rows.push([s.title, s.day, s.time, s.type, s.room, s.capacity, s.speakers]); });
    if (fmt === 'pdf') await downloadPDF('Sessions / Agenda', headers, rows, 'lcoy2026_sessions.pdf');
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
