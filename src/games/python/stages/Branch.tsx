import { useTranslation } from "react-i18next";
import type { CodeChoiceQuestion } from "../../../../shared/games/python";
import type { StageProps } from "../../../lib/game-registry";
import CodeBlock from "../components/CodeBlock";

/** Which branch runs? The options are the texts the chain can print. */
export default function BranchStage({ question, submit }: StageProps<CodeChoiceQuestion>) {
  const { t } = useTranslation();
  if (!question) return null;

  return (
    <div key={question.id} className="animate-question-in flex w-full max-w-xl flex-col items-center gap-4">
      <CodeBlock lines={question.code} />

      <p className="text-center text-gray-500">{t("games.python.ask.output")}</p>

      <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
        {question.options.map((option, index) => (
          <button
            key={index}
            onClick={() => submit(String(index))}
            className={`rounded-xl border-2 px-4 py-3 text-lg transition-all hover:scale-[1.02] active:scale-95 ${
              option === ""
                ? "border-gray-200 bg-white italic text-gray-500 hover:border-gray-400"
                : "border-game-200 bg-game-50 font-mono text-game-ink hover:border-game-solid"
            }`}
          >
            {option === "" ? t("games.python.noOutput") : option}
          </button>
        ))}
      </div>
    </div>
  );
}

export function BranchRulesExample() {
  return (
    <CodeBlock
      lines={[
        "punkte = 62",
        "if punkte >= 90:",
        '    print("sehr gut")',
        "elif punkte >= 60:",
        '    print("befriedigend")',
        "else:",
        '    print("nicht bestanden")',
      ]}
      className="max-w-sm"
    />
  );
}
