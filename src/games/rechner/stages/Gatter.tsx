import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { GateQuestion } from "../../../../shared/games/rechner";
import { tableRows } from "../../../../shared/logic-circuit";
import type { StageProps } from "../../../lib/game-registry";
import GameButton from "../../../components/GameButton";
import { StageActionBar } from "../../../components/StageShell";
import CircuitDiagram from "../components/CircuitDiagram";

type Cell = "" | "0" | "1";

/**
 * A circuit of UND, ODER and NICHT. Either the switches are set and the
 * question is what the lamp does, or the whole truth table is to be filled
 * in — the two exercises of Lektion 3.1, without the switches to try it on.
 */
export default function GatterStage({ question, submit }: StageProps<GateQuestion>) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<{ questionId: number; cells: Cell[] } | null>(null);
  if (!question) return null;

  if (question.task === "ausgang") {
    const values = Object.fromEntries(question.inputs.map((name, i) => [name, question.assignment[i]]));
    return (
      <div key={question.id} className="animate-question-in flex w-full max-w-xl flex-col items-center gap-5">
        <p className="text-center text-gray-500">{t("games.rechner.gate.outputPrompt")}</p>
        <CircuitDiagram circuit={question.circuit} values={values} />
        <p className="font-mono text-lg text-gray-600">
          {question.inputs.map((name, i) => `${name} = ${question.assignment[i]}`).join("   ")}
        </p>
        <div className="flex w-full max-w-sm gap-3">
          {[0, 1].map((value) => (
            <button
              key={value}
              onClick={() => submit(String(value))}
              className="flex-1 rounded-xl border-2 border-game-200 bg-white py-6 font-mono text-4xl font-bold text-gray-700 transition-all hover:border-game-solid hover:bg-game-50 active:scale-95"
            >
              {value}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const rows = tableRows(question.inputs);
  const cells: Cell[] = draft?.questionId === question.id ? draft.cells : rows.map(() => "");
  const setCell = (index: number) => {
    const next = [...cells];
    next[index] = next[index] === "1" ? "0" : "1";
    setDraft({ questionId: question.id, cells: next });
  };

  return (
    <div key={question.id} className="animate-question-in flex w-full max-w-xl flex-col items-center gap-5">
      <p className="text-center text-gray-500">{t("games.rechner.gate.tablePrompt")}</p>
      <CircuitDiagram circuit={question.circuit} />
      <table className="font-mono text-lg">
        <thead>
          <tr>
            {question.inputs.map((name) => (
              <th key={name} scope="col" className="px-3 py-1 text-gray-500">
                {name}
              </th>
            ))}
            <th scope="col" className="border-l-2 border-gray-300 px-3 py-1 text-game-ink">
              Y
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, r) => (
            <tr key={r} className="border-t border-gray-100">
              {row.map((bit, i) => (
                <td key={i} className="px-3 text-center text-gray-700">
                  {bit}
                </td>
              ))}
              <td className="border-l-2 border-gray-300 px-2 py-0.5">
                <button
                  onClick={() => setCell(r)}
                  aria-label={t("games.rechner.gate.cell", {
                    row: question.inputs.map((name, i) => `${name}=${row[i]}`).join(", "),
                    value: cells[r] || "–",
                  })}
                  className={`h-9 w-11 rounded-lg border-2 font-bold ${
                    cells[r] ? "border-game-solid bg-game-50 text-game-ink" : "border-dashed border-gray-300 text-gray-300"
                  }`}
                >
                  {cells[r] || "·"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <StageActionBar>
        <GameButton
          onClick={() => submit(cells.map((c) => c || "x").join(""))}
          disabled={cells.some((c) => c === "")}
        >
          {t("game.submit")}
        </GameButton>
      </StageActionBar>
    </div>
  );
}

export function GatterRulesExample() {
  return (
    <div className="w-64">
      <CircuitDiagram
        circuit={{ op: "und", a: { in: "A" }, b: { op: "oder", a: { in: "B" }, b: { in: "C" } } }}
        values={{ A: 1, B: 0, C: 1 }}
      />
    </div>
  );
}
