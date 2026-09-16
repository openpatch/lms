import type { RobotCell, RobotFacing } from "../../../../shared/games/java";
import { sameCell } from "../../../../shared/games/java";

/** The arrow a robot looking this way carries, and the edge of its square it
 *  sits on — the edge it is looking at. In a corner it reads as a mark of its
 *  own; on the edge it reads as which way the robot is about to go. */
const ARROW: Record<RobotFacing, { glyph: string; edge: string }> = {
  north: { glyph: "▲", edge: "top-0 left-1/2 -translate-x-1/2" },
  east: { glyph: "▶", edge: "right-0 top-1/2 -translate-y-1/2" },
  south: { glyph: "▼", edge: "bottom-0 left-1/2 -translate-x-1/2" },
  west: { glyph: "◀", edge: "left-0 top-1/2 -translate-y-1/2" },
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

          // A square's contents are drawn on top of it, never inside its
          // layout: the robot used to sit above its own arrow, which is two
          // lines in a box one line high, and on the smaller boards — the four
          // routes side by side, the thumbnail in the debrief — that pushed the
          // squares out of line. Nothing in here can change the size of the
          // square it is in any more.
          //
          // The glyphs are sized in `cqw`, a share of the square's own width,
          // because this same grid is drawn at 60px a square while it is being
          // played and at 20 in the debrief, and one font size cannot serve
          // both. The arrow sits in the corner rather than underneath.
          const marker = (glyph: string, arrow?: RobotFacing) => (
            <>
              {/* Under half the square: an emoji draws taller than its own font
                  size, so anything nearer the edge clips at the top. */}
              <span className="text-[46cqw] leading-none">{glyph}</span>
              {arrow && (
                <span
                  className={`absolute ${ARROW[arrow].edge} text-[26cqw] leading-none text-game-ink/60`}
                >
                  {ARROW[arrow].glyph}
                </span>
              )}
            </>
          );

          const content = isStart
            ? marker("🤖", facing)
            : isAnswer && answerFacing
              ? marker("🏁", answerFacing)
              : isAnswer
                ? marker("🏁")
                : step != null
                  ? (
                      <span className="text-[42cqw] leading-none font-semibold text-game-ink/50">
                        {step}
                      </span>
                    )
                  : null;

          const className =
            `@container relative grid aspect-square place-items-center overflow-hidden ` +
            `rounded-lg border-2 transition-colors ${tone}`;

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
