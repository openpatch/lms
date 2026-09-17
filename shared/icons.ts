/**
 * The name of every icon the site draws — see `src/components/icons.tsx`.
 *
 * The list lives here, away from the drawings, for two reasons. `ICONS` in the
 * component is typed by it, so a name without a drawing is a compile error
 * rather than a blank square in a lesson. And `pnpm check:games` can read it
 * without pulling a React component into a Node script, which is what lets it
 * say that a spec names an icon that exists.
 */
export const ICON_NAMES = [
  // the framework's own furniture
  "calculator",
  "flame",
  "medal",
  "crown",
  "heart",
  // the games
  "target",
  "brain",
  "snake",
  "coffee",
  "mountain",
  // things a question is about
  "bulb",
  "robot",
  "flag",
  "dice",
  "ball",
  "wheel",
  "cards",
  "waves",
  "box",
  "cuboid",
  "ruler",
  "thermometer",
  "money",
  "depth",
  "clock",
  "taxi",
  "car",
  "piggy",
  "popcorn",
  "plant",
  "cake",
  "swim",
  "wrench",
  "bolt",
  "scale",
  "square",
  "rect",
  "triangle",
  "trapezoid",
  "percent",
  "chartBar",
  "chartLine",
] as const;

export type IconName = (typeof ICON_NAMES)[number];

export function isIconName(name: string): name is IconName {
  return (ICON_NAMES as readonly string[]).includes(name);
}
