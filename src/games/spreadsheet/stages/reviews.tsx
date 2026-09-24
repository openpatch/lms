import { useTranslation } from "react-i18next";
import type { SpreadsheetChoiceQuestion } from "../../../../shared/games/spreadsheet";
import type { StageReviewProps } from "../../../lib/game-registry";
import { optionKeyPrefix, optionText } from "./answer-labels";

export function SpreadsheetReview<Q extends SpreadsheetChoiceQuestion>({
  question,
}: StageReviewProps<Q>) {
  const { t } = useTranslation();
  const answer = question.options[question.answerIndex];
  return (
    <div className="space-y-2">
      <p className="text-gray-600">{t(question.promptKey, question.promptParams)}</p>
      {question.formula && (
        <p className="font-mono text-gray-700">
          {question.formula.address}: {question.formula.text}
        </p>
      )}
      <p className={`font-semibold text-game-ink ${optionKeyPrefix(question) ? "" : "font-mono"}`}>
        {optionText(question, answer, t)}
      </p>
    </div>
  );
}
