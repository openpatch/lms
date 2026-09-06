import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { GameProps } from "../../lib/game-registry";

interface ExampleGameData {
  currentRound: number;
  totalRounds: number;
  duration: number;
  targetScore: number;
  clicks: Record<string, number>;
  startTime: number;
  finished: boolean;
}

export default function ExampleGame({ gameData, isHost, playerId, sendMessage }: GameProps) {
  const { t } = useTranslation();
  const data = gameData as ExampleGameData;
  const [timeLeft, setTimeLeft] = useState(0);

  const myClicks = data?.clicks?.[playerId] ?? 0;
  const target = data?.targetScore ?? 0;

  useEffect(() => {
    if (!data || data.finished) return;
    const update = () => {
      const elapsed = (Date.now() - data.startTime) / 1000;
      const remaining = Math.max(0, data.duration - elapsed);
      setTimeLeft(Math.ceil(remaining));
    };
    update();
    const interval = setInterval(update, 100);
    return () => clearInterval(interval);
  }, [data]);

  if (!data) {
    return <div className="text-center text-gray-500">{t("common.loading")}</div>;
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-sm font-semibold uppercase text-brand-500">
        {t("games.example.round", { current: data.currentRound, total: data.totalRounds })}
      </div>
      <div className="text-3xl font-semibold text-gray-600">
        {t("games.example.timeLeft", { seconds: timeLeft })}
      </div>
      <div className="text-lg text-gray-500">
        {t("games.example.score", { count: myClicks })} / {target}
      </div>
      {!isHost && (
        <button
          onClick={() => sendMessage({ action: "click" })}
          className="px-12 py-8 text-2xl font-bold text-white bg-brand-500 rounded-2xl shadow-lg hover:bg-brand-600 active:scale-95 transition-all"
        >
          {t("games.example.click")}
        </button>
      )}
      {isHost && (
        <div className="text-gray-500 text-center">
          <p>Schüler:innen klicken, um Punkte zu sammeln.</p>
          <p className="text-sm mt-2">Du bist der Host — beobachte das Spiel.</p>
        </div>
      )}
    </div>
  );
}
