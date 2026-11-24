import { useTranslation } from "react-i18next";
import type { ModellQuestion } from "../../../../shared/games/zuordnung";
import type { StageProps } from "../../../lib/game-registry";
import GameButton from "../../../components/GameButton";
import Icon from "../../../components/icons";

/**
 * The situation in Wortform, sorted into its Zuordnungsmodell (EdM 1.7). The
 * three buttons come shuffled per question, so the answer is never a place.
 */
export default function ModellStage({ question, submit }: StageProps<ModellQuestion>) {
  const { t } = useTranslation();
  if (!question) return null;

  return (
    <div className="flex flex-col items-center gap-6">
      <div key={question.id} className="animate-question-in text-center max-w-lg">
        <Icon name={question.icon} className="mb-2 text-4xl" />
        <p className="text-xl font-medium text-gray-800">{t(question.setupKey, question.params)}</p>
      </div>

      <p className="text-gray-500">{t("games.zuordnung.prompts.modell")}</p>

      <div className="flex flex-wrap justify-center gap-3">
        {question.optionKeys.map((key, index) => (
          <GameButton key={key} onClick={() => submit(String(index))}>
            {t(key)}
          </GameButton>
        ))}
      </div>
    </div>
  );
}

/** The three models as they read on the buttons, with what separates them. */
export function ModellRulesExample() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex flex-wrap justify-center gap-2 text-sm font-medium">
        <span className="rounded-lg bg-game-50 px-3 py-1 text-game-ink">
          {t("games.zuordnung.kinds.proportional")}
        </span>
        <span className="rounded-lg bg-game-100 px-3 py-1 text-game-ink">
          {t("games.zuordnung.kinds.antiproportional")}
        </span>
        <span className="rounded-lg bg-game-200 px-3 py-1 text-game-ink">
          {t("games.zuordnung.kinds.weder")}
        </span>
      </div>
      <p className="text-sm text-gray-400 max-w-sm text-center">
        {t("games.zuordnung.rulesHelp")}
      </p>
    </div>
  );
}
