import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { SwapQuestion } from "../../../../shared/games/intuition";
import type { StageProps } from "../../../lib/game-registry";
import GameButton from "../../../components/GameButton";
import { StageActionBar } from "../../../components/StageShell";

/**
 * Put the cards in order — but only ever swap two that are side by side.
 *
 * The taps are kept, not just the result: the row is a puzzle with a par, and
 * the server replays the taps to see how many it took. Showing the par turns
 * "sort these" into "can you do it in five?", which is the difference between
 * a chore and a round people replay.
 */
export default function NachbarnStage({ question, submit }: StageProps<SwapQuestion>) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<{
    questionId: number;
    row: number[];
    swaps: number[];
  } | null>(null);

  if (!question) return null;

  const state =
    draft?.questionId === question.id ? draft : { row: question.values, swaps: [] as number[] };
  const sorted = state.row.every((value, index) => index === 0 || state.row[index - 1] <= value);

  const swapAt = (at: number) => {
    const row = [...state.row];
    [row[at], row[at + 1]] = [row[at + 1], row[at]];
    setDraft({ questionId: question.id, row, swaps: [...state.swaps, at] });
  };

  return (
    <div
      key={question.id}
      className="animate-question-in flex w-full max-w-xl flex-col items-center gap-6"
    >
      <p className="text-center text-gray-500">{t("games.intuition.swapPrompt")}</p>

      <div className="flex items-center">
        {state.row.map((value, index) => (
          <div key={index} className="flex items-center">
            <div
              className={`grid h-16 w-12 place-items-center rounded-xl border-2 text-xl font-bold tabular-nums transition-colors sm:h-20 sm:w-14 sm:text-2xl ${
                sorted
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                  : "border-game-200 bg-game-50 text-game-ink"
              }`}
            >
              {value}
            </div>
            {index + 1 < state.row.length && (
              <button
                onClick={() => swapAt(index)}
                aria-label={t("games.intuition.swapPair")}
                className="mx-0.5 grid h-8 w-8 place-items-center rounded-full border-2 border-gray-200 bg-white text-gray-500 transition-all hover:border-game-solid hover:text-game-ink active:scale-90 sm:mx-1"
              >
                ⇄
              </button>
            )}
          </div>
        ))}
      </div>

      <p className="text-center text-gray-500">
        <span className="text-2xl font-bold text-game-ink tabular-nums">{state.swaps.length}</span>{" "}
        {t("games.intuition.swapCount", { par: question.minSwaps })}
      </p>

      <StageActionBar>
        {/* Always live: a row the player gave up on still scores for the part
            of it that did come out in order, and a button they cannot press is
            a button that hides those points. */}
        <GameButton onClick={() => submit(JSON.stringify({ swaps: state.swaps }))}>
          {t("game.submit")}
        </GameButton>
      </StageActionBar>
    </div>
  );
}

export function NachbarnRulesExample() {
  return (
    <div className="flex items-center gap-1 font-bold">
      {[12, 31, 7].map((value, index) => (
        <div key={index} className="flex items-center gap-1">
          <div className="grid h-12 w-10 place-items-center rounded-lg border-2 border-game-200 bg-game-50 text-game-ink">
            {value}
          </div>
          {index < 2 && <span className="text-gray-400">⇄</span>}
        </div>
      ))}
    </div>
  );
}
