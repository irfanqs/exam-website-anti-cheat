export function toCsv(rows: (string | number | null | undefined)[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const value = cell === null || cell === undefined ? "" : String(cell);
          return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
        })
        .join(",")
    )
    .join("\r\n");
}

// Byte-order-mark supaya Excel membaca karakter non-ASCII (é, ü, dsb.) dengan benar.
const UTF8_BOM = String.fromCharCode(0xfeff);

export function csvResponse(filename: string, csv: string) {
  return new Response(UTF8_BOM + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
