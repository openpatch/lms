import { createContext } from "react";

/**
 * Where a stage's primary button goes: the bar pinned to the bottom edge.
 *
 * In a file of its own because two very different screens need it — the shell
 * that owns the bar, and the host's debrief, which shows a stage without
 * letting anyone play it and so points the portal at a node nobody sees.
 */
export const ActionBarContext = createContext<HTMLElement | null>(null);
