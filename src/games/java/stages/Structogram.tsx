import { useTranslation } from "react-i18next";
import type { StructogramQuestion } from "../../../../shared/games/java";
import type { StageProps } from "../../../lib/game-registry";
import CodeBlock from "../components/CodeBlock";
import StructogramView from "../components/Structogram";

/**
 * Four Struktogramme, one program. Which diagram says the same thing?
 *
 * The SILP asks for every control structure to be shown on more than one level,
 * so this station is the one place where the player has to move between them:
 * the wrong answers are the diagram with the branches swapped, the one whose
 * test has moved from the head to the foot, and the one whose relation is off
 * by a step.
 */
export default function StructogramStage({ question, submit }: StageProps<StructogramQuestion>) {
  const { t } = useTranslation();
  if (!question) return null;

  return (
    <div key={question.id} className="animate-question-in flex w-full max-w-5xl flex-col gap-4">
      <p className="text-center text-gray-500">{t("games.java.structogramPrompt")}</p>

      {/* The diagrams need the wider half: a Verzweigung splits whatever room it
          gets in two, and a box that has to wrap "summe ← summe + i" over four
          lines is no longer a diagram anyone can read at a glance. */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        <CodeBlock lines={question.code} className="md:w-2/5" />

        <div className="grid grid-cols-2 gap-3 md:w-3/5">
          {question.options.map((diagram, index) => (
            <button
              key={index}
              onClick={() => submit(String(index))}
              className="rounded-xl border-2 border-gray-200 bg-white p-2 transition-all hover:border-game-solid hover:bg-game-50 active:scale-95"
            >
              <StructogramView nodes={diagram} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function StructogramRulesExample() {
  return (
    <div className="flex items-center justify-center gap-4">
      <CodeBlock
        lines={["if (alter >= 18) {", '    IO.println("ja");', "} else {", '    IO.println("nein");', "}"]}
        className="max-w-[16rem]"
      />
      <span className="text-gray-400">&rarr;</span>
      <StructogramView
        className="w-40"
        nodes={[
          {
            kind: "branch",
            condition: "alter >= 18",
            yes: [{ kind: "statement", text: '"ja" ausgeben' }],
            no: [{ kind: "statement", text: '"nein" ausgeben' }],
          },
        ]}
      />
    </div>
  );
}
