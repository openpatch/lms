import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { DrawQuestion, DrawnPoint } from "../../../../shared/games/analysis";
import { readExtraPoints, readInputMode } from "../../../../shared/games/analysis";
import { evaluateFunction } from "../../../../shared/analysis-functions";
import { asFunctionPoints, oshimaCurve } from "../../../../shared/spline";
import type { StageProps } from "../../../lib/game-registry";
import GameButton from "../../../components/GameButton";
import { StageActionBar } from "../../../components/StageShell";
import MathTex from "../../../components/Math";
import PlotCanvas from "../../../components/PlotCanvas";

export interface DrawStageOptions {
  /** Prompt above the grid. */
  promptKey: string;
  /** Draw f(x) as a dashed reference curve (used when drawing f'(x)). */
  showReference: boolean;
  /** The curve revealed after submitting. */
  solution: (functionId: number, x: number) => number;
}

/**
 * Both drawing stages share this component: draw a curve, submit it, then see
 * your line next to the solution before moving on.
 */
export function createDrawStage(options: DrawStageOptions) {
  return function DrawStage({
    question,
    data,
    playerId,
    submit,
    settings,
  }: StageProps<DrawQuestion>) {
    const { t } = useTranslation();
    const [points, setPoints] = useState<DrawnPoint[]>([]);
    const [clearSignal, setClearSignal] = useState(0);
    // While revealing, the submitted question stays on screen with the solution
    const [revealed, setRevealed] = useState<DrawQuestion | null>(null);

    const mode = readInputMode(settings);
    const extra = readExtraPoints(settings);

    /** Points mode starts with the handles lined up on the x-axis. */
    const startHandles = (q: DrawQuestion): DrawnPoint[] =>
      Array.from({ length: q.handleCount }, (_, index) => ({
        x: q.xMin + ((q.xMax - q.xMin) * index) / (q.handleCount - 1),
        y: Math.min(q.yMax, Math.max(q.yMin, 0)),
      }));

    useEffect(() => {
      if (revealed) return;
      setPoints(question && mode === "points" ? startHandles(question) : []);
      setClearSignal((signal) => signal + 1);
      // startHandles only reads the question it is given
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [question?.id, revealed, mode]);

    const shown = revealed ?? question;
    if (!shown) return null;

    const answer = revealed ? data.answers[playerId]?.[revealed.id] : null;

    const reset = () => {
      setRevealed(null);
      setPoints([]);
      setClearSignal((signal) => signal + 1);
    };

    // The spline the placed points describe — the same curve the server scores
    const splineCurve = mode === "points" ? oshimaCurve(asFunctionPoints(points)) : [];
    const ready =
      mode === "points"
        ? points.length >= shown.handleCount && points.length <= shown.handleCount + extra
        : points.length >= 2;

    // Extra points go in where they belong, so dragging keeps its order
    const addPoint = (point: DrawnPoint) => {
      if (points.length >= shown.handleCount + extra) return;
      const at = points.findIndex((existing) => existing.x > point.x);
      setPoints(at === -1 ? [...points, point] : points.toSpliced(at, 0, point));
    };

    const removePoint = (index: number) => {
      // The points the question started with stay — they carry its key features
      if (points.length <= shown.handleCount) return;
      setPoints(points.filter((_, i) => i !== index));
    };

    return (
      <div className="flex flex-col items-center w-full gap-6">
        <div key={shown.id} className="animate-question-in text-center">
          <p className="text-gray-500 mb-2">{t(options.promptKey)}</p>
          <div className={options.showReference ? "text-2xl text-gray-400" : "text-3xl"}>
            <MathTex tex={`f(x) = ${shown.functionLatex}`} display />
          </div>
          {options.showReference && (
            <p className="text-sm text-gray-400 mt-1">{t("games.analysis.dashedIsFunction")}</p>
          )}
          {!revealed && mode === "points" && (
            <p className="text-sm text-gray-400 mt-2 max-w-lg">
              {t("games.analysis.pointsHint", { count: shown.handleCount })}
              {extra > 0 && ` ${t("games.analysis.pointsExtraHint", { count: extra })}`}
            </p>
          )}
        </div>

        {revealed && answer && (
          <div className="flex items-center gap-4 animate-fade-in">
            <div
              className={`px-4 py-2 rounded-full font-bold text-sm ${
                answer.correct ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
              }`}
            >
              {answer.points} {t("game.pts")}
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <span className="inline-block w-4 h-0.5 bg-gray-400 rounded" />
                {t("games.analysis.yourDrawing")}
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-4 h-0.5 bg-blue-600 rounded" />
                {t("games.analysis.solution")}
              </span>
            </div>
          </div>
        )}

        <PlotCanvas
          xMin={shown.xMin}
          xMax={shown.xMax}
          yMin={shown.yMin}
          yMax={shown.yMax}
          curves={[
            ...(options.showReference
              ? [{ fn: (x: number) => evaluateFunction(shown.functionId, x), style: "reference" as const }]
              : []),
            ...(revealed
              ? [{ fn: (x: number) => options.solution(shown.functionId, x), style: "solution" as const }]
              : []),
          ]}
          paths={
            splineCurve.length > 1
              ? [{ points: splineCurve, style: revealed ? ("muted" as const) : ("accent" as const) }]
              : []
          }
          handles={mode === "points" ? points : undefined}
          onHandlesChange={mode === "points" ? setPoints : undefined}
          onHandleAdd={mode === "points" && extra > 0 && !revealed ? addPoint : undefined}
          onHandleRemove={mode === "points" && extra > 0 && !revealed ? removePoint : undefined}
          readOnly={revealed != null}
          onPointsChange={mode === "freehand" ? setPoints : undefined}
          clearSignal={clearSignal}
          clearLabel={mode === "freehand" ? t("games.analysis.clear") : undefined}
        />

        {revealed ? (
          <StageActionBar>
            <GameButton onClick={reset}>{t("games.analysis.next")}</GameButton>
          </StageActionBar>
        ) : (
          <StageActionBar>
            <GameButton
              onClick={() => {
                if (!ready || !question) return;
                setRevealed(question);
                submit(JSON.stringify(points));
              }}
              disabled={!ready}
            >
              {t("game.submit")}
            </GameButton>
          </StageActionBar>
        )}
      </div>
    );
  };
}
