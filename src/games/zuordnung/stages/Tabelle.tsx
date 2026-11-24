import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { type TabelleQuestion } from "../../../../shared/games/zuordnung";
import type { StageProps } from "../../../lib/game-registry";
import GameButton from "../../../components/GameButton";
import Icon from "../../../components/icons";
import { StageActionBar } from "../../../components/StageShell";
import DataTable from "../components/DataTable";

const INPUT_CLASS =
  "w-20 px-2 py-1 text-lg text-center border-2 border-game-300 rounded-lg focus:border-game-solid focus:outline-none";

/**
 * A Zuordnungstabelle with one value missing — Quotientengleichheit when the
 * Zuordnung is proportional, Produktgleichheit when it is not (EdM 1.3, 1.6).
 */
export default function TabelleStage({
  question,
  submit,
  revealed,
  data,
  playerId,
}: StageProps<TabelleQuestion>) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<{ questionId: number; value: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [question?.id]);

  if (!question) return null;

  const current =
    draft && draft.questionId === question.id ? draft : { questionId: question.id, value: "" };
  const correct = data.answers[playerId]?.[question.id]?.correct;

  const send = () => {
    if (!current.value.trim()) return;
    submit(current.value.trim());
  };

  const blankCell = revealed ? (
    <span className={correct ? "font-semibold text-emerald-600" : "font-semibold text-red-500"}>
      {question.answer}
    </span>
  ) : (
    <input
      ref={inputRef}
      type="text"
      inputMode="decimal"
      value={current.value}
      onChange={(e) => setDraft({ ...current, value: e.target.value })}
      onKeyDown={(e) => e.key === "Enter" && send()}
      placeholder="?"
      className={INPUT_CLASS}
      aria-label={t(question.blank === "y" ? question.yLabelKey : question.xLabelKey)}
    />
  );

  return (
    <div className="flex flex-col items-center gap-5">
      <div key={question.id} className="animate-question-in text-center max-w-lg">
        <Icon name={question.icon} className="mb-2 text-4xl" />
        <p className="text-lg font-medium text-gray-800">{t(question.setupKey)}</p>
      </div>

      <DataTable
        rows={question.rows}
        xLabelKey={question.xLabelKey}
        yLabelKey={question.yLabelKey}
        xUnit={question.xUnit}
        yUnit={question.yUnit}
        blankCell={blankCell}
      />

      {!revealed && (
        <StageActionBar>
          <GameButton onClick={send} disabled={!current.value.trim()}>
            {t("game.submit")}
          </GameButton>
        </StageActionBar>
      )}

      {!revealed && (
        <p className="text-sm text-gray-400 text-center max-w-md">
          {t(
            question.kind === "proportional"
              ? "games.zuordnung.tabelleHint.proportional"
              : "games.zuordnung.tabelleHint.antiproportional",
          )}
        </p>
      )}
    </div>
  );
}

/** A worked row, the way the Merkblatt in the Arbeitsheft writes it. */
export function TabelleRulesExample() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center gap-2">
      <DataTable
        rows={[
          { x: 4, y: 12 },
          { x: 7, y: null },
        ]}
        xLabelKey="games.zuordnung.axes.minuten"
        yLabelKey="games.zuordnung.axes.wasser"
        xUnit="min"
        yUnit="l"
        blankCell={
          <span className="rounded bg-game-100 px-2 py-0.5 font-semibold text-game-ink">21</span>
        }
      />
      <p className="text-sm text-gray-400">
        {t("games.zuordnung.rulesHelpQuotient", { given: "12 : 4 = 3", applied: "3 · 7 = 21" })}
      </p>
    </div>
  );
}
