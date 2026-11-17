import { useTranslation } from "react-i18next";
import type { HexQuestion } from "../../../../shared/games/rechner";
import type { StageProps } from "../../../lib/game-registry";
import { describeHex } from "../labels";

export function Swatch({ code, className = "" }: { code: string; className?: string }) {
  return (
    <span
      className={`inline-block rounded-lg border border-gray-300 ${className}`}
      style={{ backgroundColor: code }}
    />
  );
}

/**
 * The brain box of Lektion 2.2, made into a station: two hex digits per
 * channel, FF is 255, 80 is about half, 00 is none. Which colour is #FF8000 —
 * or which code is this orange?
 */
export default function FarbcodeStage({ question, submit }: StageProps<HexQuestion>) {
  const { t } = useTranslation();
  if (!question) return null;

  const rgbLabel = (code: string) => t("games.rechner.hex.rgb", describeHex(code));

  return (
    <div key={question.id} className="animate-question-in flex w-full max-w-xl flex-col items-center gap-6">
      <p className="text-gray-500">
        {t(question.direction === "code" ? "games.rechner.hex.pickColour" : "games.rechner.hex.pickCode")}
      </p>
      {question.direction === "code" ? (
        <p className="font-mono text-5xl font-bold tracking-wider text-game-ink">{question.target}</p>
      ) : (
        <Swatch code={question.target} className="h-28 w-56" />
      )}
      <div className="grid w-full grid-cols-2 gap-3">
        {question.options.map((code, index) =>
          question.direction === "code" ? (
            <button
              key={code}
              onClick={() => submit(String(index))}
              aria-label={rgbLabel(code)}
              className="h-24 rounded-xl border-4 border-white shadow ring-1 ring-gray-200 transition-transform hover:scale-105 active:scale-95"
              style={{ backgroundColor: code }}
            />
          ) : (
            <button
              key={code}
              onClick={() => submit(String(index))}
              className="rounded-xl border-2 border-game-200 bg-white py-5 font-mono text-2xl font-bold text-gray-700 transition-all hover:border-game-solid hover:bg-game-50 active:scale-95"
            >
              {code}
            </button>
          ),
        )}
      </div>
    </div>
  );
}

export function FarbcodeRulesExample() {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-3 font-mono text-2xl">
        <span className="text-red-600">FF</span>
        <span className="text-green-700">80</span>
        <span className="text-blue-600">00</span>
        <span className="text-gray-400">&rarr;</span>
        <Swatch code="#FF8000" className="h-10 w-16" />
      </div>
      <p className="text-sm text-gray-500">FF = 255 · 80 = 128 · 00 = 0</p>
    </div>
  );
}
