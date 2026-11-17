import { useTranslation } from "react-i18next";
import type { EvaQuestion } from "../../../../shared/games/rechner";
import type { StageProps } from "../../../lib/game-registry";
import { evaItemKey, evaOptionKey } from "../labels";

/**
 * Eingabe, Verarbeitung, Ausgabe or Speicherung — or which part does this
 * job. Four big buttons and a clock: a station to get a lesson's vocabulary
 * into the fingers.
 */
export default function EvaStage({ question, submit }: StageProps<EvaQuestion>) {
  const { t } = useTranslation();
  if (!question) return null;

  return (
    <div key={question.id} className="animate-question-in flex w-full max-w-xl flex-col items-center gap-6">
      <p className="text-gray-500">
        {t(question.kind === "eva" ? "games.rechner.evaPrompt" : "games.rechner.partPrompt")}
      </p>
      <p className="text-center text-3xl font-bold text-game-ink sm:text-4xl">{t(evaItemKey(question))}</p>
      <div className="grid w-full grid-cols-2 gap-3">
        {question.options.map((option, index) => (
          <button
            key={option}
            onClick={() => submit(String(index))}
            className="rounded-xl border-2 border-game-200 bg-white px-3 py-5 text-lg font-semibold text-gray-700 transition-all hover:border-game-solid hover:bg-game-50 active:scale-95"
          >
            {t(evaOptionKey(question, option))}
          </button>
        ))}
      </div>
    </div>
  );
}

export function EvaRulesExample() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center gap-2 text-gray-600">
      {[
        ["tastatur", "eingabe"],
        ["prozessor", "verarbeitung"],
        ["lautsprecher", "ausgabe"],
        ["ssd", "speicherung"],
      ].map(([device, role]) => (
        <div key={device} className="flex items-center gap-3">
          <span className="font-semibold">{t(`games.rechner.devices.${device}`)}</span>
          <span className="text-gray-400">&rarr;</span>
          <span className="text-game-ink">{t(`games.rechner.roles.${role}`)}</span>
        </div>
      ))}
    </div>
  );
}
