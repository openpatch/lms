import { useTranslation } from "react-i18next";
import type { PlayerAnswer } from "../../shared/types";
import { ReviewLine } from "./RoundReview";

/**
 * The three lines every round-review row is built from.
 *
 * A row says the same three things whatever the game: here is the question,
 * here is what you put, and — when that was not it — here is what it was. Only
 * the middle of those is game-specific enough to be worth writing out per
 * stage, so the frame around it lives here instead of six times over.
 */

/** "Nicht beantwortet", for a question the round ran out on. */
export function Missing() {
  const { t } = useTranslation();
  return <span className="text-gray-400">{t("game.noAnswer")}</span>;
}

/** What this player put. Without `children` it shows the raw answer string. */
export function Given({
  answer,
  children,
}: {
  answer: PlayerAnswer | undefined;
  children?: React.ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <ReviewLine label={t("game.yourAnswer")}>
      {answer ? (children ?? <span className="font-mono">{answer.answer}</span>) : <Missing />}
    </ReviewLine>
  );
}

/**
 * One slot of an answer that was made of several: what was put in it, and what
 * belonged there when that was not it.
 *
 * A station where the answer is four cards in four places cannot say what the
 * player answered in one line, so the rows that tried printed a tick or a
 * cross and nothing else — the one thing a review must never do, since the
 * player is then told they were wrong without being shown what they said.
 */
export function SlotLine({
  label,
  given,
  truth,
  correct,
}: {
  label: React.ReactNode;
  /** What the player put there; omit for a slot left empty. */
  given?: React.ReactNode;
  truth: React.ReactNode;
  correct: boolean;
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
      <span className="shrink-0 text-gray-400">{label}</span>
      <span className={`font-medium ${correct ? "text-gray-700" : "text-rose-500"}`}>
        {given ?? <Missing />}
      </span>
      {!correct && (
        <>
          <span className="text-gray-300">&rarr;</span>
          <span className="font-medium text-emerald-600">{truth}</span>
        </>
      )}
    </div>
  );
}

/** What it should have been. Worth showing only when it was not. */
export function Solution({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  return <ReviewLine label={t("game.correctAnswer")}>{children}</ReviewLine>;
}
