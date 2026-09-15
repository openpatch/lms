import type { Rgb } from "../../../../shared/games/intuition";

/** A colour the way CSS wants it. */
export function css({ r, g, b }: Rgb): string {
  return `rgb(${Math.round(r)} ${Math.round(g)} ${Math.round(b)})`;
}
