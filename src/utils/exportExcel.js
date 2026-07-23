import ExcelJS from 'exceljs';

export async function buildExcelBuffer({ meta, columns, rows }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = meta.usuario;
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(meta.titulo.slice(0, 28) || 'Reporte');

  sheet.addRow([meta.negocio]);
  sheet.addRow([meta.titulo]);
  sheet.addRow([
    `Período: ${meta.filtros.desde || '-'} a ${meta.filtros.hasta || '-'}`
  ]);
  sheet.addRow([`Generado: ${meta.generado} · Usuario: ${meta.usuario}`]);
  sheet.addRow([]);

  sheet.addRow(columns.map((c) => c.header));
  const headerRow = sheet.lastRow;
  headerRow.font = { bold: true };

  for (const row of rows) {
    sheet.addRow(columns.map((c) => row[c.key] ?? ''));
  }

  sheet.columns.forEach((col) => {
    col.width = 18;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
