import { useTranslation } from "react-i18next";
import type { StageProps } from "../../../lib/game-registry";
import { clicksOf } from "../score";

/** The tap stage has no questions — it just counts clicks against a target. */
export default function TapStage({ data, playerId, settings, sendAction }: StageProps) {
  const { t } = useTranslation();
  const clicks = clicksOf(data, playerId);
  const target = Number(settings.targetScore);

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-lg text-gray-500">
        {t("games.example.score", { count: clicks })} / {target}
      </div>
      <button
        onClick={() => sendAction({ action: "click" })}
        className="px-12 py-8 text-2xl font-bold text-white bg-brand-500 rounded-2xl shadow-lg hover:bg-brand-600 active:scale-95 transition-all"
      >
        {t("games.example.click")}
      </button>
    </div>
  );
}
