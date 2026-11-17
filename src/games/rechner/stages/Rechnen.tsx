import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { BinaryCalcQuestion } from "../../../../shared/games/rechner";
import type { StageProps } from "../../../lib/game-registry";
import GameButton from "../../../components/GameButton";
import { StageActionBar } from "../../../components/StageShell";

type Cell = "" | "0" | "1";

interface Draft {
  questionId: number;
  result: Cell[];
  carry: boolean[];
  overflow: boolean | null;
}

/** Digits of a number right-aligned into `width` columns, blanks on the left. */
function digits(value: number, length: number, width: number): string[] {
  const text = value.toString(2).padStart(length, "0");
  return [...Array.from({ length: Math.max(0, width - text.length) }, () => ""), ...text];
}

/**
 * Schriftlich, in binary — the grid of the hyperbook's `<binaer-addition>`:
 * the two numbers, a row for the carries, and the result row to tap in.
 *
 * The carry row is scratch paper. It is there because writing the carry down
 * is how the method is taught, and it is not graded because the method is not
 * what is being marked — the sum is.
 */
export default function RechnenStage({ question, submit }: StageProps<BinaryCalcQuestion>) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<Draft | null>(null);
  if (!question) return null;

  const columns = Math.max(question.width, question.aBits, question.bBits);
  const current: Draft =
    draft?.questionId === question.id
      ? draft
      : {
          questionId: question.id,
          result: Array.from({ length: question.width }, () => "" as Cell),
          carry: Array.from({ length: columns }, () => false),
          overflow: null,
        };

  const setResult = (index: number) => {
    const result = [...current.result];
    // Empty, then 1, then back and forth: the first tap is the likelier digit.
    result[index] = result[index] === "1" ? "0" : "1";
    setDraft({ ...current, result });
  };
  const setCarry = (index: number) => {
    const carry = [...current.carry];
    carry[index] = !carry[index];
    setDraft({ ...current, carry });
  };

  const send = () =>
    submit(
      JSON.stringify({
        bits: current.result.map((c) => c || "0").join(""),
        ...(question.register ? { overflow: current.overflow === true } : {}),
      }),
    );

  const grid = { gridTemplateColumns: `2rem repeat(${columns}, minmax(0, 2.75rem))` };
  const offset = columns - question.width;
  const symbol = question.op === "add" ? "+" : "·";

  return (
    <div key={question.id} className="animate-question-in flex flex-col items-center gap-5">
      <p className="text-center text-gray-500">
        {t(question.op === "add" ? "games.rechner.calc.addPrompt" : "games.rechner.calc.mulPrompt")}
      </p>

      {question.op === "mul" && (
        <p className="font-mono text-3xl font-bold text-game-ink">
          {question.a.toString(2)} · {question.b.toString(2)}
        </p>
      )}

      <div className="grid items-center gap-1 font-mono text-2xl" style={grid}>
        {question.op === "add" && (
          <>
            <span />
            {digits(question.a, question.aBits, columns).map((d, i) => (
              <span key={`a${i}`} className="text-center">
                {d}
              </span>
            ))}
            <span className="text-center text-gray-500">{symbol}</span>
            {digits(question.b, question.bBits, columns).map((d, i) => (
              <span key={`b${i}`} className="text-center">
                {d}
              </span>
            ))}
            <span className="text-center text-xs text-gray-400" aria-hidden>
              Ü
            </span>
            {current.carry.map((on, i) => (
              <button
                key={`c${i}`}
                onClick={() => setCarry(i)}
                aria-pressed={on}
                aria-label={t("games.rechner.calc.carry", { column: columns - i })}
                className="mx-auto h-7 w-7 rounded border border-dashed border-gray-300 text-sm text-gray-500"
              >
                {on ? "1" : ""}
              </button>
            ))}
            <span className="col-span-full my-1 border-t-2 border-gray-700" />
          </>
        )}
        <span />
        {Array.from({ length: offset }, (_, i) => (
          <span key={`o${i}`} />
        ))}
        {current.result.map((cell, i) => (
          <button
            key={`r${i}`}
            onClick={() => setResult(i)}
            aria-label={t("games.rechner.calc.digit", { column: question.width - i, value: cell || "–" })}
            className={`h-12 rounded-lg border-2 text-2xl font-bold transition-colors ${
              cell ? "border-game-solid bg-game-50 text-game-ink" : "border-dashed border-gray-300 text-gray-300"
            }`}
          >
            {cell || "·"}
          </button>
        ))}
      </div>

      {question.register && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm text-gray-600">{t("games.rechner.calc.overflowPrompt", { bits: question.width })}</p>
          <div className="flex gap-2">
            {[true, false].map((value) => (
              <button
                key={String(value)}
                onClick={() => setDraft({ ...current, overflow: value })}
                aria-pressed={current.overflow === value}
                className={`rounded-lg border-2 px-5 py-2 font-semibold ${
                  current.overflow === value ? "border-game-solid bg-game-solid text-white" : "border-gray-200 text-gray-600"
                }`}
              >
                {t(value ? "games.rechner.calc.overflowYes" : "games.rechner.calc.overflowNo")}
              </button>
            ))}
          </div>
        </div>
      )}

      <StageActionBar>
        <GameButton onClick={send} disabled={question.register && current.overflow == null}>
          {t("game.submit")}
        </GameButton>
      </StageActionBar>
    </div>
  );
}

export function RechnenRulesExample() {
  const rows = [
    ["", "0", "1", "1", "0"],
    ["+", "0", "1", "1", "1"],
    ["Ü", "1", "1", "", ""],
    ["", "1", "1", "0", "1"],
  ];
  return (
    <div className="grid grid-cols-5 gap-x-3 font-mono text-xl">
      {rows.flatMap((row, r) =>
        row.map((cell, c) => (
          <span
            key={`${r}-${c}`}
            className={`text-center ${r === 2 ? "text-xs text-gray-400" : ""} ${r === 3 ? "border-t-2 border-gray-700 font-bold text-game-ink" : ""}`}
          >
            {cell}
          </span>
        )),
      )}
    </div>
  );
}
