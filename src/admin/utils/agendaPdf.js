import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const DAY_ORDER = ['Day 1 — 7 October', 'Day 2 — 8 October', 'Day 3 — 9 October'];
const HEADER_SRC = '/Conference Programme Header.png';

// Row shading by session type. Colour-coding by hall was the alternative, but
// nearly everything sits in the Main Hall, so it would have come out almost
// entirely one colour — type separates plenaries, workshops, breakouts, meals
// and ceremonies, and still makes the parallel breakouts stand out.
const TYPE_FILL = {
  Plenary: [219, 234, 254],
  Panel: [237, 233, 254],
  Workshop: [254, 243, 199],
  Breakout: [209, 250, 229],
  Ceremony: [252, 231, 243],
  Hackathon: [255, 228, 230],
  'Field Trip': [220, 252, 231],
  Other: [241, 245, 249],
};
const LEGEND = ['Plenary', 'Panel', 'Workshop', 'Breakout', 'Ceremony'];

// Sessions carry a short title plus a subtitle; the printed programme wants the
// whole name on one line, the same way the public page shows it.
function fullTitle(s) {
  const sub = (s.description || '').trim().replace(/\.$/, '');
  return sub ? `${s.title}: ${sub}` : (s.title || '');
}

// The supplied banner is 6000px wide. Embedded as-is that is tens of megabytes
// of bitmap, so it is redrawn at roughly 200dpi for the page width and handed
// over as a JPEG.
async function loadHeaderImage(targetPxWide) {
  const img = new Image();
  img.src = encodeURI(HEADER_SRC);
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
  const scale = targetPxWide / img.naturalWidth;
  const canvas = document.createElement('canvas');
  canvas.width = targetPxWide;
  canvas.height = Math.round(img.naturalHeight * scale);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return { data: canvas.toDataURL('image/jpeg', 0.86), ratio: img.naturalWidth / img.naturalHeight };
}

export async function downloadAgendaPdf(sessions) {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  let banner = null;
  try { banner = await loadHeaderImage(1654); } catch { /* falls back to a plain page */ }
  const bannerH = banner ? pageW / banner.ratio : 0;
  const contentTop = (bannerH || 10) + 12;

  const drawBanner = () => {
    if (!banner) return;
    doc.addImage(banner.data, 'JPEG', 0, 0, pageW, bannerH, 'lcoyHeader', 'FAST');
  };

  const drawDayTitle = (day, y) => {
    doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.setTextColor(11, 34, 51);
    doc.text(day.toUpperCase(), pageW / 2, y, { align: 'center' });
  };

  // Compact swatch row so the shading is readable without guessing.
  const drawLegend = (y) => {
    doc.setFontSize(7.5); doc.setFont('helvetica', 'normal');
    const gap = 4, box = 3.2;
    const widths = LEGEND.map(l => box + 1.6 + doc.getTextWidth(l));
    const total = widths.reduce((a, b) => a + b, 0) + gap * (LEGEND.length - 1);
    let x = (pageW - total) / 2;
    LEGEND.forEach((label, i) => {
      const [r, g, b] = TYPE_FILL[label];
      doc.setFillColor(r, g, b);
      doc.setDrawColor(190, 190, 190);
      doc.rect(x, y - box + 0.6, box, box, 'FD');
      doc.setTextColor(90, 90, 90);
      doc.text(label, x + box + 1.6, y);
      x += widths[i] + gap;
    });
  };

  const days = DAY_ORDER
    .map(day => ({ day, items: sessions.filter(s => s.day === day).sort((a, b) => (a.time || '').localeCompare(b.time || '')) }))
    .filter(d => d.items.length > 0);

  days.forEach(({ day, items }, index) => {
    // One day per page.
    if (index > 0) doc.addPage();
    drawBanner();
    drawDayTitle(day, contentTop);
    drawLegend(contentTop + 8);

    autoTable(doc, {
      head: [['Time', 'Session', 'Type', 'Venue']],
      body: items.map(s => [
        s.time || '',
        s.speakers ? `${fullTitle(s)}\n${s.speakers}` : fullTitle(s),
        s.type === 'Other' ? '' : (s.type || ''),
        s.room || '',
      ]),
      startY: contentTop + 13,
      styles: { fontSize: 7.5, cellPadding: 2.4, lineColor: [214, 214, 214], lineWidth: 0.1, valign: 'top', textColor: [25, 35, 45] },
      headStyles: { fillColor: [11, 34, 51], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 24 },
        2: { cellWidth: 20 },
        3: { cellWidth: 34 },
      },
      margin: { left: 12, right: 12, bottom: 18 },
      // Shade the whole row by its session type.
      didParseCell: (data) => {
        if (data.section !== 'body') return;
        const type = items[data.row.index]?.type || 'Other';
        const fill = TYPE_FILL[type] || TYPE_FILL.Other;
        data.cell.styles.fillColor = fill;
      },
    });
  });

  // Stamped once at the end so page numbers count the document, not each table.
  const generated = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setDrawColor(200, 200, 200);
    doc.line(12, pageH - 13, pageW - 12, pageH - 13);
    doc.setFontSize(7); doc.setTextColor(140, 140, 140); doc.setFont('helvetica', 'normal');
    // Kept short: the full tagline ran past the middle of the page and
    // collided with the centred "Generated" line.
    doc.text('LCOY Sierra Leone 2026', 12, pageH - 8.5);
    doc.text(`Generated ${generated}`, pageW / 2, pageH - 8.5, { align: 'center' });
    doc.text(`Page ${p} of ${total}`, pageW - 12, pageH - 8.5, { align: 'right' });
  }

  doc.save('lcoy2026_conference_agenda.pdf');
}
