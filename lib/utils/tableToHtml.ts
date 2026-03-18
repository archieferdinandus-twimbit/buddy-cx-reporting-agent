export function rowsToHtmlTable(
  rows: Record<string, unknown>[],
  label?: string
): string {
  if (!rows || rows.length === 0) return "";

  const columns = Object.keys(rows[0]);

  const formatHeader = (col: string) =>
    col.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const formatCell = (value: unknown): string => {
    if (value === null || value === undefined) return "—";
    if (typeof value === "number") {
      return Number.isInteger(value) ? value.toString() : value.toFixed(2);
    }
    return String(value);
  };

  const thead = `<thead><tr>${columns.map((col) => `<th>${formatHeader(col)}</th>`).join("")}</tr></thead>`;
  const tbody = `<tbody>${rows
    .map(
      (row) =>
        `<tr>${columns.map((col) => `<td>${formatCell(row[col])}</td>`).join("")}</tr>`
    )
    .join("")}</tbody>`;

  const table = `<table>${thead}${tbody}</table>`;

  if (label) {
    return `<figure>${table}<figcaption>${label}</figcaption></figure>`;
  }

  return table;
}
