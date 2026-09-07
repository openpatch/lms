import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ChangeQuestion } from "../../../../shared/games/rational";
import type { StageProps } from "../../../lib/game-registry";
import GameButton from "../../../components/GameButton";
import { StageActionBar } from "../../../components/StageShell";
import NumberLine from "../../../components/NumberLine";

/** A signed value the way it is spoken about: +7 °C, -3 €. */
function signed(value: number, unit: string): string {
  return `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(value)} ${unit}`;
}

/** Follow a change on the number line: place the end state, or name the change. */
export default function ChangeStage({ question, submit }: StageProps<ChangeQuestion>) {
  const { t } = useTranslation();
  const [placed, setPlaced] = useState<{ questionId: number; value: number } | null>(null);
  const [typed, setTyped] = useState<{ questionId: number; value: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const asksChange = question?.ask === "change";

  useEffect(() => {
    if (asksChange) inputRef.current?.focus();
  }, [question?.id, asksChange]);

  if (!question) return null;

  const current = placed?.questionId === question.id ? placed.value : null;
  const draft = typed?.questionId === question.id ? typed.value : "";
  const end = question.changes.reduce((sum, change) => sum + change, question.start);

  const sendTyped = () => {
    if (!draft.trim()) return;
    submit(draft.trim());
  };

  return (
    <div className="flex flex-col items-center w-full gap-6">
      <div key={question.id} className="animate-question-in text-center">
        <div className="text-4xl mb-1">{question.icon}</div>
        <div className="text-gray-500">{t(question.contextKey)}</div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 text-2xl">
        <span className="px-3 py-2 rounded-lg bg-gray-100 text-gray-700">
          {signed(question.start, question.unit)}
        </span>
        {asksChange ? (
          <>
            <span className="text-gray-400">?</span>
            <span className="text-gray-400">&rarr;</span>
            <span className="px-3 py-2 rounded-lg bg-gray-100 text-gray-700">
              {signed(end, question.unit)}
            </span>
          </>
        ) : (
          question.changes.map((change, index) => (
            <span key={index} className="px-3 py-2 rounded-lg bg-brand-50 text-brand-700 font-medium">
              {signed(change, question.unit)}
            </span>
          ))
        )}
      </div>

      <div className="text-gray-500 text-center">
        {t(asksChange ? "games.rational.changeAskChange" : "games.rational.changeAskResult")}
      </div>

      <div className="w-full max-w-2xl">
        <NumberLine
          min={question.lineMin}
          max={question.lineMax}
          minorStep={1}
          precision={1}
          disabled={asksChange}
          onPick={asksChange ? undefined : (value) => setPlaced({ questionId: question.id, value })}
          markers={[
            { value: question.start, latex: String(question.start) },
            ...(current == null ? [] : [{ value: current, latex: String(current), active: true }]),
          ]}
        />
      </div>

      {asksChange ? (
        <div className="flex items-center gap-3">
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            value={draft}
            onChange={(e) => setTyped({ questionId: question.id, value: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && sendTyped()}
            placeholder={question.unit}
            className="w-44 px-3 py-2 text-2xl text-center border-2 border-gray-200 rounded-lg focus:border-brand-400 focus:outline-none"
          />
          <StageActionBar>
            <GameButton onClick={sendTyped} disabled={!draft.trim()}>
              {t("game.submit")}
            </GameButton>
          </StageActionBar>
        </div>
      ) : (
        <StageActionBar>
          <GameButton onClick={() => current != null && submit(String(current))} disabled={current == null}>
            {t("game.submit")}
          </GameButton>
        </StageActionBar>
      )}
    </div>
  );
}

export function ChangeRulesExample() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center gap-3 text-gray-500">
      <div className="flex items-center gap-3 text-xl">
        <span className="px-3 py-1 rounded-lg bg-gray-100 text-gray-700">−3 °C</span>
        <span className="px-3 py-1 rounded-lg bg-brand-50 text-brand-700 font-medium">+7 °C</span>
        <span className="text-gray-400">&rarr;</span>
        <span className="font-bold text-gray-700">+4 °C</span>
      </div>
      <p className="text-sm text-gray-400">{t("games.rational.stages.change.summary")}</p>
    </div>
  );
}
