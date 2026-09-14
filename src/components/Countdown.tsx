import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { serverTime } from "../lib/server-time";

/** Seconds still to go, on the server's clock rather than this device's. */
function remainingSeconds(endsAt: number): number {
  return Math.max(0, Math.ceil((endsAt - serverTime()) / 1000));
}

export default function Countdown({
  endsAt,
  children,
}: {
  endsAt: number;
  children?: React.ReactNode;
}) {
  const { t } = useTranslation();
  // Counted out before the first paint: starting at 0 showed "Los!" for a frame
  const [secondsLeft, setSecondsLeft] = useState(() => remainingSeconds(endsAt));

  useEffect(() => {
    const update = () => setSecondsLeft(remainingSeconds(endsAt));
    update();
    const interval = setInterval(update, 100);
    return () => clearInterval(interval);
  }, [endsAt]);

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="w-full">{children}</div>
      <div className="text-7xl font-bold text-game-ink tabular-nums">
        {secondsLeft > 0 ? secondsLeft : t("game.go")}
      </div>
    </div>
  );
}
