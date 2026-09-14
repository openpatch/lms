import { useTranslation } from "react-i18next";
import type { LogicQuestion } from "../../../../shared/games/python";
import type { StageProps } from "../../../lib/game-registry";
import CodeBlock, { CodeLine } from "../components/CodeBlock";

/** True or False on the clock — and now and then: where do the brackets go? */
export default function LogicStage({ question, submit }: StageProps<LogicQuestion>) {
  const { t } = useTranslation();
  if (!question) return null;

  if (question.kind === "reading") {
    return (
      <div key={question.id} className="animate-question-in flex w-full max-w-xl flex-col items-center gap-4">
        <p className="text-center text-gray-500">{t("games.python.readingPrompt")}</p>
        <div className="rounded-xl border-2 border-slate-200 bg-slate-50 px-5 py-3 font-mono text-xl text-slate-800">
          <CodeLine text={question.expression} />
        </div>
        <div className="grid w-full grid-cols-1 gap-2">
          {question.options.map((option, index) => (
            <button
              key={index}
              onClick={() => submit(String(index))}
              className="rounded-xl border-2 border-game-200 bg-white px-4 py-3 font-mono text-base text-slate-800 transition-all hover:border-game-solid hover:bg-game-50 active:scale-95 sm:text-lg"
            >
              <CodeLine text={option} />
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div key={question.id} className="animate-question-in flex w-full max-w-xl flex-col items-center gap-5">
      {question.code.length > 0 && <CodeBlock lines={question.code} className="max-w-sm" />}

      <div className="rounded-xl border-2 border-slate-200 bg-slate-50 px-6 py-4 text-center font-mono text-2xl text-slate-800">
        <CodeLine text={question.expression} />
      </div>

      <div className="flex w-full max-w-sm gap-3">
        <button
          onClick={() => submit("true")}
          className="flex-1 rounded-xl bg-emerald-500 px-6 py-4 font-mono text-xl font-bold text-white transition-all hover:bg-emerald-600 active:scale-95"
        >
          True
        </button>
        <button
          onClick={() => submit("false")}
          className="flex-1 rounded-xl bg-rose-500 px-6 py-4 font-mono text-xl font-bold text-white transition-all hover:bg-rose-600 active:scale-95"
        >
          False
        </button>
      </div>
    </div>
  );
}

export function LogicRulesExample() {
  return (
    <div className="flex flex-col items-center gap-2 text-left font-mono text-gray-600">
      <div className="flex items-center gap-3">
        <CodeLine text="True and not False" />
        <span className="text-gray-400">&rarr;</span>
        <span className="font-bold text-emerald-600">True</span>
      </div>
      <div className="flex items-center gap-3">
        <CodeLine text="False or False" />
        <span className="text-gray-400">&rarr;</span>
        <span className="font-bold text-rose-600">False</span>
      </div>
    </div>
  );
}
