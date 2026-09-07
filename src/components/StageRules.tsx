import { useTranslation } from "react-i18next";
import type { StageRoundData } from "../../shared/framework";
import { getStage, type GameDefinition } from "../lib/game-registry";

export interface StageRulesProps {
  game: GameDefinition;
  gameData: unknown;
  isHost: boolean;
}

/**
 * The rules screen shown before a round starts (and again during the countdown).
 * The rules text is interpolated with the stage's settings, so a stage can write
 * "{{questionsPerRound}} questions in {{duration}} seconds" in its translation.
 */
export default function StageRules({ game, gameData, isHost }: StageRulesProps) {
  const { t } = useTranslation();
  const data = gameData as StageRoundData | null;
  const stage = data ? getStage(game, data.stageId) : undefined;

  if (!data || !stage) {
    return <div className="text-center text-gray-500">{t("common.loading")}</div>;
  }

  const Example = stage.RulesExample;

  return (
    <div className="text-center space-y-4">
      <div className="text-sm font-semibold uppercase text-brand-500">
        {t("game.round", { current: data.currentRound, total: data.totalRounds })}
      </div>
      <h2 className="text-2xl font-bold">{t(stage.nameKey)}</h2>
      <p className="text-gray-600 max-w-md mx-auto">
        {t(stage.rulesKey, { ...data.settings, count: data.questions.length })}
      </p>
      {Example && <Example />}
      {isHost ? (
        <p className="text-gray-500 text-sm">{t("game.hostInfo")}</p>
      ) : (
        <p className="text-brand-600 font-medium">{t("game.getReady")}</p>
      )}
    </div>
  );
}
