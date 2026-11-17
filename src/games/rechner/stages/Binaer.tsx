import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { BinaryQuestion } from "../../../../shared/games/rechner";
import type { StageProps } from "../../../lib/game-registry";
import GameButton from "../../../components/GameButton";
import { StageActionBar } from "../../../components/StageShell";

/** A binary number with its subscript, as the hyperbook writes it: 1011₍₂₎. */
export function Binary({ bits, className = "" }: { bits: string; className?: string }) {
  return (
    <span className={`font-mono tabular-nums ${className}`}>
      {bits}
      <sub className="text-[0.45em] text-gray-400">(2)</sub>
    </span>
  );
}

/**
 * Binary to decimal, or decimal to binary.
 *
 * Turning a decimal into binary is done on bit cards, the way the hyperbook's
 * `<binaer-stellenwert>` does it — but without the running total underneath.
 * The cards with their place values over them are the scaffold; the adding up
 * is the player's.
 */
export default function BinaerStage({ question, submit }: StageProps<BinaryQuestion>) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<{ questionId: number; value: string; bits: boolean[] } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (question?.direction === "toDecimal") inputRef.current?.focus();
  }, [question?.id, question?.direction]);

  if (!question) return null;

  const current =
    draft?.questionId === question.id
      ? draft
      : { questionId: question.id, value: "", bits: Array.from({ length: question.bits }, () => false) };
  const bitString = current.bits.map((on) => (on ? "1" : "0")).join("");

  if (question.direction === "toDecimal") {
    const send = () => current.value.trim() && submit(current.value.trim());
    return (
      <div key={question.id} className="animate-question-in flex flex-col items-center gap-6">
        <p className="text-gray-500">{t("games.rechner.toDecimalPrompt")}</p>
        <Binary
          bits={question.value.toString(2).padStart(question.bits, "0")}
          className="text-4xl font-bold tracking-widest text-game-ink sm:text-5xl"
        />
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          aria-label={t("games.rechner.decimal")}
          value={current.value}
          onChange={(e) => setDraft({ ...current, value: e.target.value.replace(/[^0-9]/g, "") })}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={t("games.rechner.decimal")}
          className="w-44 rounded-lg border-2 border-gray-200 px-3 py-2 text-center text-2xl focus:border-game-solid focus:outline-none"
        />
        <StageActionBar>
          <GameButton onClick={send} disabled={!current.value.trim()}>
            {t("game.submit")}
          </GameButton>
        </StageActionBar>
      </div>
    );
  }

  const toggle = (index: number) => {
    const bits = [...current.bits];
    bits[index] = !bits[index];
    setDraft({ ...current, bits });
  };

  return (
    <div key={question.id} className="animate-question-in flex flex-col items-center gap-6">
      <p className="text-gray-500">{t("games.rechner.toBinaryPrompt")}</p>
      <p className="text-5xl font-bold tabular-nums text-game-ink">{question.value}</p>
      <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2">
        {current.bits.map((on, index) => {
          const place = 2 ** (question.bits - 1 - index);
          return (
            <button
              key={index}
              onClick={() => toggle(index)}
              aria-pressed={on}
              aria-label={t("games.rechner.bitCard", { place })}
              className={`flex h-20 w-11 flex-col items-center justify-center gap-1 rounded-lg border-2 font-mono transition-all active:scale-95 sm:w-14 ${
                on ? "border-game-solid bg-game-solid text-white" : "border-gray-200 bg-white text-gray-500 hover:border-game-300"
              }`}
            >
              {question.showPlaceValues && <span className="text-xs tabular-nums opacity-80">{place}</span>}
              <span className="text-2xl font-bold">{on ? 1 : 0}</span>
            </button>
          );
        })}
      </div>
      <Binary bits={bitString} className="text-xl text-gray-500" />
      <StageActionBar>
        <GameButton onClick={() => submit(bitString)}>{t("game.submit")}</GameButton>
      </StageActionBar>
    </div>
  );
}

export function BinaerRulesExample() {
  const cards = [8, 4, 2, 1].map((place) => ({ place, on: place === 8 || place === 2 || place === 1 }));
  return (
    <div className="flex items-center gap-2">
      {cards.map(({ place, on }) => (
        <div
          key={place}
          className={`flex h-14 w-10 flex-col items-center justify-center rounded-lg border-2 font-mono ${
            on ? "border-game-solid bg-game-solid text-white" : "border-gray-200 text-gray-400"
          }`}
        >
          <span className="text-[10px]">{place}</span>
          <span className="font-bold">{on ? 1 : 0}</span>
        </div>
      ))}
      <span className="px-1 text-gray-400">=</span>
      <span className="text-lg text-gray-600">8 + 2 + 1 =</span>
      <span className="text-2xl font-bold text-game-ink">11</span>
    </div>
  );
}
