import { useTranslation } from "react-i18next";
import type { ClassifyQuestion } from "../../../../shared/games/squareroot";
import type { StageProps } from "../../../lib/game-registry";
import MathTex from "../../../components/Math";

const OPTIONS = [
  { value: "natural", labelKey: "games.squareroot.natural", example: "\\sqrt{9}=3", color: "bg-green-500 hover:bg-green-600" },
  { value: "rational", labelKey: "games.squareroot.rational", example: "\\sqrt{\\tfrac14}=\\tfrac12", color: "bg-blue-500 hover:bg-blue-600" },
  { value: "irrational", labelKey: "games.squareroot.irrational", example: "\\sqrt{2}=1.41\\ldots", color: "bg-purple-500 hover:bg-purple-600" },
];

/** Decide whether a root is natural, rational or irrational. */
export default function ClassifyStage({ question, submit }: StageProps<ClassifyQuestion>) {
  const { t } = useTranslation();
  if (!question) return null;

  return (
    <div className="flex flex-col items-center gap-8">
      <div key={question.id} className="animate-question-in">
        <MathTex tex={`\\sqrt{${question.value}}`} display className="text-5xl" />
      </div>

      <div className="text-gray-500 text-lg">{t("games.squareroot.classifyPrompt")}</div>

      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-lg">
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => submit(option.value)}
            className={`flex-1 py-4 px-6 text-lg font-bold text-white rounded-xl transition-all hover:scale-105 active:scale-95 ${option.color}`}
          >
            <div className="flex flex-col items-center gap-1">
              <span>{t(option.labelKey)}</span>
              <MathTex tex={option.example} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export function ClassifyRulesExample() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center gap-2 text-gray-500">
      {OPTIONS.map((option) => (
        <div key={option.value} className="flex items-center gap-3 text-xl">
          <MathTex tex={option.example.split("=")[0]} />
          <span className="text-gray-400">&rarr;</span>
          <span className="font-bold text-gray-700">{t(option.labelKey)}</span>
        </div>
      ))}
    </div>
  );
}
