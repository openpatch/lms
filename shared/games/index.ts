import type { GameSpec } from "../framework";
import { GRADES } from "../types";
import { exampleSpec } from "./example";
import { squarerootSpec } from "./squareroot";
import { analysisSpec } from "./analysis";
import { rationalSpec } from "./rational";
import { chanceSpec } from "./chance";
import { extremumSpec } from "./extremum";

/**
 * Every mini game known to client and server. Adding a game means adding its
 * spec here, a stage handler file on the server and stage components on the
 * client — see documentation.md.
 */
export const gameSpecs: Record<string, GameSpec> = {
  example: exampleSpec,
  squareroot: squarerootSpec,
  analysis: analysisSpec,
  rational: rationalSpec,
  chance: chanceSpec,
  extremum: extremumSpec,
};

export function getGameSpec(id: string): GameSpec | undefined {
  return gameSpecs[id];
}

export function getAllGameSpecs(): GameSpec[] {
  return Object.values(gameSpecs);
}

/** Sanity check for the registry; throws on a malformed spec. */
export function validateGameSpecs(specs: Record<string, GameSpec> = gameSpecs): void {
  for (const [key, spec] of Object.entries(specs)) {
    if (key !== spec.id) {
      throw new Error(`Game spec "${spec.id}" is registered under the key "${key}"`);
    }
    for (const grade of spec.grades) {
      if (!GRADES.includes(grade)) {
        throw new Error(`Game "${spec.id}" declares the unknown grade "${grade}"`);
      }
    }
    if (spec.stages.length === 0) {
      throw new Error(`Game "${spec.id}" needs at least one stage`);
    }
    const stageIds = new Set<string>();
    for (const stage of spec.stages) {
      if (stageIds.has(stage.id)) {
        throw new Error(`Game "${spec.id}" declares the stage "${stage.id}" twice`);
      }
      stageIds.add(stage.id);
      const keys = new Set<string>();
      for (const field of stage.settings) {
        if (keys.has(field.key)) {
          throw new Error(
            `Stage "${spec.id}/${stage.id}" declares the setting "${field.key}" twice`,
          );
        }
        keys.add(field.key);
      }
    }
  }
}
