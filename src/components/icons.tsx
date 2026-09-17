import type { ReactNode } from "react";
import { type IconName } from "../../shared/icons";

/**
 * The site's icons, drawn here rather than typed as emoji.
 *
 * An emoji is a character, and what a character looks like is the reader's
 * operating system's business: ☕ is a white mug on one device and a brown one
 * on another, ⛰️ is flat on Windows and shaded on a Mac, and a few of them are
 * a tofu box on a school laptop that never got a font update. A game's icon is
 * on the projector and on thirty devices at once, so all thirty should be
 * looking at the same thing.
 *
 * These are line drawings on a 24x24 grid: one stroke weight, `currentColor`,
 * and sized in `em` so that a call site keeps saying `text-3xl` and gets an
 * icon that size. Nothing is loaded and nothing ships as a file.
 *
 * `Icon` falls back to printing the name. That is deliberate and load-bearing:
 * four games are named by a mathematical symbol — ∫, √, ½, x² — which is type,
 * not a picture, and renders the same everywhere already.
 */
// Typed by the shared list, so a name with no drawing here — or a drawing
// with no name there — does not compile.
const ICONS: Record<IconName, ReactNode> = {
  // --- the framework's own furniture ---------------------------------------
  calculator: (
    <>
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <rect x="7.5" y="5.5" width="9" height="3.5" rx="1" />
      <path d="M8.5 13.5h.01M12 13.5h.01M15.5 13.5h.01M8.5 17.5h.01M12 17.5h.01M15.5 17.5h.01" />
    </>
  ),
  flame: (
    <>
      <path d="M12 22c3.9 0 6-2.7 6-6 0-4-3-6-4.5-9.5C12.9 4 12 2 12 2s-.7 2.3-1.8 4.6C8.8 10 6 12 6 16c0 3.3 2.1 6 6 6z" />
      <path d="M12 22c1.7 0 3-1.2 3-2.9 0-1.6-1.2-2.4-1.9-3.9-.6 1.2-1.3 1.9-2 2.8-.6.8-1.1 1.4-1.1 2.1 0 1.1 1 1.9 2 1.9z" />
    </>
  ),
  // A disc and two ribbons, and nothing written on it: the same drawing is
  // gold, silver and bronze, told apart by its tint and the row it is in.
  medal: (
    <>
      <path d="M9 2.5 7 8M15 2.5l2 5.5" />
      <circle cx="12" cy="15" r="6" />
      <circle cx="12" cy="15" r="2.6" />
    </>
  ),
  heart: (
    <path
      fill="currentColor"
      stroke="none"
      d="M12 20.8 4.8 13.6a4.6 4.6 0 0 1 6.5-6.5l.7.7.7-.7a4.6 4.6 0 0 1 6.5 6.5z"
    />
  ),
  crown: (
    <>
      <path d="M3 7.5 7 11l5-6.5L17 11l4-3.5-1.5 11h-15L3 7.5z" />
      <path d="M5 21h14" />
    </>
  ),

  // --- the games -----------------------------------------------------------
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.2" />
    </>
  ),
  brain: (
    <>
      <path d="M12 5a3 3 0 0 0-5.6 1.4A3 3 0 0 0 4.5 9.4a3 3 0 0 0 .9 2.1A3 3 0 0 0 6.2 16 3 3 0 0 0 12 19" />
      <path d="M12 5a3 3 0 0 1 5.6 1.4 3 3 0 0 1 1.9 3 3 3 0 0 1-.9 2.1A3 3 0 0 1 17.8 16 3 3 0 0 1 12 19" />
      <path d="M12 5v14" />
    </>
  ),
  snake: (
    <>
      <path d="M6 4.5h5.5a4 4 0 0 1 0 8H9.5a3.5 3.5 0 0 0 0 7H14" />
      <circle cx="16.2" cy="19.5" r="2.3" />
      <path d="M17 18.7h.01" />
      <path d="M18.5 19.5h2m0 0 1.2-.8m-1.2.8 1.2.8" />
    </>
  ),
  coffee: (
    <>
      <path d="M4 8.5h12v5.5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8.5z" />
      <path d="M16 10h2a2.5 2.5 0 0 1 0 5h-2" />
      <path d="M8 2.5v2M12 2.5v2" />
    </>
  ),
  mountain: (
    <>
      <path d="M2.5 19.5 9 8.5l3.5 5.8 2-3.2 7 8.4h-19z" />
      <path d="M7.2 11.6h3.6" />
    </>
  ),

  // --- things a question is about ------------------------------------------
  bulb: (
    <>
      <path d="M12 3a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.1v.6h5v-.6c0-.8.4-1.6 1.1-2.1A6 6 0 0 0 12 3z" />
      <path d="M9.5 19h5M10.5 21.5h3" />
    </>
  ),
  robot: (
    <>
      <rect x="4" y="8" width="16" height="12" rx="2.5" />
      <path d="M12 8V5" />
      <circle cx="12" cy="3.5" r="1.4" />
      <path d="M9.5 13h.01M14.5 13h.01M10 16.8h4" />
      <path d="M2 12.5v3M22 12.5v3" />
    </>
  ),
  flag: (
    <>
      <path d="M5.5 21.5V3" />
      <path d="M5.5 3.5h12l-2.6 4.2 2.6 4.3h-12z" />
    </>
  ),
  dice: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="3.5" />
      <path d="M8 8h.01M16 8h.01M12 12h.01M8 16h.01M16 16h.01" />
    </>
  ),
  ball: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.5 8.4a5 5 0 0 1 3.3-1.4" />
    </>
  ),
  wheel: (
    <>
      <circle cx="12" cy="10.5" r="7.5" />
      <circle cx="12" cy="10.5" r="1.3" />
      <path d="M12 3v15M4.5 10.5h15" />
      <path d="M12 18v3.5M8.5 21.5h7" />
    </>
  ),
  cards: (
    <>
      <rect x="9" y="3" width="10.5" height="15" rx="2" />
      <rect x="4.5" y="6" width="10.5" height="15" rx="2" transform="rotate(-14 9.75 13.5)" />
    </>
  ),
  waves: (
    <>
      <path d="M2.5 7q2.4-2 4.8 0t4.8 0 4.8 0 4.6 0" />
      <path d="M2.5 12q2.4-2 4.8 0t4.8 0 4.8 0 4.6 0" />
      <path d="M2.5 17q2.4-2 4.8 0t4.8 0 4.8 0 4.6 0" />
    </>
  ),
  // An open box, folded from a sheet with its corners cut off — which is the
  // extremum station's own picture, and tells it apart from a solid cuboid.
  box: (
    <>
      <path d="M3.5 8.5 12 4.5l8.5 4-8.5 4z" />
      <path d="M3.5 8.5v6.5l8.5 4.5 8.5-4.5V8.5" />
    </>
  ),
  cuboid: (
    <>
      <path d="M3 9h13v9.5H3z" />
      <path d="M3 9 7.5 5.5H21L16 9" />
      <path d="M21 5.5V15l-5 3.5" />
    </>
  ),
  ruler: (
    <>
      <path d="M4 3.5v17h17z" />
      <path d="M8.5 20.5v-2.5M12 20.5v-4M15.5 20.5v-2.5" />
    </>
  ),
  thermometer: (
    <>
      <path d="M14 14.8V4.5a2 2 0 0 0-4 0v10.3a4 4 0 1 0 4 0z" />
      <path d="M12 9v6.5" />
    </>
  ),
  money: (
    <>
      <rect x="2" y="6" width="20" height="12" rx="2.5" />
      <path d="M14.8 10.2a3 3 0 1 0 0 3.6" />
      <path d="M9.2 11.3h3.6M9.2 12.9h3.6" />
    </>
  ),
  depth: (
    <>
      <path d="M3.5 4.5h17M3.5 19.5h17" />
      <path d="M12 7v10M9 10l3-3 3 3M9 14l3 3 3-3" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 6.8V12l3.2 2.2" />
    </>
  ),
  taxi: (
    <>
      <path d="M3 16.5v-3.2l2-4.6A2 2 0 0 1 6.8 7.5h10.4a2 2 0 0 1 1.8 1.2l2 4.6v3.2" />
      <path d="M4.5 13h15" />
      <circle cx="7.2" cy="16.8" r="1.8" />
      <circle cx="16.8" cy="16.8" r="1.8" />
      <rect x="9.8" y="3.5" width="4.4" height="2.4" rx="0.6" />
    </>
  ),
  car: (
    <>
      <path d="M3 16.5v-3.2l2-4.6A2 2 0 0 1 6.8 7.5h10.4a2 2 0 0 1 1.8 1.2l2 4.6v3.2" />
      <path d="M4.5 13h15" />
      <circle cx="7.2" cy="16.8" r="1.8" />
      <circle cx="16.8" cy="16.8" r="1.8" />
    </>
  ),
  piggy: (
    <>
      <ellipse cx="11.5" cy="12.5" rx="7.5" ry="5.5" />
      <path d="M7 7.4 6 4.4 9.4 6.1" />
      <rect x="17.4" y="10.4" width="3.2" height="3.2" rx="1.3" />
      <path d="M19 12h.01M9 8.8h4M8 17.6v2.4M15 17.6v2.4" />
    </>
  ),
  popcorn: (
    <>
      <path d="M7 9.5 8.6 20.5h6.8L17 9.5z" />
      <path d="M10.4 9.5 11 20.5M13.6 9.5 13 20.5" />
      <circle cx="8.8" cy="7.6" r="2.2" />
      <circle cx="12" cy="6.4" r="2.4" />
      <circle cx="15.2" cy="7.6" r="2.2" />
    </>
  ),
  plant: (
    <>
      <path d="M12 21v-8.5" />
      <path d="M12 13c0-3 2.1-5 5.2-5 0 3-2.1 5-5.2 5z" />
      <path d="M12 15.5c0-2.6-1.8-4.6-4.7-4.6 0 2.6 1.8 4.6 4.7 4.6z" />
      <path d="M6 21h12" />
    </>
  ),
  cake: (
    <>
      <path d="M4 20.5v-5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v5z" />
      <path d="M4 17q2-1.6 4 0t4 0 4 0 4 0" />
      <path d="M8.5 13.5V10M12 13.5V9.2M15.5 13.5V10" />
      <path d="M8.5 8h.01M12 7.2h.01M15.5 8h.01" />
    </>
  ),
  swim: (
    <>
      <circle cx="16.5" cy="6" r="2" />
      <path d="M3 10.5 7.5 7.5l5 3.5-2.5 2" />
      <path d="M2 18q2.5-1.8 5 0t5 0 5 0 5 0" />
      <path d="M2 21.5q2.5-1.8 5 0t5 0 5 0 5 0" />
    </>
  ),
  wrench: (
    <>
      <path d="M20.8 4.2a4.8 4.8 0 0 1-6.2 6.2L6.2 18.8a2.3 2.3 0 0 1-3.2-3.2l8.4-8.4a4.8 4.8 0 0 1 6.2-6.2l-3 3 2.2 2.2 3-3z" />
    </>
  ),
  bolt: <path d="M13.5 2 4.5 14h6l-1 8 9-12h-6l1-8z" />,
  scale: (
    <>
      <path d="M12 4.5V21M8 21h8" />
      <path d="M4.5 7.5 12 6l7.5 1.5" />
      <circle cx="12" cy="4.5" r="1.2" />
      <path d="M4.5 7.5 2 13.5a3 3 0 0 0 5 0z" />
      <path d="M19.5 7.5 17 13.5a3 3 0 0 0 5 0z" />
    </>
  ),
  square: <rect x="4" y="4" width="16" height="16" rx="1.5" />,
  rect: <rect x="2.5" y="7" width="19" height="10" rx="1.5" />,
  triangle: <path d="M12 3.5 20.5 19.5h-17z" />,
  trapezoid: <path d="M7.5 6.5h9l4 11h-17z" />,
  percent: (
    <>
      <path d="M5.5 18.5 18.5 5.5" />
      <circle cx="7.5" cy="7.5" r="2.6" />
      <circle cx="16.5" cy="16.5" r="2.6" />
    </>
  ),
  chartBar: (
    <>
      <path d="M3 20.5h18" />
      <path d="M6.5 20.5v-6M12 20.5v-11M17.5 20.5v-4" />
    </>
  ),
  chartLine: (
    <>
      <path d="M3 20.5h18" />
      <path d="M4.5 16 9 10.8l3.5 3L20 6" />
      <path d="M15.5 6H20v4.5" />
    </>
  ),
};

/**
 * One icon at the size of the text around it.
 *
 * `name` is either one of the drawings above or a symbol to print as it
 * stands, which is how ∫ and √ stay type. Decorative by default: everywhere
 * one of these appears, the thing it stands for is named beside it.
 */
export default function Icon({ name, className = "" }: { name: string; className?: string }) {
  const drawing = ICONS[name as IconName];
  if (!drawing) return <span className={className}>{name}</span>;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      // In `em`, so a call site keeps saying `text-3xl` and gets that size.
      // Slightly over 1em because the drawing does not fill its own box the
      // way an emoji fills its em: at exactly 1em every icon replaced here
      // came out visibly smaller than the character it replaced.
      className={`inline-block h-[1.2em] w-[1.2em] shrink-0 align-[-0.27em] ${className}`}
    >
      {drawing}
    </svg>
  );
}
