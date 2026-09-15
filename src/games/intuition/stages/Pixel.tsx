import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { PixelQuestion } from "../../../../shared/games/intuition";
import type { StageProps } from "../../../lib/game-registry";
import PixelPicture from "../components/PixelPicture";

/** How many blocks the picture starts with, and the most it ever gets. */
const FIRST = 4;
const LAST = 28;

/**
 * The picture, sharpening.
 *
 * Mounted fresh for every question — that is what the key on it is for — so
 * the clock it reads is the moment this question appeared rather than the
 * start of the round, which is what the station is scored on.
 */
function Reveal({ glyph, stepSeconds }: { glyph: string; stepSeconds: number }) {
  const [level, setLevel] = useState(FIRST);

  useEffect(() => {
    const shownAt = Date.now();
    const step = Math.max(0.2, stepSeconds) * 1000;
    const timer = setInterval(
      () => setLevel(Math.min(LAST, FIRST + Math.floor((Date.now() - shownAt) / step))),
      150,
    );
    return () => clearInterval(timer);
  }, [stepSeconds]);

  return <PixelPicture glyph={glyph} level={level} className="h-48 w-48 sm:h-56 sm:w-56" />;
}

/**
 * A picture that starts as a handful of blocks and sharpens while you look at
 * it. Answering early is worth more, so the question is not "what is it" but
 * "how sure are you already".
 */
export default function PixelStage({ question, submit }: StageProps<PixelQuestion>) {
  const { t } = useTranslation();
  if (!question) return null;

  return (
    <div
      key={question.id}
      className="animate-question-in flex w-full max-w-xl flex-col items-center gap-5"
    >
      <p className="text-center text-gray-500">{t("games.intuition.pixelPrompt")}</p>

      <Reveal key={question.id} glyph={question.glyph} stepSeconds={question.stepSeconds} />

      <div className="grid w-full grid-cols-2 gap-2">
        {question.options.map((option, index) => (
          <button
            key={index}
            onClick={() => submit(String(index))}
            className="rounded-xl border-2 border-game-200 bg-game-50 px-4 py-3 text-lg text-game-ink transition-all hover:scale-[1.02] hover:border-game-solid active:scale-95"
          >
            {t(option)}
          </button>
        ))}
      </div>
    </div>
  );
}

export function PixelRulesExample() {
  return (
    <div className="flex items-center gap-4">
      <PixelPicture glyph="\u{1F355}" level={5} className="h-20 w-20" />
      <span className="text-gray-400">&rarr;</span>
      <PixelPicture glyph="\u{1F355}" level={10} className="h-20 w-20" />
      <span className="text-gray-400">&rarr;</span>
      <PixelPicture glyph="\u{1F355}" level={22} className="h-20 w-20" />
    </div>
  );
}
