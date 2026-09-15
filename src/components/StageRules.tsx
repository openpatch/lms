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
    // `w-full`, so this is the same box on both screens it appears on: the
    // rules screen centres its children as flex items, where a shrink-to-fit
    // box would be as wide as the longest line, and the countdown stretches it
    // to the page. Anything inside that is not centred on its own moved
    // sideways when the round started.
    <div className="w-full text-center space-y-4">
      <div className="text-sm font-semibold uppercase text-game-ink">
        {t("game.round", { current: data.currentRound, total: data.totalRounds })}
      </div>
      <h2 className="text-2xl font-bold">{t(stage.nameKey)}</h2>
      <p className="text-gray-600 max-w-md mx-auto">
        {t(stage.rulesKey, { ...data.settings, count: data.questions.length })}
      </p>
      {/* Whatever shape the station wants its picture to be — a map 160px
          across, a strip of colour, a row of cards — it is a block, and a block
          does not centre itself under `text-center`. Half of them sat against
          the left edge. Centring them here fixes every station at once, and
          keeps each example free to be its own size. */}
      {Example && (
        <div className="flex justify-center">
          <Example />
        </div>
      )}
      {isHost ? (
        <p className="text-gray-500 text-sm">{t("game.hostInfo")}</p>
      ) : (
        <p className="text-game-ink font-medium">{t("game.getReady")}</p>
      )}
    </div>
  );
}
