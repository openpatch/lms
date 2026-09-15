import { useEffect, useReducer, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { StageProps } from "../../../lib/game-registry";
import { serverTime } from "../../../lib/server-time";
import {
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

  let hits = 0;
  let misses = 0;
  let lastMs: number | null = null;
  for (const ms of resolved.values()) {
    if (ms == null) misses++;
    else {
      hits++;
      lastMs = ms;
    }
  }

  const hit = (target: Target) => {
    setResolved((previous) => {
      if (previous.has(target.id)) return previous;
      const next = new Map(previous);
      next.set(target.id, Math.round(elapsed - target.at));
      return next;
    });
  };

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <p className="text-center text-gray-500">{t("games.intuition.targetPrompt")}</p>

      <svg
        viewBox="0 0 100 100"
        // Nothing here is scrolled or zoomed, and a long press on a target
        // should not offer to look it up.
        className="no-callout aspect-square w-full max-w-md touch-none rounded-2xl border-2 border-gray-200 bg-white select-none"
      >
        {live.map((target) => {
          const age = (elapsed - target.at) / target.life;
          const r = target.r * (1 - (1 - SHRINK_TO) * age);
          return (
            <g key={target.id} onPointerDown={() => hit(target)} className="cursor-pointer">
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
