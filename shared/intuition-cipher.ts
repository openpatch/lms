// The ring of letters behind the station that asks you to turn one.
//
// Both sides need it: the server makes the message, the client shows what the
// message looks like at whatever the player has currently dialled in.

export const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** Moves every letter along by `shift`; spaces and anything else stay put. */
export function shiftText(text: string, shift: number): string {
  const by = ((shift % 26) + 26) % 26;
  return text.replace(/[A-Z]/g, (letter) => ALPHABET[(ALPHABET.indexOf(letter) + by) % 26]);
}

/** The letter that turns up most often — the crutch, when the host allows it. */
export function mostFrequentLetter(text: string): string | null {
  const counts = new Map<string, number>();
  for (const letter of text) {
    if (!ALPHABET.includes(letter)) continue;
    counts.set(letter, (counts.get(letter) ?? 0) + 1);
  }
  let best: string | null = null;
  for (const [letter, count] of counts) {
    if (best == null || count > counts.get(best)!) best = letter;
  }
  return best;
}
