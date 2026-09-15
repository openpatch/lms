import type { GameHandler } from "../types";
import exampleHandler from "./example";
import squarerootHandler from "./squareroot";
import analysisHandler from "./analysis";
import rationalHandler from "./rational";
import chanceHandler from "./chance";
import extremumHandler from "./extremum";
import termeHandler from "./terme";
import pythonHandler from "./python";
import javaHandler from "./java";

/**
 * Server-side game handler registry.
 * To add a new game, create a handler file in this directory and register it here.
 */
export const gameHandlers: Record<string, GameHandler> = {
  example: exampleHandler,
  squareroot: squarerootHandler,
  analysis: analysisHandler,
  rational: rationalHandler,
  chance: chanceHandler,
  extremum: extremumHandler,
  terme: termeHandler,
  python: pythonHandler,
  java: javaHandler,
};
