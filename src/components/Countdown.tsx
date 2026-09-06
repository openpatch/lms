import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export default function Countdown({
  endsAt,
  children,
}: {
  endsAt: number;
  children?: React.ReactNode;
}) {
  const { t } = useTranslation();
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    const update = () => {
      const remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setSecondsLeft(remaining);
    };
    update();
    const interval = setInterval(update, 100);
    return () => clearInterval(interval);
  }, [endsAt]);

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="w-full">{children}</div>
      <div className="text-7xl font-bold text-brand-500 tabular-nums">
        {secondsLeft > 0 ? secondsLeft : t("game.go")}
      </div>
    </div>
  );
}
