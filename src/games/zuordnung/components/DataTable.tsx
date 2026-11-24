import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { zuordnungNumber, type TableRow } from "../../../../shared/games/zuordnung";

/**
 * A Zuordnung as the class writes it in the Arbeitsheft: two labelled columns,
 * rows of paired values — and, while the round runs, one cell the player fills.
 */
export default function DataTable({
  rows,
  xLabelKey,
  yLabelKey,
  xUnit,
  yUnit,
  blankCell,
  className = "",
}: {
  rows: TableRow[];
  xLabelKey: string;
  yLabelKey: string;
  xUnit: string;
  yUnit: string;
  /** What the one empty cell holds while the round runs — the input. */
  blankCell?: ReactNode;
  className?: string;
}) {
  const { t } = useTranslation();

  const head = (labelKey: string, unit: string) =>
    unit ? `${t(labelKey)} (${unit})` : t(labelKey);

  return (
    <div className={`overflow-x-auto rounded-xl border-2 border-game-200 ${className}`}>
      <table className="w-full border-collapse text-lg">
        <thead>
          <tr className="bg-game-50 text-game-ink">
            <th className="px-4 py-2 text-left font-semibold">{head(xLabelKey, xUnit)}</th>
            <th className="px-4 py-2 text-left font-semibold">{head(yLabelKey, yUnit)}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-t border-game-100">
              <td className="px-4 py-2 text-right tabular-nums">
                {row.x === null ? blankCell ?? "?" : zuordnungNumber(row.x)}
              </td>
              <td className="px-4 py-2 text-right tabular-nums">
                {row.y === null ? blankCell ?? "?" : zuordnungNumber(row.y)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
