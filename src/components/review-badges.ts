/**
 * The verdict badge and mark of a review row, shared by every stage that lists
 * what a player got right and wrong — kept out of the component files so the
 * react-refresh rule stays happy.
 */
export const BADGE = {
  correct: "bg-green-100 text-green-700",
  wrong: "bg-red-100 text-red-600",
  missing: "bg-gray-100 text-gray-400",
} as const;

export const MARK = { correct: "✓", wrong: "✗", missing: "–" } as const;

export type VerdictState = keyof typeof BADGE;
