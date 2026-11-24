import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { GraphQuestion } from "../../../../shared/games/zuordnung";
import type { StageProps } from "../../../lib/game-registry";
import GameButton from "../../../components/GameButton";
import PlotCanvas from "../../../components/PlotCanvas";
import { StageActionBar } from "../../../components/StageShell";
import { curveFunction } from "../components/curve";

const INPUT_CLASS =
  "w-24 px-3 py-2 text-2xl text-center border-2 border-gray-200 rounded-lg focus:border-game-solid focus:outline-none";

/**
 * Graphen lesen und einordnen (EdM 1.1, 1.2): a curve sorted into its
 * Zuordnungsmodell, or a second point worked out from a marked one.
 */
export default function GraphStage({
  question,
  submit,
  revealed,
  data,
  playerId,
}: StageProps<GraphQuestion>) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<{ questionId: number; value: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (question?.task === "ablesen") inputRef.current?.focus();
  }, [question?.id, question?.task]);

  if (!question) return null;

  const current = draft && draft.questionId === question.id ? draft : null;

  function send() {
    if (current?.value.trim()) submit(current.value.trim());
  }

  const plot = (
    <PlotCanvas
      xMin={0}
      yMin={0}
      xMax={question.window.xMax}
      yMax={question.window.yMax}
      readOnly
      curves={[{ fn: curveFunction(question.curve), style: "accent" }]}
      markers={
        question.task === "ablesen"
          ? [
              {
                x: question.given.x,
                y: question.given.y,
                label: `(${question.given.x} | ${question.given.y})`,
                tone: "accent",
              },
            ]
          : []
      }
      reserveRem={question.task === "ablesen" ? 34 : 26}
    />
  );

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {plot}

      {question.task === "klasse" ? (
        <div key={question.id} className="animate-question-in flex flex-col items-center gap-4">
          <p className="text-lg font-medium text-gray-800">
            {t("games.zuordnung.prompts.graphKlasse")}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {question.optionKeys.map((key, index) => (
              <GameButton key={key} onClick={() => submit(String(index))}>
                {t(key)}
              </GameButton>
            ))}
          </div>
        </div>
      ) : (
        <div key={question.id} className="animate-question-in flex flex-col items-center gap-3">
          <p className="text-sm text-gray-500">{t(question.setupKey)}</p>
          <p className="text-lg font-medium text-gray-800">
            {t("games.zuordnung.prompts.graphAblesen", { x: question.askX })}
          </p>
          {revealed ? (
            <span
              className={
                data.answers[playerId]?.[question.id]?.correct
                  ? "font-semibold text-emerald-600"
                  : "font-semibold text-red-500"
              }
            >
              {question.answer} {question.yUnit}
            </span>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  inputMode="decimal"
                  value={current?.value ?? ""}
                  onChange={(e) => setDraft({ questionId: question.id, value: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                  placeholder="?"
                  className={INPUT_CLASS}
                />
                <span className="text-2xl text-gray-500">{question.yUnit}</span>
              </div>
              <StageActionBar>
                <GameButton onClick={send} disabled={!current?.value.trim()}>
                  {t("game.submit")}
                </GameButton>
              </StageActionBar>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** The three shapes a round sorts: Ursprungsgerade, Hyperbel, alles andere. */
export function GraphRulesExample() {
  const { t } = useTranslation();
  return (
    <p className="text-sm text-gray-400 max-w-sm text-center">{t("games.zuordnung.rulesHelpGraph")}</p>
  );
}
