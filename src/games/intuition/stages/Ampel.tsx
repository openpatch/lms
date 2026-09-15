import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { StageProps } from "../../../lib/game-registry";
import { serverTime } from "../../../lib/server-time";
import type { LightRoundExtra } from "../../../../shared/games/intuition";

/**
 * How long after the server turned the light green this device will still
 * believe it just saw it happen.
 *
 * It covers a beat of the room's tick and a slow connection on top. Past that,
 * the light was already green when this device arrived — someone reloaded
 * mid-light — and a reaction measured from *now* would be a reaction to
 * nothing. Those lights are sat out rather than handed a free hundred points.
 */
const FRESH_MS = 800;

/**
 * Wait for green, then hit it. Tap while it is still red and that light is gone.
 *
 * When the light turns green is the server's decision and arrives as a
 * message, so there is nothing on this device that says it in advance — which
 * matters here more than anywhere else in the app, because a station whose
 * answer is "how fast can you react" is one where knowing the moment in
 * advance replaces the whole exercise.
 *
 * The reaction is measured from the moment the green arrived *here*, not from
 * the moment the server sent it. On school wifi the difference between those
 * two is the same size as a reaction time, and counting it would turn the
 * station into a test of the connection.
 */
export default function AmpelStage({ data, sendAction }: StageProps) {
  const { t } = useTranslation();
  const extra = data.extra as unknown as LightRoundExtra;
  /**
   * When green arrived here, or null when this device never saw it turn.
   *
   * Written when the light changes and read when the player taps, so it never
   * takes part in a render: what it holds is a reading of the clock, and a
   * reading of the clock is not something to draw from.
   */
  const greenAt = useRef<number | null>(null);
  /** `ms` is a reaction, null for a false start, undefined for a light this
   *  device arrived too late to react to at all. */
  const [answered, setAnswered] = useState<{ light: number; ms: number | null | undefined } | null>(
    null,
  );

  useEffect(() => {
    const fresh = extra.phase === "go" && serverTime() - extra.since <= FRESH_MS;
    greenAt.current = fresh ? Date.now() : null;
  }, [extra.phase, extra.light, extra.since]);

  const green = extra.phase === "go";
  const done = answered?.light === extra.light;

  const tap = () => {
    if (done) return;
    const since = greenAt.current;

    // Green, but this device never saw it turn — someone reloaded into the
    // middle of a light. There is nothing here to have reacted to, so the
    // light is sat out: nothing is sent, and the server writes it off as a
    // miss when the light closes like any other untouched one.
    if (green && since == null) {
      setAnswered({ light: extra.light, ms: undefined });
      return;
    }

    // Tapping while it is red is a false start, and the server is told so
    // rather than being left to notice that nothing arrived.
    const ms = green && since != null ? Date.now() - since : null;
    setAnswered({ light: extra.light, ms });
    sendAction({ action: "tap", light: extra.light, ms });
  };

  const face = done
    ? answered.ms === undefined
      ? { tone: "bg-slate-400", text: t("games.intuition.lightMissed") }
      : answered.ms == null
        ? { tone: "bg-amber-500", text: t("games.intuition.lightTooEarly") }
        : { tone: "bg-slate-700", text: `${answered.ms} ms` }
    : green
      ? { tone: "bg-emerald-500", text: t("games.intuition.lightGo") }
      : { tone: "bg-rose-500", text: t("games.intuition.lightWait") };

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-4">
      <p className="text-center text-gray-500">{t("games.intuition.lightPrompt")}</p>

      <button
        onPointerDown={tap}
        disabled={done}
        className={`flex aspect-square w-full touch-none items-center justify-center rounded-3xl text-3xl font-bold text-white transition-colors duration-75 select-none disabled:opacity-80 sm:text-4xl ${face.tone}`}
      >
        {face.text}
      </button>

      <p className="text-sm text-gray-400">
        {t("games.intuition.lightNumber", { number: extra.light + 1 })}
      </p>
    </div>
  );
}

export function AmpelRulesExample() {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-20 w-20 place-items-center rounded-2xl bg-rose-500 text-xs font-bold text-white">
        WARTEN
      </div>
      <span className="text-gray-400">&rarr;</span>
      <div className="grid h-20 w-20 place-items-center rounded-2xl bg-emerald-500 text-xs font-bold text-white">
        JETZT!
      </div>
    </div>
  );
}
