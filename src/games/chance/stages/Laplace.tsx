import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { LaplaceQuestion } from "../../../../shared/games/chance";
import { readChanceNotation } from "../../../../shared/games/chance";
import type { StageProps } from "../../../lib/game-registry";
import GameButton from "../../../components/GameButton";
import { StageActionBar } from "../../../components/StageShell";

const INPUT_CLASS =
  "px-3 py-2 text-2xl text-center border-2 border-gray-200 rounded-lg focus:border-brand-400 focus:outline-none";

/** Work out the probability of an event in a one-stage Laplace experiment. */
export default function LaplaceStage({ question, submit, settings }: StageProps<LaplaceQuestion>) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<{
    questionId: number;
    numerator: string;
    denominator: string;
  } | null>(null);
  const firstRef = useRef<HTMLInputElement>(null);

  const notation = readChanceNotation(settings);
  const asFraction = notation === "fraction";

  useEffect(() => {
    firstRef.current?.focus();
  }, [question?.id]);

  if (!question) return null;

  const current =
    draft && draft.questionId === question.id
      ? draft
      : { questionId: question.id, numerator: "", denominator: "" };

  const send = () => {
    const value = current.numerator.trim();
    if (!value) return;
    if (asFraction) {
      submit(`${value}/${current.denominator.trim() || "1"}`);
    } else if (notation === "percent") {
      // "25" means 25 %, so the answer travels as a fraction of a hundred
      submit(`${value.replace(",", ".").replace("%", "").trim()}/100`);
    } else {
      submit(value);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") send();
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <div key={question.id} className="animate-question-in text-center max-w-lg">
        <div className="text-4xl mb-2">{question.icon}</div>
        <p className="text-gray-600 text-lg">{t(question.setupKey, question.params)}</p>
        <p className="text-2xl font-medium text-gray-800 mt-3">
          P({t(question.eventKey, question.params)}) = ?
        </p>
      </div>

      <div className="flex items-center gap-3">
        {asFraction ? (
          <div className="flex flex-col items-center">
            <input
              ref={firstRef}
              type="text"
              inputMode="numeric"
              value={current.numerator}
              onChange={(e) => setDraft({ ...current, numerator: e.target.value })}
              onKeyDown={onKeyDown}
              placeholder={t("games.chance.favourable")}
              className={`w-40 ${INPUT_CLASS}`}
            />
            <div className="w-40 h-0.5 bg-gray-400 my-2" />
            <input
              type="text"
              inputMode="numeric"
              value={current.denominator}
              onChange={(e) => setDraft({ ...current, denominator: e.target.value })}
              onKeyDown={onKeyDown}
              placeholder={t("games.chance.possible")}
              className={`w-40 ${INPUT_CLASS}`}
            />
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input
              ref={firstRef}
              type="text"
              inputMode="decimal"
              value={current.numerator}
              onChange={(e) => setDraft({ ...current, numerator: e.target.value })}
              onKeyDown={onKeyDown}
              placeholder={notation === "percent" ? "25" : "0.25"}
              className={`w-40 ${INPUT_CLASS}`}
            />
            {notation === "percent" && <span className="text-2xl text-gray-500">%</span>}
          </div>
        )}
        <StageActionBar>
          <GameButton onClick={send} disabled={!current.numerator.trim()}>
            {t("game.submit")}
          </GameButton>
        </StageActionBar>
      </div>

      <p className="text-sm text-gray-400 text-center max-w-md">
        {t(`games.chance.laplaceHint.${notation}`)}
      </p>
    </div>
  );
}

export function LaplaceRulesExample() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center gap-2 text-gray-500">
      <div className="text-3xl">🎲</div>
      <p className="text-sm text-gray-400 max-w-sm text-center">
        {t("games.chance.stages.laplace.summary")}
      </p>
      <div className="text-xl font-medium text-gray-700">P(gerade) = 3/6 = 1/2</div>
    </div>
  );
}
