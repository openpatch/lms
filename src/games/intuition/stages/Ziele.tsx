import { useEffect, useReducer, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { StageProps } from "../../../lib/game-registry";
import { serverTime } from "../../../lib/server-time";
import {
  MIN_REACTION_MS,
  SHRINK_TO,
  type Target,
  type TargetEvent,
  type TargetRoundExtra,
} from "../../../../shared/games/intuition";

/** How often the board is redrawn, and how often what happened is reported. */
const FRAME_MS = 33;
const REPORT_MS = 600;

/** Most targets in one report. Must not exceed the server's own cap. */
const MAX_REPORT = 50;

/** How long a mark stays on the board after the thing it marks. */
const SPARK_MS = 500;
const GHOST_MS = 650;

/**
 * A mark left where something just happened.
 *
 * The board is the only thing a player is looking at in this station, and
 * until now it said nothing: a target that was hit and a target that got away
 * both simply vanished, and the only record was a number below the board that
 * nobody watching the board can read. So the board keeps each one for half a
 * second — where it was, whether it counted, and what it took.
 */
interface Spark {
  key: number;
  x: number;
  y: number;
  r: number;
  kind: "hit" | "early" | "miss" | "stray";
  ms?: number;
  until: number;
}

const SPARK_CLASS: Record<Spark["kind"], string> = {
  hit: "fill-none stroke-emerald-500",
  early: "fill-none stroke-amber-500",
  miss: "fill-none stroke-rose-400",
  stray: "fill-none stroke-slate-300",
};

/**
 * Targets appear, shrink and are gone.
 *
 * The timeline came with the round, so the board runs here rather than being
 * fed a target at a time over the network — thirty devices show the same
 * target at the same moment that way, whatever the wifi is doing. What the
 * device does not do is decide what a hit was worth: it reports how long each
 * target took, in the order the targets came, and the server scores that.
 *
 * Reporting is batched, because four taps a second from thirty players is not
 * something to put on the wire one message at a time.
 */
export default function ZieleStage({ data, sendAction }: StageProps) {
  const { t } = useTranslation();
  const { targets } = data.extra as unknown as TargetRoundExtra;

  /** Target id to the reaction it took, or null for one that got away. */
  const [resolved, setResolved] = useState(() => new Map<number, number | null>());
  /** The same thing, for the report timer to read without going stale. */
  const settled = useRef(resolved);
  const send = useRef(sendAction);
  /** Ticked every frame, so the targets on screen shrink as they age. */
  const [, redraw] = useReducer((n: number) => n + 1, 0);
  /** What the board is still showing about the last half second. */
  const [sparks, setSparks] = useState<Spark[]>([]);
  /** Targets already marked, so a mark is left once and only once. */
  const marked = useRef(new Set<number>());
  const board = useRef<SVGSVGElement>(null);
  const nextKey = useRef(0);

  const mark = (spark: Omit<Spark, "key" | "until">, life: number) => {
    setSparks((previous) => [
      ...previous,
      { ...spark, key: nextKey.current++, until: Date.now() + life },
    ]);
  };

  useEffect(() => {
    settled.current = resolved;
    send.current = sendAction;
  }, [resolved, sendAction]);

  // A target the player never touched has to be written off when it goes, or
  // the report would stall on it and every later hit with it.
  useEffect(() => {
    const timer = setInterval(() => {
      const elapsed = serverTime() - data.startTime;
      setResolved((previous) => {
        let next: Map<number, number | null> | null = null;
        for (const target of targets) {
          if (!previous.has(target.id) && elapsed > target.at + target.life) {
            next ??= new Map(previous);
            next.set(target.id, null);
          }
        }
        return next ?? previous;
      });
      // Marking happens out here: a state updater has to be able to run twice
      // without the board sprouting two marks for the same target.
      for (const target of targets) {
        if (marked.current.has(target.id)) continue;
        if (elapsed <= target.at + target.life) continue;
        marked.current.add(target.id);
        mark({ x: target.x, y: target.y, r: target.r, kind: "miss" }, GHOST_MS);
      }
      // Nothing to animate once a mark is over, and leaving them piles up a
      // round's worth of dead nodes on the board.
      setSparks((previous) => {
        const now = Date.now();
        const left = previous.filter((spark) => spark.until > now);
        return left.length === previous.length ? previous : left;
      });
      redraw();
    }, FRAME_MS);
    return () => clearInterval(timer);
  }, [data.startTime, targets]);

  useEffect(() => {
    /** Everything settled since the last report, still in timeline order. */
    let sentUpTo = 0;
    const flush = () => {
      // Sent in chunks the server will take. It matters more than it looks:
      // a tablet that is locked or switched away from for half a minute comes
      // back with every target since then written off at once, and a report
      // too big to be accepted would be dropped whole — leaving this player's
      // count behind the server's for the rest of the round, which rejects
      // every later hit as out of order.
      while (settled.current.has(sentUpTo)) {
        const events: TargetEvent[] = [];
        while (settled.current.has(sentUpTo) && events.length < MAX_REPORT) {
          events.push({ id: sentUpTo, ms: settled.current.get(sentUpTo) ?? null });
          sentUpTo += 1;
        }
        send.current({ action: "hits", events });
      }
    };
    const timer = setInterval(flush, REPORT_MS);
    // One last report on the way out, so the final seconds still count.
    return () => {
      clearInterval(timer);
      flush();
    };
  }, []);

  const elapsed = serverTime() - data.startTime;
  const live = targets.filter(
    (target) =>
      !resolved.has(target.id) && elapsed >= target.at && elapsed <= target.at + target.life,
  );

  // Counted the way the server counts: a tap nobody could have seen coming is
  // not a hit there, and a board that says otherwise is telling the player
  // their score is wrong.
  let hits = 0;
  let misses = 0;
  let lastMs: number | null = null;
  for (const ms of resolved.values()) {
    if (ms != null && ms >= MIN_REACTION_MS) {
      hits++;
      lastMs = ms;
    } else {
      misses++;
    }
  }

  const hit = (event: React.PointerEvent, target: Target) => {
    // Otherwise the same tap also reaches the board underneath and leaves the
    // mark for a tap that found nothing.
    event.stopPropagation();
    if (resolved.has(target.id)) return;
    const ms = Math.round(elapsed - target.at);
    const early = ms < MIN_REACTION_MS;
    setResolved((previous) => {
      if (previous.has(target.id)) return previous;
      const next = new Map(previous);
      next.set(target.id, ms);
      return next;
    });
    if (!marked.current.has(target.id)) {
      marked.current.add(target.id);
      mark(
        {
          x: target.x,
          y: target.y,
          r: target.r,
          kind: early ? "early" : "hit",
          ms: early ? undefined : ms,
        },
        SPARK_MS,
      );
    }
  };

  /** A tap that found nothing: marked, but nothing else — the round does not
   *  punish it, and pretending otherwise would teach flailing. */
  const strayTap = (event: React.PointerEvent<SVGSVGElement>) => {
    const rect = board.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    mark(
      {
        x: ((event.clientX - rect.left) / rect.width) * 100,
        y: ((event.clientY - rect.top) / rect.height) * 100,
        r: 3,
        kind: "stray",
      },
      SPARK_MS,
    );
  };

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <p className="text-center text-gray-500">{t("games.intuition.targetPrompt")}</p>

      <svg
        ref={board}
        viewBox="0 0 100 100"
        onPointerDown={strayTap}
        // Nothing here is scrolled or zoomed, and a long press on a target
        // should not offer to look it up.
        className="no-callout aspect-square w-full max-w-md touch-none rounded-2xl border-2 border-gray-200 bg-white select-none"
      >
        {/* Under the live targets: a mark is about what just went, and must
            never be in the way of what is there now. */}
        {sparks.map((spark) => (
          <g key={spark.key} className="pointer-events-none">
            <circle
              cx={spark.x}
              cy={spark.y}
              r={spark.r}
              strokeWidth={spark.kind === "stray" ? 0.8 : 1.6}
              className={`${SPARK_CLASS[spark.kind]} ${
                spark.kind === "miss" ? "animate-target-ghost" : "animate-target-spark"
              }`}
            />
            {spark.ms != null && (
              <text
                x={spark.x}
                y={spark.y - spark.r - 2}
                textAnchor="middle"
                className="animate-target-count fill-emerald-600 text-[4px] font-bold"
              >
                {spark.ms}
              </text>
            )}
          </g>
        ))}

        {live.map((target) => {
          const age = (elapsed - target.at) / target.life;
          const r = target.r * (1 - (1 - SHRINK_TO) * age);
          return (
            <g
              key={target.id}
              onPointerDown={(event) => hit(event, target)}
              className="cursor-pointer"
            >
              <circle cx={target.x} cy={target.y} r={r} className="fill-game-solid" />
              <circle
                cx={target.x}
                cy={target.y}
                r={r * 0.55}
                className="fill-white"
                opacity={0.85}
              />
              <circle cx={target.x} cy={target.y} r={r * 0.22} className="fill-game-solid" />
            </g>
          );
        })}
      </svg>

      <p className="flex items-baseline gap-4 text-gray-500">
        <span>
          <span className="text-2xl font-bold text-emerald-600 tabular-nums">{hits}</span>{" "}
          {t("games.intuition.targetHits")}
        </span>
        <span>
          <span className="text-2xl font-bold text-gray-300 tabular-nums">{misses}</span>{" "}
          {t("games.intuition.targetMissed")}
        </span>
        {lastMs != null && <span className="tabular-nums text-gray-400">{lastMs} ms</span>}
      </p>
    </div>
  );
}

export function ZieleRulesExample() {
  return (
    <svg viewBox="0 0 100 100" className="h-32 w-32 rounded-xl border-2 border-gray-200 bg-white">
      <circle cx={38} cy={44} r={16} className="fill-game-solid" />
      <circle cx={38} cy={44} r={9} className="fill-white" opacity={0.85} />
      <circle cx={38} cy={44} r={4} className="fill-game-solid" />
      <circle cx={72} cy={70} r={7} className="fill-game-solid" opacity={0.45} />
      <circle cx={72} cy={70} r={4} className="fill-white" opacity={0.6} />
    </svg>
  );
}
