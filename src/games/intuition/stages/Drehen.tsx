import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { DialQuestion } from "../../../../shared/games/intuition";
import type { StageProps } from "../../../lib/game-registry";
import GameButton from "../../../components/GameButton";
import { StageActionBar } from "../../../components/StageShell";
import { ALPHABET, mostFrequentLetter, shiftText } from "../../../../shared/intuition-cipher";

/**
 * Turn the ring until the letters make words.
 *
 * There is nothing to know here. The text under the ring changes as it turns,
 * and at exactly one setting it turns into German — which the player notices
 * long before anybody says the word "Verschlüsselung". The answer is where the
 * ring was left, so the station is graded on finding it, not on typing it out.
 */
export default function DrehenStage({ question, submit }: StageProps<DialQuestion>) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<{ questionId: number; dial: number } | null>(null);

  if (!question) return null;

  const dial = draft?.questionId === question.id ? draft.dial : 0;
  const turn = (by: number) => setDraft({ questionId: question.id, dial: (dial + by + 26) % 26 });
  // The player turns the ring backwards through the shift the message was made
  // with, so what they see is the message coming apart again.
  const reading = shiftText(question.cipher, -dial);
  const hint = question.withHint ? mostFrequentLetter(question.cipher) : null;

  return (
    <div
      key={question.id}
      className="animate-question-in flex w-full max-w-2xl flex-col items-center gap-5"
    >
      <p className="text-center text-gray-500">{t("games.intuition.dialPrompt")}</p>

      <p className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-4 text-center font-mono text-lg leading-relaxed tracking-wide break-words text-slate-800 sm:text-2xl">
        {reading}
      </p>

      <div className="flex w-full items-center gap-3">
        <button
          onClick={() => turn(-1)}
          aria-label={t("games.intuition.dialBack")}
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 border-gray-200 bg-white text-2xl text-gray-500 transition-all hover:border-game-solid hover:text-game-ink active:scale-90"
        >
          &#8249;
        </button>

        <div className="flex-1 text-center">
          <div className="font-mono text-2xl font-bold text-game-ink">
            {ALPHABET[dial]} &rarr; A
          </div>
          <input
            type="range"
            min={0}
            max={25}
            step={1}
            value={dial}
            onChange={(event) =>
              setDraft({ questionId: question.id, dial: Number(event.target.value) })
            }
            className="mt-2 w-full accent-game-solid"
          />
        </div>

        <button
          onClick={() => turn(1)}
          aria-label={t("games.intuition.dialOn")}
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 border-gray-200 bg-white text-2xl text-gray-500 transition-all hover:border-game-solid hover:text-game-ink active:scale-90"
        >
          &#8250;
        </button>
      </div>

      {hint && (
        <p className="text-sm text-gray-400">{t("games.intuition.dialHint", { letter: hint })}</p>
      )}

      <StageActionBar>
        <GameButton onClick={() => submit(String(dial))}>{t("game.submit")}</GameButton>
      </StageActionBar>
    </div>
  );
}

export function DrehenRulesExample() {
  return (
    <div className="flex flex-col items-center gap-2 font-mono">
      <span className="text-gray-400">GHU NDIIHH LVW NDOW</span>
      <span className="text-gray-300">&darr;</span>
      <span className="text-lg font-bold text-game-ink">DER KAFFEE IST KALT</span>
    </div>
  );
}
