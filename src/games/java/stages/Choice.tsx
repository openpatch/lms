import { useTranslation } from "react-i18next";
import type { CodeChoiceQuestion } from "../../../../shared/games/java";
import type { StageProps } from "../../../lib/game-registry";
import CodeBlock from "../components/CodeBlock";

/**
 * Two stations offer the answer instead of asking for it: the branch station,
 * where the options are the texts the chain can print, and the type station,
 * where `9` and `9.0` are two different answers and typing would hide the
 * difference the question is about.
 */
export default function ChoiceStage({ question, submit }: StageProps<CodeChoiceQuestion>) {
  const { t } = useTranslation();
  if (!question) return null;

  return (
    <div
      key={question.id}
      className="animate-question-in flex w-full max-w-xl flex-col items-center gap-4"
    >
      {question.code.length > 0 && <CodeBlock lines={question.code} />}

      <p className="text-center text-gray-500">
        {t(question.promptKey, {
          what: question.promptArg ? t(`games.java.typeCase.${question.promptArg}`) : "",
        })}
      </p>

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
            {option === "" ? t("games.java.noOutput") : option}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ChoiceRulesExample() {
  return (
    <CodeBlock
      lines={[
        "void main() {",
        "    int punkte = 62;",
        "    if (punkte >= 90) {",
        '        IO.println("sehr gut");',
        "    } else if (punkte >= 60) {",
        '        IO.println("befriedigend");',
        "    } else {",
        '        IO.println("nicht bestanden");',
        "    }",
        "}",
      ]}
      className="max-w-sm"
    />
  );
}

export function TypesRulesExample() {
  return (
    <div className="flex flex-col items-center gap-3">
      <CodeBlock
        lines={["int ganz = 7;", "double komma = 2.0;", "IO.println(ganz + komma);"]}
        className="max-w-xs"
      />
      <div className="flex items-center gap-3 text-gray-500">
        <span>&rarr;</span>
        <span className="rounded-lg border-2 border-gray-200 px-3 py-1 font-mono text-lg text-gray-700">
          9.0
        </span>
      </div>
    </div>
  );
}
