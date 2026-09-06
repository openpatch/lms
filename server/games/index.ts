import type { GameHandler } from "../types";
import exampleHandler from "./example";
import squarerootHandler from "./squareroot";

/**
 * Server-side game handler registry.
 * To add a new game, create a handler file in this directory and register it here.
 */
export const gameHandlers: Record<string, GameHandler> = {
  example: exampleHandler,
  squareroot: squarerootHandler,
};
