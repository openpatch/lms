import type { SheetRow } from "../../../shared/games/spreadsheet";

interface Props {
  headers: string[];
  rows: SheetRow[];
}

/** A compact spreadsheet fragment, including row and column headings. */
export default function SpreadsheetTable({ headers, rows }: Props) {
  return (
    <div className="max-w-full overflow-x-auto rounded-xl border border-gray-300 bg-white shadow-sm">
      <table className="border-collapse text-sm sm:text-base">
        <thead>
          <tr>
            {headers.map((header, index) => (
              <th
                key={`${header}-${index}`}
                scope="col"
                className="min-w-16 border-b border-r border-gray-300 bg-gray-100 px-3 py-2 font-semibold text-gray-600 last:border-r-0"
              >
                {header || "#"}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.cells.map((cell, cellIndex) =>
                cellIndex === 0 ? (
                  <th
                    key={cellIndex}
                    scope="row"
                    className="border-b border-r border-gray-300 bg-gray-100 px-3 py-2 font-semibold text-gray-500 last:border-b-0"
                  >
                    {cell}
                  </th>
                ) : (
                  <td
                    key={cellIndex}
                    className="border-b border-r border-gray-200 px-4 py-2 text-gray-800 last:border-r-0"
                  >
                    {cell}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
