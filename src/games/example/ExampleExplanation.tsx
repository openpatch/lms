import { useTranslation } from "react-i18next";
import type { GameProps } from "../../lib/game-registry";

interface ExampleGameData {
  currentRound: number;
  totalRounds: number;
  duration: number;
  targetScore: number;
}

export default function ExampleExplanation({ gameData, isHost }: GameProps) {
  const { t } = useTranslation();
  const data = gameData as ExampleGameData;

  return (
    <div className="text-center space-y-4">
      <div className="text-sm font-semibold uppercase text-brand-500">
        {t("games.example.round", { current: data?.currentRound ?? 1, total: data?.totalRounds ?? 1 })}
      </div>
      <h2 className="text-2xl font-bold">{t("games.example.explanation.title")}</h2>
      <p className="text-gray-600 max-w-md mx-auto">
        {t("games.example.explanation.description", { seconds: data?.duration ?? 0, target: data?.targetScore ?? 0 })}
      </p>
      {!isHost && (
        <p className="text-brand-600 font-medium">{t("games.example.explanation.getReady")}</p>
      )}
      {isHost && (
        <p className="text-gray-500 text-sm">{t("games.example.explanation.hostInfo")}</p>
      )}
    </div>
  );
}
