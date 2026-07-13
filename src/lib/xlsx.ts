import ExcelJS from "exceljs";

export async function xlsxResponse(
  filename: string,
  sheetName: string,
  headers: string[],
  rows: (string | number | null | undefined)[][]
) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);

  sheet.columns = headers.map((header) => ({ header, key: header, width: 22 }));
  sheet.getRow(1).font = { bold: true };

  for (const row of rows) {
    sheet.addRow(row.map((cell) => cell ?? ""));
  }

  const buffer = await workbook.xlsx.writeBuffer();

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
