// Shared contract for stages where cards are dropped into slots
// (probability tree branches, term ↔ graph matching, …).

/** Which slot each card was placed in; null means "still in the tray". */
export type Assignment = (number | null)[];

export function emptyAssignment(cardCount: number): Assignment {
  return Array.from({ length: cardCount }, () => null);
}

/** Places `card` in `slot`, taking it out of wherever it was and evicting
 *  whatever sat in that slot — one card per slot, one slot per card. */
export function place(assignment: Assignment, card: number, slot: number | null): Assignment {
  return assignment.map((current, index) => {
    if (index === card) return slot;
    return slot != null && current === slot ? null : current;
  });
}

/** Reads the answer a client sent. Returns null when it does not describe a
 *  legal assignment for this question — so a stage never trusts the payload. */
export function parseAssignment(
  answer: string,
  cardCount: number,
  slotCount: number,
): Assignment | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(answer);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed) || parsed.length !== cardCount) return null;

  const used = new Set<number>();
  const assignment: Assignment = [];
  for (const raw of parsed) {
    if (raw == null) {
      assignment.push(null);
      continue;
    }
    const slot = Number(raw);
    if (!Number.isInteger(slot) || slot < 0 || slot >= slotCount || used.has(slot)) return null;
    used.add(slot);
    assignment.push(slot);
  }
  return assignment;
}

/** The card in each slot, or null where the slot is still empty. */
export function cardsBySlot(assignment: Assignment, slotCount: number): (number | null)[] {
  const bySlot: (number | null)[] = Array.from({ length: slotCount }, () => null);
  assignment.forEach((slot, card) => {
    if (slot != null && slot < slotCount) bySlot[slot] = card;
  });
  return bySlot;
}

/** 0-100 for how many slots hold the right card — partial credit is the point. */
export function assignmentPoints(matches: boolean[]): number {
  if (matches.length === 0) return 0;
  return Math.round((100 * matches.filter(Boolean).length) / matches.length);
}
