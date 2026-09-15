import { useTranslation } from "react-i18next";
import type { DrawQuestion, MultipleChoiceQuestion } from "../../../../shared/games/analysis";
import type { StageReviewProps } from "../../../lib/game-registry";
import { Given, Solution } from "../../../components/review-parts";
import MathTex from "../../../components/Math";

/** Which of the four is f′? */
export function ChoiceReview({ question, answer }: StageReviewProps<MultipleChoiceQuestion>) {
  const chosen = answer ? question.options[Number(answer.answer)] : undefined;
  return (
    <>
      <MathTex tex={`f(x) = ${question.functionLatex}`} className="text-gray-800" />
      <Given answer={answer}>{chosen ? <MathTex tex={chosen} /> : null}</Given>
      {!answer?.correct && (
        <Solution>
          <MathTex tex={question.options[question.correctOptionIndex]} />
        </Solution>
      )}
    </>
  );
}

/**
 * The two drawing stations.
 *
 * There is no "right answer" to print here — the answer was a curve, and it
 * was scored on how close it ran to the real one. So the row says which curve
 * was being asked for and leaves the points to say how near it came; drawing
 * both curves again at the size of a review row would be a smudge.
 */
export function DrawReview({ question, answer, data }: StageReviewProps<DrawQuestion>) {
  const { t } = useTranslation();
  const asked =
    data.stageId === "draw-derivative"
      ? t("games.analysis.drawDerivativePrompt")
      : t("games.analysis.drawGraphPrompt");
  return (
    <>
      <MathTex tex={`f(x) = ${question.functionLatex}`} className="text-gray-800" />
      <p className="text-xs text-gray-500">{asked}</p>
      <Given answer={answer}>
        <span className="text-gray-500">{t("games.analysis.yourDrawing")}</span>
      </Given>
    </>
  );
}
