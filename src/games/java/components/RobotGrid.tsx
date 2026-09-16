import type { RobotCell, RobotFacing } from "../../../../shared/games/java";
import { sameCell } from "../../../../shared/games/java";

/** The arrow a robot looking this way carries. */
const ARROW: Record<RobotFacing, string> = {
  north: "↑",
  east: "→",
  south: "↓",
  west: "←",
};

export interface RobotGridProps {
  width: number;
  height: number;
  start: RobotCell;
  facing: RobotFacing;
  /** The square the player has picked, while they are picking it. */
  picked?: RobotCell | null;
  /** Makes the squares clickable. Without it the grid is a picture. */
  onPick?: (cell: RobotCell) => void;
  /** Review only: every square the robot stood on, in order. */
  path?: RobotCell[];
  /** Review only: where it actually ended up. */
  answer?: RobotCell | null;
  /** Review only: which way it was looking when it got there. */
  answerFacing?: RobotFacing;
}

/**
 * The floor the robot drives on.
 *
 * One drawing serves the question and the review, because they are the same
 * picture with more of it filled in: while the round runs it shows where the
 * robot set off from and what the player has picked, and afterwards the route
 * it actually took, numbered, so a wrong answer is read as "it turned here"
 * rather than as a red square.
 */
export default function RobotGrid({
  width,
  height,
  start,
  facing,
  picked,
  onPick,
  path,
  answer,
  answerFacing,
}: RobotGridProps) {
  /** Which step of the route stood here — 1 is the first move away from start. */
  const stepAt = (cell: RobotCell): number | null => {
    if (!path) return null;
    const at = path.findIndex((step) => sameCell(step, cell));
    return at <= 0 ? null : at;
  };

  return (
    <div
      className="grid w-full max-w-sm gap-1 rounded-xl bg-gray-100 p-2"
      style={{ gridTemplateColumns: `repeat(${width}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: height }, (_, y) =>
        Array.from({ length: width }, (_, x) => {
          const cell = { x, y };
          const isStart = sameCell(cell, start);
          const isPicked = picked != null && sameCell(cell, picked);
          const isAnswer = answer != null && sameCell(cell, answer);
          const step = stepAt(cell);
          const onRoute = step != null || (path != null && isStart);

          const tone = isAnswer
            ? "border-emerald-500 bg-emerald-50"
            : isPicked
              ? // In the review a pick that is not the answer is a wrong turn;
                // while the round runs it is simply the square in hand.
                path
                ? "border-rose-400 bg-rose-50"
                : "border-game-solid bg-game-50"
              : onRoute
                ? "border-game-200 bg-game-50/60"
                : "border-gray-200 bg-white";

          const content = isStart ? (
            <span className="flex flex-col items-center leading-none">
              <span className="text-lg">🤖</span>
              <span className="text-xs text-gray-500">{ARROW[facing]}</span>
            </span>
          ) : isAnswer && answerFacing ? (
            <span className="flex flex-col items-center leading-none">
              <span className="text-lg">🏁</span>
              <span className="text-xs text-gray-500">{ARROW[answerFacing]}</span>
            </span>
          ) : step != null ? (
            <span className="text-xs font-semibold text-game-ink/50">{step}</span>
          ) : null;

          const className = `grid aspect-square place-items-center rounded-lg border-2 transition-colors ${tone}`;

          return onPick ? (
            <button
              key={`${x},${y}`}
              onClick={() => onPick(cell)}
              className={`${className} hover:border-game-solid`}
            >
              {content}
            </button>
          ) : (
            <div key={`${x},${y}`} className={className}>
              {content}
            </div>
          );
        }),
      )}
    </div>
  );
}
