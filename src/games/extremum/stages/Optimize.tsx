import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { OptimizeQuestion, OptimizeTerm } from "../../../../shared/games/extremum";
import { OPTIMIZE_TERMS, askedTerms } from "../../../../shared/games/extremum";
import type { Assignment } from "../../../../shared/matching";
import { emptyAssignment } from "../../../../shared/matching";
import { evaluate } from "../../../../shared/polynomial";
import type { StageProps } from "../../../lib/game-registry";
import GameButton from "../../../components/GameButton";
import { StageActionBar } from "../../../components/StageShell";
import Icon from "../../../components/icons";
import MathTex from "../../../components/Math";
import MatchBoard, { MatchSlot, MatchTray } from "../../../components/MatchBoard";
import ParameterSliders from "../../../components/ParameterSliders";
import PlotCanvas from "../../../components/PlotCanvas";

interface Draft {
  questionId: number;
  quantity: number | null;
  assignment: Assignment;
  x: number;
}

/** One row of the model: what is being asked for, or what was handed over. */
function ChainRow({
  label,
  // The quantity's buttons wrap to a second line on a phone, and a label
  // centred against two rows of them reads as belonging to neither.
  top = false,
  children,
}: {
  label: string;
  top?: boolean;
  children: React.ReactNode;
}) {
  return (
    <>
      <span className={`text-right text-sm text-gray-500 ${top ? "self-start pt-1.5" : ""}`}>
        {label}
      </span>
      <span className="text-left">{children}</span>
    </>
  );
}

/**
 * Model an extreme value problem, then find its maximum.
 *
 * The whole model is on screen every time — Zielgröße, Extremalbedingung,
 * Nebenbedingung, Zielfunktion — and the question is which of its steps the
 * player has to supply. The rest stand there filled in, which is what makes a
 * one-step question possible at all: the term to pick is a term in *this*
 * chain, and a player who gets it can read on and see where it was going.
 */
export default function OptimizeStage({
  question,
  submit,
  settings,
}: StageProps<OptimizeQuestion>) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<Draft | null>(null);

  if (!question) return null;

  const showGraph = settings.showTargetGraph !== false;
  const terms = askedTerms(question);
  const options = question.quantityOptions;

  // Well away from every context's maximum, so the slider has to be moved
  const startX =
    Math.round((question.xMin + 0.15 * (question.xMax - question.xMin)) / question.step) *
    question.step;

  const current: Draft =
    draft && draft.questionId === question.id
      ? draft
      : {
          questionId: question.id,
          quantity: null,
          assignment: emptyAssignment(question.cards.length),
          x: startX,
        };

  const placed = current.assignment.filter((slot) => slot != null).length;
  const modelled = placed === terms.length && (options == null || current.quantity != null);
  const value = evaluate(question.target, current.x);

  /** What the readout under the slider is called — the player's pick, while
   *  naming it is the question, so the row is not the answer to it. */
  const valueLabel =
    options == null
      ? t(question.quantityKey)
      : current.quantity == null
        ? t("games.extremum.value")
        : t(options[current.quantity]);

  const send = () =>
    submit(
      JSON.stringify({
        quantity: current.quantity,
        assignment: current.assignment,
        x: current.x,
      }),
    );

  const given = (term: OptimizeTerm) => (
    <MathTex tex={question.terms[OPTIMIZE_TERMS.indexOf(term)]} className="text-gray-400" />
  );

  return (
    <div className="flex flex-col items-center w-full gap-4">
      <div key={question.id} className="animate-question-in text-center max-w-xl">
        <Icon name={question.icon} className="mb-1 text-3xl" />
        <p className="text-gray-600">{t(question.contextKey, question.params)}</p>
      </div>

      <MatchBoard
        cards={question.cards.map((latex) => ({ latex }))}
        assignment={current.assignment}
        onChange={(assignment) => setDraft({ ...current, assignment })}
      >
        <p className="text-sm text-gray-500 text-center">
          {t(terms.length > 0 ? "games.extremum.modelPrompt" : "games.extremum.quantityPrompt")}
        </p>
        {terms.length > 0 && <MatchTray className="mb-2" />}

        <div className="grid grid-cols-[auto_1fr] items-center justify-center gap-x-3 gap-y-2">
          <ChainRow label={t("games.extremum.slots.quantity")} top={options != null}>
            {options == null ? (
              <span className="text-gray-400">{t(question.quantityKey)}</span>
            ) : (
              <span className="flex flex-wrap gap-2">
                {options.map((option, index) => (
                  <button
                    key={option}
                    onClick={() => setDraft({ ...current, quantity: index })}
                    className={`rounded-lg border-2 px-3 py-1 text-sm transition-all ${
                      current.quantity === index
                        ? "border-game-solid bg-game-50 text-game-ink"
                        : "border-gray-300 bg-white text-gray-600 hover:border-game-300"
                    }`}
                  >
                    {t(option)}
                  </button>
                ))}
              </span>
            )}
          </ChainRow>

          {OPTIMIZE_TERMS.map((term) => (
            <ChainRow key={term} label={t(`games.extremum.slots.${term}`)}>
              {terms.includes(term) ? (
                <MatchSlot slot={terms.indexOf(term)} className="min-w-[12rem]" />
              ) : (
                given(term)
              )}
            </ChainRow>
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
          {valueLabel} = <span className="font-bold text-game-ink">{value.toFixed(2)}</span>
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
      <div className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1 text-sm">
        <span className="text-right text-gray-400">{t("games.extremum.slots.extremal")}</span>
        <MathTex tex="A = x \cdot y" />
        <span className="text-right text-gray-400">{t("games.extremum.slots.constraint")}</span>
        <span className="rounded-lg border-2 border-dashed border-gray-300 px-3 py-1 text-gray-400">
          ?
        </span>
        <span className="text-right text-gray-400">{t("games.extremum.slots.target")}</span>
        <MathTex tex="A(x) = x\,(40 - 2x)" />
      </div>
      <p className="text-sm text-gray-400 max-w-sm text-center">
        {t("games.extremum.stages.optimize.summary")}
      </p>
    </div>
  );
}
