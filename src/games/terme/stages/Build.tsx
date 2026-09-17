import { useTranslation } from "react-i18next";
import Icon from "../../../components/icons";
import type { BuildQuestion } from "../../../../shared/games/terme";
import type { StageProps } from "../../../lib/game-registry";
import MathTex from "../../../components/Math";

/** Terme zu Sachsituationen aufstellen (EdM 2.1): which term fits the story? */
export default function BuildStage({ question, submit }: StageProps<BuildQuestion>) {
  const { t } = useTranslation();
  if (!question) return null;

  return (
    <div key={question.id} className="animate-question-in flex flex-col items-center gap-6 w-full max-w-xl px-4">
      <div className="w-full bg-white border border-gray-200 rounded-xl p-5 flex gap-4">
        <Icon name={question.icon} className="text-4xl" />
        <div className="space-y-2">
          <p className="text-gray-700 leading-relaxed">{t(question.contextKey, question.numbers)}</p>
          <p className="text-sm text-game-ink">{t(question.variableKey, question.numbers)}</p>
        </div>
      </div>

      <p className="text-gray-500">{t("games.terme.prompts.build")}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
        {question.options.map((option, index) => (
          <button
            key={option}
            onClick={() => submit(String(index))}
            className="px-4 py-5 bg-white border-2 border-gray-200 rounded-xl hover:border-game-solid hover:bg-game-50 active:scale-95 transition-all"
          >
            <MathTex tex={option} className="text-2xl" />
          </button>
        ))}
      </div>
    </div>
  );
}

export function BuildRulesExample() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center gap-3 text-gray-500">
      <p className="text-center max-w-sm">{t("games.terme.contexts.taxi", { a: 4, b: 2 })}</p>
      <div className="flex items-center gap-3 text-xl">
        <span className="text-gray-400">&rarr;</span>
        <span className="font-bold text-gray-700">
          <MathTex tex="4 + 2x" />
        </span>
      </div>
    </div>
  );
}
