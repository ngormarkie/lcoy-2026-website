import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const DAY_ORDER = ['Day 1 — 7 October', 'Day 2 — 8 October', 'Day 3 — 9 October'];
const VENUE = 'Freetown City Council Hall';
const DATES = '7–8 October 2026';

// Sessions carry a short title plus a subtitle; the printed programme wants the
// whole name on one line, the same way the public page shows it.
function fullTitle(s) {
  const sub = (s.description || '').trim().replace(/\.$/, '');
  return sub ? `${s.title}: ${sub}` : (s.title || '');
}

export async function downloadAgendaPdf(sessions) {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  let logoData = null;
  try {
    const resp = await fetch('/photos/LCOY-2026-Logo.png');
    const blob = await resp.blob();
    logoData = await new Promise((res) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = () => res(null);
      r.readAsDataURL(blob);
    });
  } catch { /* header just renders without the logo */ }

  const drawHeader = () => {
    doc.setFillColor(11, 34, 51);
    doc.rect(0, 0, pageW, 46, 'F');
    if (logoData) {
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(8, 5, 40, 22, 4, 4, 'F');
      // The alias makes jsPDF store the logo once and reference it on later
      // pages; without it the bitmap is re-embedded per page and a two-page
      // programme weighs in at over 10MB.
      doc.addImage(logoData, 'PNG', 10, 7, 36, 18, 'lcoyLogo', 'FAST');
    }
    const tx = logoData ? 54 : 14;
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18); doc.setFont('helvetica', 'bold');
    doc.text('LCOY Sierra Leone 2026', tx, 17);
    doc.setFontSize(11); doc.setFont('helvetica', 'normal');
    doc.text('Conference Programme', tx, 26);
    doc.setFontSize(8); doc.setTextColor(180, 200, 220);
    doc.text(`${VENUE} · ${DATES}`, tx, 34);
    doc.text(`Generated ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`, tx, 40);
    doc.setTextColor(0, 0, 0);
  };

  let cursorY = 56;
  let firstDay = true;

  for (const day of DAY_ORDER) {
    const items = sessions
      .filter(s => s.day === day)
      .sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    if (items.length === 0) continue;

    // Keep a day heading with at least the first row of its table.
    if (!firstDay && cursorY > pageH - 50) { doc.addPage(); cursorY = 56; }
    firstDay = false;

    doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 114, 198);
    doc.text(day, 14, cursorY);
    cursorY += 5;

    autoTable(doc, {
      head: [['Time', 'Session', 'Type', 'Venue']],
      body: items.map(s => [
        s.time || '',
        s.speakers ? `${fullTitle(s)}\n${s.speakers}` : fullTitle(s),
        s.type === 'Other' ? '' : (s.type || ''),
        s.room || '',
      ]),
      startY: cursorY,
      styles: { fontSize: 8, cellPadding: 3, lineColor: [220, 220, 220], lineWidth: 0.1, valign: 'top' },
      headStyles: { fillColor: [0, 114, 198], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
      alternateRowStyles: { fillColor: [244, 248, 246] },
      columnStyles: {
        0: { cellWidth: 26 },
        2: { cellWidth: 22 },
        3: { cellWidth: 38 },
      },
      margin: { left: 14, right: 14, top: 56, bottom: 22 },
    });

    cursorY = doc.lastAutoTable.finalY + 12;
  }

  // Stamped once at the end over every page. Doing this inside autoTable's
  // didDrawPage instead would number pages per table rather than per document,
  // so a third day would restart the count at 1.
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    drawHeader();
    doc.setDrawColor(200, 200, 200);
    doc.line(14, pageH - 14, pageW - 14, pageH - 14);
    doc.setFontSize(7); doc.setTextColor(140, 140, 140);
    doc.setFont('helvetica', 'normal');
    doc.text('LCOY Sierra Leone 2026 · Inclusive Climate Action: Leaving No Youth Behind', 14, pageH - 8);
    doc.text(`Page ${p} of ${total}`, pageW - 14, pageH - 8, { align: 'right' });
  }

  doc.save('lcoy2026_conference_agenda.pdf');
}
