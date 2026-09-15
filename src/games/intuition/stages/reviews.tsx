import { useTranslation } from "react-i18next";
import type {
  ColorQuestion,
  DialQuestion,
  LampQuestion,
  PixelQuestion,
  RouteQuestion,
  Rgb,
  SwapAnswer,
  SwapQuestion,
  UntangleAnswer,
  UntangleQuestion,
} from "../../../../shared/games/intuition";
import type { PlayerAnswer } from "../../../../shared/types";
import type { ClassAnswer, StageReviewProps } from "../../../lib/game-registry";
import { Given, Missing, Solution } from "../../../components/review-parts";
import { countCrossings, segmentsCross, shortestPath } from "../../../../shared/intuition-graph";
import type { Point } from "../../../../shared/intuition-graph";
import Board from "../components/Board";
import { shiftText } from "../../../../shared/intuition-cipher";
import { css } from "../components/color";
import PixelPicture from "../components/PixelPicture";

/**
 * What a player sees once the round is over.
 *
 * A station built on looking has to be reviewed by looking: the colour you
 * mixed next to the one you were after, the picture you could not place at the
 * size it finally reached, the sentence that was hiding in the letters. A row
 * that only said "0 Punkte" would throw away the best part of the round.
 */

function parse<T>(answer: PlayerAnswer | undefined): T | null {
  if (!answer) return null;
  try {
    return JSON.parse(answer.answer) as T;
  } catch {
    return null;
  }
}

/** The two colours, meeting along the same seam they were mixed across. */
export function FarbeReview({ question, answer }: StageReviewProps<ColorQuestion>) {
  const { t } = useTranslation();
  const mixed = parse<Rgb>(answer);
  return (
    <>
      <div className="flex h-10 w-full max-w-xs overflow-hidden rounded-lg border border-gray-200">
        <div className="flex-1" style={{ backgroundColor: css(question.target) }} />
        {mixed && <div className="flex-1" style={{ backgroundColor: css(mixed) }} />}
      </div>
      <p className="text-xs text-gray-400">
        {mixed ? t("games.intuition.color.seam") : <Missing />}
      </p>
    </>
  );
}

/**
 * Every colour the class mixed, against the one they were mixing.
 *
 * The station is a station about looking, and its debrief was a column of
 * `{"r":118,"g":54,"b":32}`. The swatches say in one glance what no list of
 * triples can: whether the class was too dark, too red, or all over the place.
 */
export function FarbeClassAnswers({
  question,
  answers,
}: {
  question: ColorQuestion;
  answers: ClassAnswer[];
}) {
  const { t } = useTranslation();
  const mixed = answers.flatMap((given) => {
    let colour: Rgb | null = null;
    try {
      const parsed = JSON.parse(given.answer) as Rgb;
      colour =
        typeof parsed?.r === "number" && typeof parsed?.g === "number" && typeof parsed?.b === "number"
          ? parsed
          : null;
    } catch {
      colour = null;
    }
    return colour ? Array.from({ length: given.count }, () => colour as Rgb) : [];
  });

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex flex-col items-center gap-1">
        <div
          className="h-20 w-40 rounded-lg border border-gray-200"
          style={{ backgroundColor: css(question.target) }}
        />
        <span className="text-xs text-gray-400">{t("game.correctAnswer")}</span>
      </div>
      <div className="flex w-full max-w-2xl flex-col items-center gap-1">
        <span className="text-xs text-gray-400">{t("game.debrief.whatTheySaid")}</span>
        <div className="flex flex-wrap justify-center gap-1">
          {mixed.map((colour, index) => (
            <div
              key={index}
              className="h-10 w-10 rounded border border-gray-200"
              style={{ backgroundColor: css(colour) }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function LampenReview({ question, answer }: StageReviewProps<LampQuestion>) {
  const { t } = useTranslation();
  return (
    <>
      <p className="text-sm text-gray-800">
        {t("games.intuition.lampReview", {
          target: question.target,
          lamps: question.values.join(" · "),
        })}
      </p>
      <Given answer={answer}>
        <span className="font-bold tabular-nums">{answer?.answer}</span>
      </Given>
    </>
  );
}

/** The picture at the size it reached — usually the moment it became obvious. */
export function PixelReview({ question, answer }: StageReviewProps<PixelQuestion>) {
  const { t } = useTranslation();
  const chosen = answer ? question.options[Number(answer.answer)] : undefined;
  return (
    <>
      <div className="flex items-center gap-3">
        <PixelPicture glyph={question.glyph} level={24} className="h-14 w-14" />
        <div className="min-w-0 flex-1 space-y-1">
          <Given answer={answer}>{chosen ? t(chosen) : <Missing />}</Given>
          {!answer?.correct && <Solution>{t(question.options[question.answerIndex])}</Solution>}
        </div>
      </div>
    </>
  );
}

/** The sentence that was in there all along. */
export function DrehenReview({ question, answer }: StageReviewProps<DialQuestion>) {
  const dialled = answer ? Number(answer.answer) : null;
  return (
    <>
      <p className="font-mono text-xs break-words text-gray-400">{question.cipher}</p>
      {dialled != null && !answer?.correct && (
        <Given answer={answer}>
          <span className="font-mono text-xs break-words">
            {shiftText(question.cipher, -dialled)}
          </span>
        </Given>
      )}
      <Solution>
        <span className="font-mono text-sm break-words">
          {shiftText(question.cipher, -question.shift)}
        </span>
      </Solution>
    </>
  );
}

/**
 * How a road or a wire is drawn.
 *
 * Green against red is the obvious pairing and the wrong one to lean on: it is
 * the commonest colour blindness there is, and a projector at the back of a
 * classroom flattens both to the same grey. So the two also differ in dash and
 * in weight, and the maps carry a legend naming them.
 */
const LINE = {
  quickest: "stroke-emerald-500 [stroke-width:2.4]",
  detour: "stroke-rose-400 [stroke-dasharray:4_3] [stroke-width:2.4]",
  quiet: "stroke-slate-200",
  clear: "stroke-emerald-400",
  crossing: "stroke-rose-400 [stroke-dasharray:4_3] [stroke-width:2]",
} as const;

/** One line of a map's legend, drawn the way the map draws it. */
function LineKey({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-gray-500">
      <svg viewBox="0 0 24 4" className="h-1 w-6 overflow-visible">
        <line x1="0" y1="2" x2="24" y2="2" strokeWidth={2.4} strokeLinecap="round" className={className} />
      </svg>
      {children}
    </span>
  );
}

/** Which edges of a layout still cross another one. */
function crossingEdges(nodes: Point[], edges: UntangleQuestion["edges"]): boolean[] {
  const crossing = edges.map(() => false);
  for (let i = 0; i < edges.length; i++) {
    for (let j = i + 1; j < edges.length; j++) {
      const a = edges[i];
      const b = edges[j];
      // Edges that share an end meet there by design; that is not a crossing.
      if (a.a === b.a || a.a === b.b || a.b === b.a || a.b === b.b) continue;
      if (!nodes[a.a] || !nodes[a.b] || !nodes[b.a] || !nodes[b.b]) continue;
      if (segmentsCross(nodes[a.a], nodes[a.b], nodes[b.a], nodes[b.b])) {
        crossing[i] = true;
        crossing[j] = true;
      }
    }
  }
  return crossing;
}

/**
 * The layout as it was left, with whatever still crosses marked.
 *
 * "Noch 3 Kreuzungen" is a score, not an answer: it says how well the untangle
 * went and nothing about where it went wrong. The board the player left behind
 * is in the answer, so it goes back on screen with the offending wires in red
 * — which is the one thing worth taking away from a station about seeing.
 */
export function KabelReview({ question, answer }: StageReviewProps<UntangleQuestion>) {
  const { t } = useTranslation();
  const sent = parse<UntangleAnswer>(answer);
  const nodes = Array.isArray(sent?.nodes) ? sent.nodes : null;
  const left = nodes ? countCrossings(nodes, question.edges) : null;
  const crossing = nodes ? crossingEdges(nodes, question.edges) : null;
  return (
    <>
      <p className="text-sm text-gray-800">
        {t("games.intuition.untangleReview", { count: question.startCrossings })}
      </p>
      {nodes && (
        <div className="w-36 space-y-1">
          <Board
            nodes={nodes}
            edges={question.edges}
            edgeClass={(index) => (crossing?.[index] ? LINE.crossing : LINE.clear)}
            nodeClass={() => "fill-white stroke-slate-400"}
          />
          {left != null && left > 0 && (
            <LineKey className={LINE.crossing}>{t("games.intuition.untangleCrossing")}</LineKey>
          )}
        </div>
      )}
      <Given answer={answer}>
        {left === 0
          ? t("games.intuition.untangleClear")
          : t("games.intuition.untangleLeft", { count: left ?? 0 })}
      </Given>
    </>
  );
}

/** The route one player laid out, as node indices. */
function routeOf(raw: string | undefined): number[] | null {
  if (raw == null) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) && parsed.every((node) => typeof node === "number")
      ? (parsed as number[])
      : null;
  } catch {
    return null;
  }
}

/** Does this path run along the edge between `a` and `b`? */
function usesEdge(path: number[], a: number, b: number): boolean {
  return path.some(
    (node, index) =>
      index > 0 &&
      ((path[index - 1] === a && node === b) || (path[index - 1] === b && node === a)),
  );
}

function routeMinutes(question: RouteQuestion, path: number[]): number {
  return path.reduce((total, node, index) => {
    if (index === 0) return 0;
    const edge = question.edges.find(
      (candidate) =>
        (candidate.a === path[index - 1] && candidate.b === node) ||
        (candidate.a === node && candidate.b === path[index - 1]),
    );
    return total + (edge?.weight ?? 0);
  }, 0);
}

/**
 * The route taken, on the map it was taken across.
 *
 * "Du: 17 Minuten · am besten 13" names the gap and hides the detour that
 * caused it. The map costs nothing to draw again — the round carries it — and
 * on it the two routes are one look: green where the quick way went, red where
 * the player's way left it.
 */
export function WegReview({ question, answer }: StageReviewProps<RouteQuestion>) {
  const { t } = useTranslation();
  const path = routeOf(answer?.answer);
  const best = shortestPath({ nodes: question.nodes, edges: question.edges }, question.from, question.to);
  const minutes = path ? routeMinutes(question, path) : null;

  return (
    <>
      <div className="w-36 space-y-1">
        <Board
          nodes={question.nodes}
          edges={question.edges}
          edgeLabel={(edge) => String(edge.weight ?? "")}
          edgeClass={(_, edge) => {
            if (usesEdge(best.path, edge.a, edge.b)) return LINE.quickest;
            return path && usesEdge(path, edge.a, edge.b) ? LINE.detour : LINE.quiet;
          }}
          nodeClass={(index) => {
            if (index === question.from) return "fill-emerald-400 stroke-emerald-600";
            if (index === question.to) return "fill-rose-400 stroke-rose-600";
            return "fill-slate-100 stroke-slate-300";
          }}
        />
        <LineKey className={LINE.quickest}>{t("games.intuition.routeQuickest")}</LineKey>
        {path && path.some((node, i) => i > 0 && !usesEdge(best.path, path[i - 1], node)) && (
          <LineKey className={LINE.detour}>{t("games.intuition.routeYours")}</LineKey>
        )}
      </div>
      <Given answer={answer}>
        {minutes != null ? t("games.intuition.routeTook", { minutes }) : <Missing />}
      </Given>
      {!answer?.correct && <Solution>{t("games.intuition.routeBest", { minutes: question.best })}</Solution>}
    </>
  );
}

/**
 * Which roads the class drove down.
 *
 * Every route laid over the map, with each road carrying the number of players
 * who took it — so the one wrong turn the class shared shows up as a thick
 * line going the long way round, next to the quick way in green. A list of
 * `[0,3,5,7]` arrays says none of that.
 */
export function WegClassAnswers({
  question,
  answers,
}: {
  question: RouteQuestion;
  answers: ClassAnswer[];
}) {
  const { t } = useTranslation();
  const best = shortestPath({ nodes: question.nodes, edges: question.edges }, question.from, question.to);

  // How many players drove down each road.
  const usage = question.edges.map((edge) =>
    answers.reduce((total, given) => {
      const path = routeOf(given.answer);
      return path && usesEdge(path, edge.a, edge.b) ? total + given.count : total;
    }, 0),
  );
  const busiest = Math.max(1, ...usage);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="w-full max-w-sm">
        <Board
          nodes={question.nodes}
          edges={question.edges}
          // Minutes on every road, and beside them how many drove down it —
          // the argument for the quick way needs both halves.
          edgeLabel={(edge) => {
            const index = question.edges.indexOf(edge);
            const minutes = String(edge.weight ?? "");
            return usage[index] > 0 ? `${minutes} (${usage[index]}×)` : minutes;
          }}
          edgeClass={(index, edge) => {
            if (usesEdge(best.path, edge.a, edge.b)) return LINE.quickest;
            if (usage[index] === 0) return LINE.quiet;
            // Three weights are enough to tell a lane from a main road, and the
            // width carries it where the shade alone would not.
            return usage[index] > busiest / 2
              ? "stroke-slate-500 [stroke-width:2.8]"
              : usage[index] > busiest / 4
                ? "stroke-slate-400 [stroke-width:2.1]"
                : "stroke-slate-300";
          }}
          nodeClass={(index) => {
            if (index === question.from) return "fill-emerald-400 stroke-emerald-600";
            if (index === question.to) return "fill-rose-400 stroke-rose-600";
            return "fill-slate-100 stroke-slate-300";
          }}
        />
      </div>
      <div className="flex flex-wrap items-center justify-center gap-4">
        <LineKey className={LINE.quickest}>
          {t("games.intuition.routeBest", { minutes: question.best })}
        </LineKey>
      </div>
    </div>
  );
}

export function NachbarnReview({ question, answer }: StageReviewProps<SwapQuestion>) {
  const { t } = useTranslation();
  const sent = parse<SwapAnswer>(answer);
  return (
    <>
      <p className="font-mono text-sm text-gray-800">{question.values.join("  ")}</p>
      <Given answer={answer}>
        {t("games.intuition.swapUsed", { count: sent?.swaps?.length ?? 0 })}
      </Given>
      {!answer?.correct && (
        <Solution>{t("games.intuition.swapPar", { count: question.minSwaps })}</Solution>
      )}
    </>
  );
}
