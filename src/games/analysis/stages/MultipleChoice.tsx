import { useTranslation } from "react-i18next";
import type { MultipleChoiceQuestion } from "../../../../shared/games/analysis";
import type { StageProps } from "../../../lib/game-registry";
import MathTex from "../../../components/Math";

/** Pick f'(x) from four candidates. */
export default function MultipleChoiceStage({
  question,
  submit,
}: StageProps<MultipleChoiceQuestion>) {
  const { t } = useTranslation();
  if (!question) return null;

  return (
    <div className="flex flex-col items-center gap-8">
      <div key={question.id} className="animate-question-in text-center">
        <p className="text-gray-500 mb-3">{t("games.analysis.findDerivative")}</p>
        <div className="text-4xl">
          <MathTex tex={`f(x) = ${question.functionLatex}`} display />
        </div>
      </div>

      <div className="text-gray-500 text-lg">{t("games.analysis.whichIsDerivative")}</div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
        {question.options.map((option, index) => (
          <button
            key={index}
            onClick={() => submit(String(index))}
            className="py-6 px-6 text-xl font-bold text-gray-700 bg-white border-2 border-gray-200 rounded-xl hover:border-brand-400 hover:bg-brand-50 transition-all active:scale-95"
          >
            <MathTex tex={`f'(x) = ${option}`} display />
          </button>
        ))}
      </div>
    </div>
  );
}

export function MultipleChoiceRulesExample() {
  return (
    <div className="flex items-center justify-center gap-3 text-2xl text-gray-500">
      <MathTex tex="f(x) = x^2" />
      <span className="text-gray-400">&rarr;</span>
      <span className="font-bold text-gray-700">
        <MathTex tex="f'(x) = 2x" />
      </span>
    </div>
  );
}
