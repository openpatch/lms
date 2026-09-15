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

/** What it should have been. Worth showing only when it was not. */
export function Solution({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  return <ReviewLine label={t("game.correctAnswer")}>{children}</ReviewLine>;
}
