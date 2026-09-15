import { useTranslation } from "react-i18next";
import type {
  DrawQuestion,
  DrawnPoint,
  MultipleChoiceQuestion,
} from "../../../../shared/games/analysis";
import { readInputMode } from "../../../../shared/games/analysis";
import { evaluateDerivative, evaluateFunction } from "../../../../shared/analysis-functions";
import { asFunctionPoints, oshimaCurve } from "../../../../shared/spline";
import type { StageRoundData } from "../../../../shared/framework";
import type { ClassAnswer, StageReviewProps } from "../../../lib/game-registry";
import { Given, Solution } from "../../../components/review-parts";
import MathTex from "../../../components/Math";
import PlotCanvas, { type PlotPath } from "../../../components/PlotCanvas";

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

/** The curve one player handed in: their strokes, or the spline through the
 *  points they placed — the same two cases the server scores. */
function submittedCurve(raw: string, mode: "points" | "freehand"): DrawnPoint[] {
  let points: DrawnPoint[];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    points = parsed.filter(
      (p): p is DrawnPoint =>
        typeof (p as DrawnPoint)?.x === "number" &&
        typeof (p as DrawnPoint)?.y === "number" &&
        isFinite((p as DrawnPoint).x) &&
        isFinite((p as DrawnPoint).y),
    );
  } catch {
    return [];
  }
  return mode === "freehand" ? points : oshimaCurve(asFunctionPoints(points));
}

/**
 * Every curve the class drew, over the one they were drawing.
 *
 * This is the station where the debrief had the least to say and the most to
 * show: the answers are curves, so the list under the question was a column of
 * point arrays, truncated. Laid over each other they are the lesson instead —
 * the whole class flattening the turning point, or carrying the sign of f′
 * through the maximum. Nothing here is stored for it; the round already holds
 * every drawing.
 */
export function DrawClassAnswers({
  question,
  answers,
  data,
}: {
  question: DrawQuestion;
  answers: ClassAnswer[];
  data: StageRoundData<DrawQuestion>;
}) {
  const { t } = useTranslation();
  const mode = readInputMode(data.settings);
  const derivative = data.stageId === "draw-derivative";

  const drawn: PlotPath[] = answers.flatMap((given) => {
    const points = submittedCurve(given.answer, mode);
    if (points.length < 2) return [];
    // Once per player, so ten identical curves read as ten.
    return Array.from({ length: given.count }, () => ({
      points,
      style: "muted" as const,
      faint: true,
    }));
  });

  return (
    <div className="flex w-full flex-col items-center gap-2">
      <MathTex tex={`f(x) = ${question.functionLatex}`} display className="text-2xl" />
      <p className="text-xs text-gray-400">
        {t(derivative ? "games.analysis.drawDerivativePrompt" : "games.analysis.drawGraphPrompt")}
      </p>
      <PlotCanvas
        xMin={question.xMin}
        xMax={question.xMax}
        yMin={question.yMin}
        yMax={question.yMax}
        curves={[
          ...(derivative
            ? [
                {
                  fn: (x: number) => evaluateFunction(question.functionId, x),
                  style: "reference" as const,
                },
              ]
            : []),
          {
            fn: (x: number) =>
              derivative
                ? evaluateDerivative(question.functionId, x)
                : evaluateFunction(question.functionId, x),
            style: "solution" as const,
          },
        ]}
        paths={drawn}
        // The debrief is a panel inside a page, not a stage with the screen to
        // itself, so the plot keeps to a corner of it.
        reserveRem={46}
        minHeightRem={14}
      />
      <div className="flex items-center gap-3 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="inline-block h-0.5 w-4 rounded bg-gray-400" />
          {t("game.debrief.whatTheySaid")}
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-0.5 w-4 rounded bg-blue-600" />
          {t("games.analysis.solution")}
        </span>
      </div>
    </div>
  );
}
