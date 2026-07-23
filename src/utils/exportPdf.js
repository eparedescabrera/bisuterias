import PDFDocument from 'pdfkit';

export function buildPdfBuffer({ meta, columns, rows }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(16).text(meta.negocio, { continued: false });
    doc.moveDown(0.3);
    doc.fontSize(13).text(meta.titulo);
    doc.moveDown(0.3);
    doc
      .fontSize(9)
      .fillColor('#444')
      .text(
        `Período: ${meta.filtros.desde || '-'} a ${meta.filtros.hasta || '-'}`
      )
      .text(`Generado: ${meta.generado}`)
      .text(`Usuario: ${meta.usuario}`);
    doc.moveDown();
    doc.fillColor('#000');

    const headers = columns.map((c) => c.header).join(' | ');
    doc.fontSize(8).text(headers, { underline: true });
    doc.moveDown(0.4);

    const maxRows = Math.min(rows.length, 80);
    for (let i = 0; i < maxRows; i += 1) {
      const line = columns.map((c) => String(rows[i][c.key] ?? '')).join(' | ');
      doc.fontSize(8).text(line, { lineGap: 2 });
      if (doc.y > 750) {
        doc.addPage();
      }
    }

    if (rows.length > maxRows) {
      doc.moveDown();
      doc.text(`… y ${rows.length - maxRows} filas más (exporte Excel para el detalle completo)`);
    }

    doc.end();
  });
}
