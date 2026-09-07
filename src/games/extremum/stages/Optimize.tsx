import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { OptimizeQuestion } from "../../../../shared/games/extremum";
import type { Assignment } from "../../../../shared/matching";
import { emptyAssignment } from "../../../../shared/matching";
import { evaluate } from "../../../../shared/polynomial";
import type { StageProps } from "../../../lib/game-registry";
import GameButton from "../../../components/GameButton";
import { StageActionBar } from "../../../components/StageShell";
import MathTex from "../../../components/Math";
import MatchBoard, { MatchSlot, MatchTray } from "../../../components/MatchBoard";
import ParameterSliders from "../../../components/ParameterSliders";
import PlotCanvas from "../../../components/PlotCanvas";

interface Draft {
  questionId: number;
  assignment: Assignment;
  x: number;
}

/** Model an extreme value problem, then find its maximum. */
export default function OptimizeStage({
  question,
  submit,
  settings,
}: StageProps<OptimizeQuestion>) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<Draft | null>(null);

  if (!question) return null;

  const showGraph = settings.showTargetGraph !== false;

  // Well away from every context's maximum, so the slider has to be moved
  const startX =
    Math.round((question.xMin + 0.15 * (question.xMax - question.xMin)) / question.step) *
    question.step;

  const current: Draft =
    draft && draft.questionId === question.id
      ? draft
      : {
          questionId: question.id,
          assignment: emptyAssignment(question.cards.length),
          x: startX,
        };

  const modelled = current.assignment.filter((slot) => slot != null).length === 2;
  const value = evaluate(question.target, current.x);

  const send = () => submit(JSON.stringify({ assignment: current.assignment, x: current.x }));

  return (
    <div className="flex flex-col items-center w-full gap-4">
      <div key={question.id} className="animate-question-in text-center max-w-xl">
        <div className="text-3xl mb-1">{question.icon}</div>
        <p className="text-gray-600">{t(question.contextKey, question.params)}</p>
      </div>

      <MatchBoard
        cards={question.cards.map((latex) => ({ latex }))}
        assignment={current.assignment}
        onChange={(assignment) => setDraft({ ...current, assignment })}
      >
        <p className="text-sm text-gray-500">{t("games.extremum.modelPrompt")}</p>
        <MatchTray className="mb-2" />
        <div className="flex flex-wrap justify-center gap-6">
          {(["constraint", "target"] as const).map((slot, index) => (
            <div key={slot} className="flex flex-col items-center gap-1">
              <span className="text-sm text-gray-500">{t(`games.extremum.slots.${slot}`)}</span>
              <MatchSlot slot={index} className="min-w-[12rem]" />
            </div>
          ))}
        </div>
      </MatchBoard>

      <div className="w-full max-w-4xl border-t border-gray-200 pt-3 flex flex-col items-center gap-2">
        <p className="text-sm text-gray-500">{t("games.extremum.optimizePrompt")}</p>

        {showGraph && (
          <PlotCanvas
            xMin={question.xMin}
            xMax={question.xMax}
            yMin={question.yMin}
            yMax={question.yMax}
            curves={[{ fn: (x) => evaluate(question.target, x), style: "solution" }]}
            markers={[{ x: current.x, y: value }]}
            reserveRem={46}
            minHeightRem={18}
          />
        )}

        <ParameterSliders
          parameters={[
            { latex: "x", min: question.xMin, max: question.xMax, step: question.step },
          ]}
          values={[current.x]}
          onChange={([x]) => setDraft({ ...current, x })}
        />

        <p className="text-lg text-gray-700">
          {t(question.quantityKey)} ={" "}
          <span className="font-bold text-brand-600">{value.toFixed(2)}</span>
        </p>

        <StageActionBar>
          <GameButton onClick={send} disabled={!modelled}>
            {t("game.submit")}
          </GameButton>
        </StageActionBar>
        {!modelled && <p className="text-sm text-gray-400">{t("games.extremum.modelIncomplete")}</p>}
      </div>
    </div>
  );
}

export function OptimizeRulesExample() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center gap-2 text-gray-500">
      <div className="flex items-center gap-3 text-lg">
        <MathTex tex="2x + y = 40" />
        <span className="text-gray-400">&rarr;</span>
        <MathTex tex="A(x) = x\,(40 - 2x)" />
      </div>
      <p className="text-sm text-gray-400 max-w-sm text-center">
        {t("games.extremum.stages.optimize.summary")}
      </p>
    </div>
  );
}
