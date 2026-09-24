import { useTranslation } from "react-i18next";
import type { TurtleQuestion } from "../../../../shared/games/python";
import type { StageProps } from "../../../lib/game-registry";
import { runTurtle } from "../../../../shared/python-turtle";
import CodeBlock from "../components/CodeBlock";
import TurtlePicture from "../components/TurtlePicture";

/** Four pictures, one program. Which one does it draw? */
export default function TurtleStage({ question, submit }: StageProps<TurtleQuestion>) {
  const { t } = useTranslation();
  if (!question) return null;

  return (
    <div key={question.id} className="animate-question-in flex w-full max-w-4xl flex-col gap-4">
      <p className="text-center text-gray-500">{t("games.python.turtlePrompt")}</p>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <CodeBlock lines={question.code} className="sm:w-1/2" />

        <div className="grid grid-cols-2 gap-3 sm:w-1/2">
          {question.options.map((drawing, index) => (
            <button
              key={index}
              onClick={() => submit(String(index))}
              aria-label={t("games.python.turtleOption", { number: index + 1 })}
              className="aspect-square rounded-xl border-2 border-gray-200 bg-white p-2 transition-all hover:border-game-solid hover:bg-game-50 active:scale-95"
            >
              <TurtlePicture drawing={drawing} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const EXAMPLE = runTurtle([
  {
    op: "repeat",
    times: 4,
    variable: "i",
    body: [
      { op: "forward", value: 100 },
      { op: "right", value: 90 },
    ],
  },
]);

export function TurtleRulesExample() {
  return (
    <div className="flex items-center justify-center gap-4">
      <CodeBlock
        lines={["from turtle import *", "", "for i in range(4):", "    forward(100)", "    right(90)"]}
        className="max-w-[16rem]"
      />
      <span className="text-gray-400">&rarr;</span>
      <div className="h-24 w-24 rounded-xl border-2 border-gray-200 p-2">
        <TurtlePicture drawing={EXAMPLE} />
      </div>
    </div>
  );
}
