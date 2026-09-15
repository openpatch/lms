import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { UntangleQuestion } from "../../../../shared/games/intuition";
import type { StageProps } from "../../../lib/game-registry";
import GameButton from "../../../components/GameButton";
import { StageActionBar } from "../../../components/StageShell";
import { countCrossings, segmentsCross, type Point } from "../../../../shared/intuition-graph";
import Board from "../components/Board";

/**
 * Drag the dots until no two wires cross.
 *
 * The count of what is still crossed is on screen the whole time and the wires
 * that cross are the red ones, so a player who has never heard the word
 * "planar" can see whether they are getting warmer. The graph was built in a
 * drawing with no crossings at all, so there is always a way out.
 */
export default function KabelStage({ question, submit }: StageProps<UntangleQuestion>) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<{ questionId: number; nodes: Point[] } | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  if (!question) return null;

  const nodes = draft?.questionId === question.id ? draft.nodes : question.nodes;
  const crossings = countCrossings(nodes, question.edges);

  /** Does this edge cross any other? That is what paints it red. */
  const isCrossed = (index: number) =>
    question.edges.some((other, otherIndex) => {
      if (otherIndex === index) return false;
      const edge = question.edges[index];
      if (
        edge.a === other.a ||
        edge.a === other.b ||
        edge.b === other.a ||
        edge.b === other.b
      ) {
        return false;
      }
      return segmentsCross(nodes[edge.a], nodes[edge.b], nodes[other.a], nodes[other.b]);
    });

  const moveTo = (event: React.PointerEvent) => {
    if (dragging == null || !svgRef.current) return;
    // The board is a 0-100 box however big it is drawn, so where the finger is
    // on the screen becomes where it is on the board with one division.
    const box = svgRef.current.getBoundingClientRect();
    const point = {
      x: ((event.clientX - box.left) / box.width) * 100,
      y: ((event.clientY - box.top) / box.height) * 100,
    };
    const next = [...nodes];
    // Kept inside the box, so a dot can never be dragged off the board.
    next[dragging] = {
      x: Math.max(2, Math.min(98, point.x)),
      y: Math.max(2, Math.min(98, point.y)),
    };
    setDraft({ questionId: question.id, nodes: next });
  };

  // A touch does not always end in a pointerup: iOS takes one away when a
  // system gesture or a notification interrupts it, and only pointercancel
  // arrives. Without this the dot stays stuck to the finger afterwards.
  const release = (event: React.PointerEvent) => {
    if (svgRef.current?.hasPointerCapture(event.pointerId)) {
      svgRef.current.releasePointerCapture(event.pointerId);
    }
    setDragging(null);
  };

  return (
    <div
      key={question.id}
      className="animate-question-in flex w-full flex-col items-center gap-4"
    >
      <p className="text-center text-gray-500">{t("games.intuition.untanglePrompt")}</p>

      <Board
        dragging
        svgRef={svgRef}
        nodes={nodes}
        edges={question.edges}
        edgeClass={(index) =>
          isCrossed(index) ? "stroke-rose-400" : "stroke-emerald-400"
        }
        nodeClass={(index) =>
          dragging === index
            ? "fill-game-solid stroke-game-solid"
            : "fill-game-100 stroke-game-solid"
        }
        onNodePointerDown={(index, event) => {
          event.preventDefault();
          // Captured on the board rather than on the dot, so a finger that
          // slides off the dot keeps dragging it — and so that what is
          // captured is the element the move handler is on.
          svgRef.current?.setPointerCapture(event.pointerId);
          setDragging(index);
        }}
        onPointerMove={moveTo}
        onPointerUp={release}
        onPointerCancel={release}
      />

      <p
        className={`text-xl font-bold tabular-nums ${
          crossings === 0 ? "text-emerald-600" : "text-rose-500"
        }`}
      >
        {crossings === 0
          ? t("games.intuition.untangleClear")
          : t("games.intuition.untangleLeft", { count: crossings })}
      </p>

      <StageActionBar>
        <GameButton onClick={() => submit(JSON.stringify({ nodes }))}>
          {t("game.submit")}
        </GameButton>
      </StageActionBar>
    </div>
  );
}

export function KabelRulesExample() {
  const nodes = [
    { x: 15, y: 15 },
    { x: 85, y: 15 },
    { x: 15, y: 85 },
    { x: 85, y: 85 },
  ];
  return (
    <div className="w-40">
      <Board
        nodes={nodes}
        edges={[
          { a: 0, b: 3 },
          { a: 1, b: 2 },
        ]}
        edgeClass={() => "stroke-rose-400"}
      />
    </div>
  );
}
