import { useState } from "react";
import { useTranslation } from "react-i18next";
import type {
  ChartKind,
  ChartQuestion,
  SpreadsheetChoiceQuestion,
} from "../../../../shared/games/spreadsheet";
import type { StageProps } from "../../../lib/game-registry";
import SpreadsheetTable from "../SpreadsheetTable";
import { optionKeyPrefix, optionText } from "./answer-labels";

function chartPath(values: number[]): string {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(1, max - min);
  return values
    .map((value, index) => {
      const x = 12 + (index * 96) / Math.max(1, values.length - 1);
      const y = 50 - ((value - min) / span) * 36;
      return `${index === 0 ? "M" : "L"}${x} ${y}`;
    })
    .join(" ");
}

function ChartPreview({ kind, values }: { kind: ChartKind; values: number[] }) {
  const max = Math.max(...values.map(Math.abs), 1);
  return (
    <svg viewBox="0 0 120 62" className="h-16 w-28" aria-hidden="true">
      <path d="M8 7V54H114" fill="none" stroke="currentColor" strokeWidth="2" opacity=".35" />
      {kind === "line" && (
        <path d={chartPath(values)} fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      )}
      {kind === "bar" &&
        values.slice(0, 6).map((value, index) => {
          const height = 38 * (Math.abs(value) / max);
          return <rect key={index} x={13 + index * 16} y={51 - height} width="11" height={height} rx="2" fill="currentColor" />;
        })}
      {kind === "scatter" &&
        values.slice(0, 6).map((value, index) => (
          <circle key={index} cx={16 + index * 18} cy={48 - (Math.abs(value) / max) * 34} r="4" fill="currentColor" />
        ))}
      {kind === "pie" && (
        <g transform="translate(60 30)">
          <circle r="22" fill="currentColor" opacity=".25" />
          <path d="M0 0V-22A22 22 0 0 1 19 11Z" fill="currentColor" />
        </g>
      )}
    </svg>
  );
}

/** The cell address and its content, as the formula bar above a sheet shows them. */
function FormulaBar({ address, text }: { address: string; text: string }) {
  return (
    <div className="flex max-w-full items-stretch overflow-x-auto rounded-lg border border-gray-300 bg-white font-mono shadow-sm">
      <span className="border-r border-gray-300 bg-gray-100 px-3 py-2 font-semibold text-gray-600">
        {address}
      </span>
      <span className="border-r border-gray-300 px-2 py-2 italic text-gray-400" aria-hidden="true">
        fx
      </span>
      <code className="whitespace-nowrap px-3 py-2 text-gray-800">{text}</code>
    </div>
  );
}

export default function ChoiceStage<Q extends SpreadsheetChoiceQuestion>({
  question,
  submit,
  revealed,
}: StageProps<Q>) {
  const { t } = useTranslation();
  const [picked, setPicked] = useState<{ questionId: number; index: number } | null>(null);

  if (!question) return null;
  const chart = question.kind === "chart";
  const worded = optionKeyPrefix(question) !== undefined;
  const values = question.rows
    .map((row) => Number(String(row.cells.at(-1)).replace(",", ".")))
    .filter(Number.isFinite);
  const pickedIndex = picked?.questionId === question.id ? picked.index : -1;

  const choose = (index: number) => {
    if (revealed) return;
    setPicked({ questionId: question.id, index });
    submit(String(index));
  };

  return (
    <div className="flex w-full flex-col items-center gap-5">
      <p key={question.id} className="animate-question-in max-w-2xl text-center text-lg font-medium text-gray-700">
        {t(question.promptKey, question.promptParams)}
      </p>

      {question.formula && <FormulaBar {...question.formula} />}

      {question.rows.length > 0 && <SpreadsheetTable headers={question.headers} rows={question.rows} />}

      {question.parameterAddress && (
        <div className="rounded-lg border-2 border-game-200 bg-game-50 px-4 py-2 font-mono text-game-ink">
          {question.parameterAddress} = {question.parameterValue}
        </div>
      )}

      <div className={`grid w-full max-w-3xl gap-3 ${chart ? "grid-cols-2 sm:grid-cols-4" : "sm:grid-cols-2"}`}>
        {question.options.map((option, index) => {
          const correct = revealed && index === question.answerIndex;
          const wrong = revealed && index === pickedIndex && !correct;
          return (
            <button
              key={`${option}-${index}`}
              type="button"
              disabled={revealed}
              onClick={() => choose(index)}
              className={`flex min-h-16 flex-col items-center justify-center rounded-xl border-2 px-3 py-3 font-medium transition-colors ${
                correct
                  ? "border-green-600 bg-green-50 text-green-800"
                  : wrong
                    ? "border-red-500 bg-red-50 text-red-800"
                    : "border-gray-200 bg-white text-gray-700 hover:border-game-400 hover:bg-game-50"
              }`}
            >
              {chart && <ChartPreview kind={option as ChartKind} values={values} />}
              <span className={chart ? "text-sm" : worded ? "text-base" : "font-mono text-base"}>
                {optionText(question, option, t)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FormulaRulesExample({ formula, captionKey }: { formula: string; captionKey: string }) {
  const { t } = useTranslation();
  return (
    <div className="rounded-lg bg-gray-100 px-4 py-3 text-center font-mono text-gray-700">
      {formula}
      <div className="mt-1 font-sans text-xs text-gray-500">{t(captionKey)}</div>
    </div>
  );
}

export function SpreadsheetRulesExample({ chart = false }: { chart?: boolean }) {
  const { t } = useTranslation();
  if (chart) {
    return (
      <div className="flex items-center justify-center gap-4 text-game-ink">
        <ChartPreview kind="line" values={[2, 5, 8, 13, 10]} />
        <span className="text-sm text-gray-500">{t("games.spreadsheet.examples.chart")}</span>
      </div>
    );
  }
  return <FormulaRulesExample formula="=B2*(1+$F$1)" captionKey="games.spreadsheet.examples.copy" />;
}

export function FunctionRulesExample() {
  return <FormulaRulesExample formula="=SUMME(B2:B6)" captionKey="games.spreadsheet.examples.range" />;
}

export function ConditionRulesExample() {
  return (
    <FormulaRulesExample
      formula={'=WENN(B2>=$F$1;"warm";"kühl")'}
      captionKey="games.spreadsheet.examples.condition"
    />
  );
}

export function CheckRulesExample() {
  return <FormulaRulesExample formula="=MAX(B2;B6)" captionKey="games.spreadsheet.examples.check" />;
}

export function ChartRulesExample() {
  return <SpreadsheetRulesExample chart />;
}

export function ChartStage(props: StageProps<ChartQuestion>) {
  return <ChoiceStage {...props} />;
}
