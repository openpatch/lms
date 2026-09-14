import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { StageQuestion } from "../../../../shared/framework";
import type { StageProps } from "../../../lib/game-registry";
import GameButton from "../../../components/GameButton";
import { StageActionBar } from "../../../components/StageShell";
import MathTex from "../../../components/Math";
import TermInput from "../../../components/TermInput";

/** Every typing stage of this game shows a term and takes a term back. */
export interface TermQuestion extends StageQuestion {
  termLatex: string;
  /** Optional line of context above the term — what a formula describes. */
  contextKey?: string;
  icon?: string;
}

export interface TermStageOptions<Q extends TermQuestion> {
  /** i18n key of the instruction above the term. */
  promptKey: string | ((question: Q) => string);
  /** i18n key of the line under the field — what counts as a finished answer. */
  hintKey: string | ((question: Q) => string);
  /** Shown left of the field, usually "=". An empty string leaves it out, for
   *  stages where the player writes the whole statement ("x < 4"). */
  lead?: string | ((question: Q) => string);
}

/**
 * The shared body of collect, expand, factor and binomial: read the term, write
 * the equivalent one into the math field, submit. What differs between them is
 * only the wording and how the server grades the shape of the answer.
 */
export function createTermStage<Q extends TermQuestion>(options: TermStageOptions<Q>) {
  const resolve = (key: TermStageOptions<Q>["promptKey"], question: Q) =>
    typeof key === "function" ? key(question) : key;
  const resolveLead = (lead: NonNullable<TermStageOptions<Q>["lead"]>, question: Q) =>
    typeof lead === "function" ? lead(question) : lead;

  return function TermStage({ question, submit }: StageProps<Q>) {
    const { t } = useTranslation();
    // Tagged with its question, so the next term always starts from an empty field
    const [draft, setDraft] = useState<{ questionId: number; latex: string } | null>(null);

    if (!question) return null;

    const lead = options.lead === undefined ? "=" : resolveLead(options.lead, question);
    const latex = draft?.questionId === question.id ? draft.latex : "";
    const send = () => {
      if (latex.trim() === "") return;
      submit(latex);
    };

    return (
      <div className="flex flex-col items-center gap-6 w-full px-4">
        <p className="text-gray-500 text-center">{t(resolve(options.promptKey, question))}</p>

        {question.contextKey && (
          <p className="text-sm text-game-ink text-center">
            {question.icon && <span className="mr-2">{question.icon}</span>}
            {t(question.contextKey)}
          </p>
        )}

        <div key={question.id} className="animate-question-in w-full">
          <MathTex tex={question.termLatex} display className="text-4xl" />
        </div>

        <div className="flex items-center gap-2 w-full max-w-md">
          {lead !== "" && <MathTex tex={lead} className="text-3xl text-gray-400" />}
          <TermInput
            key={question.id}
            value={latex}
            onChange={(next) => setDraft({ questionId: question.id, latex: next })}
            onSubmit={send}
            ariaLabel={t(resolve(options.promptKey, question))}
          />
        </div>

        <p className="text-sm text-gray-400 text-center max-w-md">
          {t(resolve(options.hintKey, question))}
        </p>

        <StageActionBar>
          <GameButton onClick={send} disabled={latex.trim() === ""}>
            {t("game.submit")}
          </GameButton>
        </StageActionBar>
      </div>
    );
  };
}

/** The little "term → answer" illustration the rules screens share. */
export function TermExamples({ examples }: { examples: [string, string][] }) {
  return (
    <div className="flex flex-col items-center gap-2 text-gray-500">
      {examples.map(([term, result]) => (
        <div key={term} className="flex items-center gap-3 text-xl">
          <MathTex tex={term} />
          <span className="text-gray-400">&rarr;</span>
          <span className="font-bold text-gray-700">
            <MathTex tex={result} />
          </span>
        </div>
      ))}
    </div>
  );
}
