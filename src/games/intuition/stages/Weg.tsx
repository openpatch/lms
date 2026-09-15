import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { RouteQuestion } from "../../../../shared/games/intuition";
import type { StageProps } from "../../../lib/game-registry";
import GameButton from "../../../components/GameButton";
import { StageActionBar } from "../../../components/StageShell";
import Board from "../components/Board";

/**
 * Tap your way from the green dot to the red one.
 *
 * The minutes on a road follow its drawn length only loosely, so the route
 * that looks shortest usually is not — a glance gets you close and reading the
 * numbers gets you the last two minutes. Only the neighbours of wherever the
 * route currently ends can be tapped, so it is impossible to build something
 * that is not a route.
 */
export default function WegStage({ question, submit }: StageProps<RouteQuestion>) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<{ questionId: number; path: number[] } | null>(null);

  if (!question) return null;

  const path = draft?.questionId === question.id ? draft.path : [question.from];
  const head = path[path.length - 1];
  const done = head === question.to;

  const edgeBetween = (a: number, b: number) =>
    question.edges.find(
      (edge) => (edge.a === a && edge.b === b) || (edge.a === b && edge.b === a),
    );

  const minutes = path.reduce(
    (total, node, index) =>
      index === 0 ? 0 : total + (edgeBetween(path[index - 1], node)?.weight ?? 0),
    0,
  );

  const onPath = (index: number) => path.includes(index);
  const reachable = (index: number) => !done && !onPath(index) && edgeBetween(head, index) != null;

  const tap = (index: number) => {
    // Tapping where you already are steps back — the undo nobody has to find.
    if (index === head && path.length > 1) {
      setDraft({ questionId: question.id, path: path.slice(0, -1) });
      return;
    }
    if (reachable(index)) setDraft({ questionId: question.id, path: [...path, index] });
  };

  /** Is this edge a step of the route the player has laid out? */
  const onRoute = (a: number, b: number) =>
    path.some(
      (node, index) =>
        index > 0 &&
        ((path[index - 1] === a && node === b) || (path[index - 1] === b && node === a)),
    );

  return (
    <div key={question.id} className="animate-question-in flex w-full flex-col items-center gap-4">
      <p className="text-center text-gray-500">{t("games.intuition.routePrompt")}</p>

      <Board
        nodes={question.nodes}
        edges={question.edges}
        edgeLabel={(edge) => String(edge.weight ?? "")}
        edgeClass={(_, edge) =>
          onRoute(edge.a, edge.b) ? "stroke-game-solid" : "stroke-slate-200"
        }
        nodeClass={(index) => {
          if (index === question.from) return "fill-emerald-400 stroke-emerald-600";
          if (index === question.to) return "fill-rose-400 stroke-rose-600";
          if (onPath(index)) return "fill-game-solid stroke-game-solid";
          if (reachable(index)) return "fill-white stroke-game-solid";
          return "fill-slate-100 stroke-slate-300";
        }}
        onNodePointerDown={(index) => tap(index)}
      />

      <p className="text-center text-gray-500">
        <span className="text-2xl font-bold text-game-ink tabular-nums">{minutes}</span>{" "}
        {t("games.intuition.routeMinutes")}
      </p>

      <StageActionBar>
        <GameButton onClick={() => submit(JSON.stringify(path))} disabled={!done}>
          {t("game.submit")}
        </GameButton>
      </StageActionBar>
    </div>
  );
}

export function WegRulesExample() {
  return (
    <div className="w-40">
      <Board
        nodes={[
          { x: 12, y: 50 },
          { x: 50, y: 15 },
          { x: 50, y: 85 },
          { x: 88, y: 50 },
        ]}
        edges={[
          { a: 0, b: 1, weight: 9 },
          { a: 1, b: 3, weight: 9 },
          { a: 0, b: 2, weight: 4 },
          { a: 2, b: 3, weight: 5 },
        ]}
        edgeLabel={(edge) => String(edge.weight)}
        edgeClass={(_, edge) =>
          (edge.a === 0 && edge.b === 2) || (edge.a === 2 && edge.b === 3)
            ? "stroke-game-solid"
            : "stroke-slate-200"
        }
        nodeClass={(index) =>
          index === 0
            ? "fill-emerald-400 stroke-emerald-600"
            : index === 3
              ? "fill-rose-400 stroke-rose-600"
              : "fill-slate-100 stroke-slate-300"
        }
      />
    </div>
  );
}
