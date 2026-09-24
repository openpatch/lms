import { useTranslation } from "react-i18next";
import type { SpreadsheetChoiceQuestion } from "../../../../shared/games/spreadsheet";
import type { StageReviewProps } from "../../../lib/game-registry";

export function SpreadsheetReview<Q extends SpreadsheetChoiceQuestion>({
  question,
}: StageReviewProps<Q>) {
  const { t } = useTranslation();
  const answer = question.options[question.answerIndex];
  return (
    <div className="space-y-2">
      <p className="text-gray-600">{t(question.promptKey, question.promptParams)}</p>
      <p className="font-mono font-semibold text-game-ink">
        {question.kind === "chart" ? t(`games.spreadsheet.chartKinds.${answer}`) : answer}
      </p>
    </div>
  );
}
