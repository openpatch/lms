import { createContext, useContext, useEffect, type CSSProperties } from "react";
import type { GameColor, GameMeta } from "../../shared/types";

/**
 * One game's colour, as a set of shades.
 *
 * `solid` is the shade a filled button uses — always dark enough for white text,
 * which is not true of `500` in the warmer palettes. `ink` is the shade text
 * uses on a `50`/`100` tint.
 */
export interface GamePalette {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  900: string;
  solid: string;
  solidHover: string;
  ink: string;
}

export const GAME_PALETTES: Record<GameColor, GamePalette> = {
  violet: {
    50: "#f5f3ff",
    100: "#ede9fe",
    200: "#ddd6fe",
    300: "#c4b5fd",
    400: "#a78bfa",
    500: "#8b5cf6",
    600: "#7c3aed",
    700: "#6d28d9",
    900: "#4c1d95",
    solid: "#7c3aed",
    solidHover: "#6d28d9",
    ink: "#6d28d9",
  },
  indigo: {
    50: "#eef2ff",
    100: "#e0e7ff",
    200: "#c7d2fe",
    300: "#a5b4fc",
    400: "#818cf8",
    500: "#6366f1",
    600: "#4f46e5",
    700: "#4338ca",
    900: "#312e81",
    solid: "#4f46e5",
    solidHover: "#4338ca",
    ink: "#4338ca",
  },
  sky: {
    50: "#f0f9ff",
    100: "#e0f2fe",
    200: "#bae6fd",
    300: "#7dd3fc",
    400: "#38bdf8",
    500: "#0ea5e9",
    600: "#0284c7",
    700: "#0369a1",
    900: "#0c4a6e",
    solid: "#0369a1",
    solidHover: "#075985",
    ink: "#075985",
  },
  cyan: {
    50: "#ecfeff",
    100: "#cffafe",
    200: "#a5f3fc",
    300: "#67e8f9",
    400: "#22d3ee",
    500: "#06b6d4",
    600: "#0891b2",
    700: "#0e7490",
    900: "#164e63",
    solid: "#0e7490",
    solidHover: "#155e75",
    ink: "#155e75",
  },
  lime: {
    50: "#f7fee7",
    100: "#ecfccb",
    200: "#d9f99d",
    300: "#bef264",
    400: "#a3e635",
    500: "#84cc16",
    600: "#65a30d",
    700: "#4d7c0f",
    900: "#365314",
    solid: "#4d7c0f",
    solidHover: "#3f6212",
    ink: "#3f6212",
  },
  amber: {
    50: "#fffbeb",
    100: "#fef3c7",
    200: "#fde68a",
    300: "#fcd34d",
    400: "#fbbf24",
    500: "#f59e0b",
    600: "#d97706",
    700: "#b45309",
    900: "#78350f",
    solid: "#b45309",
    solidHover: "#92400e",
    ink: "#92400e",
  },
  orange: {
    50: "#fff7ed",
    100: "#ffedd5",
    200: "#fed7aa",
    300: "#fdba74",
    400: "#fb923c",
    500: "#f97316",
    600: "#ea580c",
    700: "#c2410c",
    900: "#7c2d12",
    solid: "#c2410c",
    solidHover: "#9a3412",
    ink: "#9a3412",
  },
  rose: {
    50: "#fff1f2",
    100: "#ffe4e6",
    200: "#fecdd3",
    300: "#fda4af",
    400: "#fb7185",
    500: "#f43f5e",
    600: "#e11d48",
    700: "#be123c",
    900: "#881337",
    solid: "#e11d48",
    solidHover: "#be123c",
    ink: "#be123c",
  },
  fuchsia: {
    50: "#fdf4ff",
    100: "#fae8ff",
    200: "#f5d0fe",
    300: "#f0abfc",
    400: "#e879f9",
    500: "#d946ef",
    600: "#c026d3",
    700: "#a21caf",
    900: "#701a75",
    solid: "#a21caf",
    solidHover: "#86198f",
    ink: "#a21caf",
  },
  teal: {
    50: "#f0fdfa",
    100: "#ccfbf1",
    200: "#99f6e4",
    300: "#5eead4",
    400: "#2dd4bf",
    500: "#14b8a6",
    600: "#0d9488",
    700: "#0f766e",
    900: "#134e4a",
    solid: "#0f766e",
    solidHover: "#115e59",
    ink: "#0f766e",
  },
};

/**
 * The CSS custom properties every `game-*` utility reads (see index.css).
 * Put them on any element to paint its subtree in a game's colour; without a
 * colour the subtree falls back to the brand palette declared on :root.
 */
export function gameThemeVars(color: GameColor | undefined): CSSProperties {
  if (!color) return {};
  const palette = GAME_PALETTES[color];
  return {
    "--game-50": palette[50],
    "--game-100": palette[100],
    "--game-200": palette[200],
    "--game-300": palette[300],
    "--game-400": palette[400],
    "--game-500": palette[500],
    "--game-600": palette[600],
    "--game-700": palette[700],
    "--game-900": palette[900],
    "--game-solid": palette.solid,
    "--game-solid-hover": palette.solidHover,
    "--game-ink": palette.ink,
  } as CSSProperties;
}

/**
 * The game the whole app shell is currently painted in. Layout owns the state;
 * a page announces its game with `useActiveGame`.
 */
export const ActiveGameContext = createContext<(game: GameMeta | null) => void>(() => {});

/**
 * Paints the app shell — header badge included — in this game's colour for as
 * long as the page is mounted. Pass `undefined` while the game is still loading.
 */
export function useActiveGame(game: GameMeta | undefined) {
  const setGame = useContext(ActiveGameContext);
  useEffect(() => {
    setGame(game ?? null);
    return () => setGame(null);
  }, [game, setGame]);
}
