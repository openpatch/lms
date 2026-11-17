import { useTranslation } from "react-i18next";
import { OPCODES, mnemonic, toBits } from "../../../../shared/mini-prozessor";

/**
 * Memory cells the way the hyperbook's `<mini-prozessor>` lists them: the
 * address, the bit pattern, the number, and what the processor would read in
 * it as a command — for every cell, data included, because the lesson's
 * point is that the two look the same.
 */
export function MemoryTable({
  memory,
  raw = false,
  highlight,
  from = 0,
}: {
  memory: number[];
  /** Numbers only: the commands have to be decoded by the player. */
  raw?: boolean;
  highlight?: number;
  /** Show cells from this address on. */
  from?: number;
}) {
  const { t } = useTranslation();
  return (
    <table className="w-full max-w-md text-sm">
      <thead>
        <tr className="text-left text-xs text-gray-500">
          <th scope="col" className="px-2 py-1">{t("games.rechner.cpu.cell")}</th>
          {!raw && <th scope="col" className="px-2 py-1">{t("games.rechner.cpu.bits")}</th>}
          <th scope="col" className="px-2 py-1 text-right">{t("games.rechner.cpu.number")}</th>
          {!raw && <th scope="col" className="px-2 py-1">{t("games.rechner.cpu.command")}</th>}
        </tr>
      </thead>
      <tbody className="font-mono">
        {memory.map((value, cell) =>
          cell < from ? null : (
            <tr
              key={cell}
              className={`border-t border-gray-100 ${cell === highlight ? "bg-game-50 font-bold text-game-ink" : "text-gray-700"}`}
            >
              <td className="px-2 py-0.5 tabular-nums">{cell}</td>
              {!raw && (
                <td className="px-2 py-0.5 tabular-nums text-gray-500">
                  {toBits(value).slice(0, 3)} {toBits(value).slice(3)}
                </td>
              )}
              <td className="px-2 py-0.5 text-right tabular-nums">{value}</td>
              {!raw && <td className="px-2 py-0.5">{mnemonic(value)}</td>}
            </tr>
          ),
        )}
      </tbody>
    </table>
  );
}

/** The six commands, as the lesson's table has them. */
export function OpcodeTable() {
  return (
    <div className="grid grid-cols-3 gap-x-4 gap-y-0.5 rounded-lg bg-gray-50 px-3 py-2 font-mono text-xs text-gray-600 sm:grid-cols-6">
      {OPCODES.map((name, op) => (
        <span key={name} className="whitespace-nowrap">
          <span className="text-gray-400">{toBits(op, 3)}</span> {name}
        </span>
      ))}
    </div>
  );
}
