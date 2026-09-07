import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { TreeQuestion } from "../../../../shared/games/chance";
import type { Assignment } from "../../../../shared/matching";
import { emptyAssignment } from "../../../../shared/matching";
import type { StageProps } from "../../../lib/game-registry";
import GameButton from "../../../components/GameButton";
import { StageActionBar } from "../../../components/StageShell";
import MathTex from "../../../components/Math";
import MatchBoard, { MatchSlot, MatchTray } from "../../../components/MatchBoard";

interface Draft {
  questionId: number;
  assignment: Assignment;
  numerator: string;
  denominator: string;
}

const INPUT_CLASS =
  "w-32 px-2 py-1 text-xl text-center border-2 border-gray-200 rounded-lg focus:border-brand-400 focus:outline-none";

/** A thin line from a node down to its children. */
function Connector() {
  return <div className="w-px h-5 bg-gray-300" />;
}

/** Fill in the second stage of a tree diagram, then apply the path rules. */
export default function TreeStage({ question, submit }: StageProps<TreeQuestion>) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<Draft | null>(null);

  if (!question) return null;

  const current: Draft =
    draft && draft.questionId === question.id
      ? draft
      : {
          questionId: question.id,
          assignment: emptyAssignment(question.cards.length),
          numerator: "",
          denominator: "",
        };

  const allPlaced = current.assignment.filter((slot) => slot != null).length === 4;
  const ready = allPlaced && current.numerator.trim() !== "";

  const send = () => {
    if (!ready) return;
    submit(
      JSON.stringify({
        assignment: current.assignment,
        event: `${current.numerator.trim()}/${current.denominator.trim() || "1"}`,
      }),
    );
  };

  return (
    <div className="flex flex-col items-center w-full gap-5">
      <div key={question.id} className="animate-question-in text-center max-w-xl">
        <div className="text-3xl mb-1">{question.icon}</div>
        <p className="text-gray-600">{t(question.setupKey, question.params)}</p>
      </div>

      <MatchBoard
        cards={question.cards}
        assignment={current.assignment}
        onChange={(assignment) => setDraft({ ...current, assignment })}
      >
        <p className="text-sm text-gray-500">{t("games.chance.treePrompt")}</p>
        <MatchTray className="mb-2" />

        <div className="flex justify-center gap-10">
          {([0, 1] as const).map((first) => (
            <div key={first} className="flex flex-col items-center">
              {/* First stage: given, so the player can read the pattern off it */}
              <span className="text-sm text-gray-500">
                <MathTex tex={question.first[first].latex} />
              </span>
              <Connector />
              <span className="px-3 py-1 rounded-lg bg-gray-100 text-gray-700">
                {t(question.outcomeKeys[first])}
              </span>
              <Connector />
              <div className="flex gap-3">
                {([0, 1] as const).map((second) => (
                  <div key={second} className="flex flex-col items-center gap-1">
                    <MatchSlot slot={first * 2 + second} />
                    <span className="text-xs text-gray-500">
                      {t(question.outcomeKeys[second])}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </MatchBoard>

      <div className="flex flex-col items-center gap-2 border-t border-gray-200 pt-4 w-full max-w-xl">
        <p className="text-gray-700 text-lg">
          P(
          {t(question.eventKey, {
            first: t(question.outcomeKeys[0]),
            second: t(question.outcomeKeys[1]),
          })}
          ) = ?
        </p>
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-center">
            <input
              type="text"
              inputMode="numeric"
              value={current.numerator}
              onChange={(e) => setDraft({ ...current, numerator: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder={t("games.chance.favourable")}
              className={INPUT_CLASS}
            />
            <div className="w-32 h-0.5 bg-gray-400 my-1" />
            <input
              type="text"
              inputMode="numeric"
              value={current.denominator}
              onChange={(e) => setDraft({ ...current, denominator: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder={t("games.chance.possible")}
              className={INPUT_CLASS}
            />
          </div>
          <StageActionBar>
            <GameButton onClick={send} disabled={!ready}>
              {t("game.submit")}
            </GameButton>
          </StageActionBar>
        </div>
        {!allPlaced && <p className="text-sm text-gray-400">{t("games.chance.treeIncomplete")}</p>}
      </div>
    </div>
  );
}

export function TreeRulesExample() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center gap-2 text-gray-500">
      <div className="flex items-center gap-3 text-xl">
        <MathTex tex="\tfrac{3}{5} \cdot \tfrac{2}{4} = \tfrac{3}{10}" />
      </div>
      <p className="text-sm text-gray-400 max-w-sm text-center">
        {t("games.chance.stages.tree.summary")}
      </p>
    </div>
  );
}
