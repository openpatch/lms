// Probability helpers for the "Zufallsexperimente" game (UV 7.6 / 8.1).
// Only what the SILP asks for: one- and two-stage experiments, Laplace
// probabilities and the two path rules — no conditional probabilities.

import type { Fraction } from "./rational-math";
import { add, multiply, reduce, subtract } from "./rational-math";

/** A two-stage experiment with two outcomes per stage. */
export interface TreeModel {
  /** Probabilities of the two first-stage outcomes. */
  first: [Fraction, Fraction];
  /** Second-stage probabilities: `second[firstOutcome][secondOutcome]`. */
  second: [[Fraction, Fraction], [Fraction, Fraction]];
}

/** One path through the tree: which outcome at stage one, which at stage two. */
export type TreePath = [0 | 1, 0 | 1];

/** Path rule 1: multiply along the path. */
export function pathProbability(model: TreeModel, [first, second]: TreePath): Fraction {
  return multiply(model.first[first], model.second[first][second]);
}

/** Path rule 2: add the paths that belong to the event. */
export function eventProbability(model: TreeModel, paths: TreePath[]): Fraction {
  return paths.reduce<Fraction>(
    (sum, path) => add(sum, pathProbability(model, path)),
    { n: 0, d: 1 },
  );
}

/** Draws two balls from an urn of `red` red and `blue` blue ones. */
export function urnModel(red: number, blue: number, withReplacement: boolean): TreeModel {
  const total = red + blue;
  const first: [Fraction, Fraction] = [reduce({ n: red, d: total }), reduce({ n: blue, d: total })];
  if (withReplacement) {
    return { first, second: [[first[0], first[1]], [first[0], first[1]]] };
  }
  const rest = total - 1;
  return {
    first,
    second: [
      [reduce({ n: red - 1, d: rest }), reduce({ n: blue, d: rest })],
      [reduce({ n: red, d: rest }), reduce({ n: blue - 1, d: rest })],
    ],
  };
}

/** Two independent turns of the same experiment (a wheel, a coin, a die). */
export function repeatedModel(hit: Fraction): TreeModel {
  const miss = subtract({ n: 1, d: 1 }, hit);
  const pair: [Fraction, Fraction] = [hit, miss];
  return { first: pair, second: [pair, pair] };
}

/** All four paths of a tree, in slot order. */
export const ALL_PATHS: TreePath[] = [
  [0, 0],
  [0, 1],
  [1, 0],
  [1, 1],
];

/** The events a two-stage experiment is asked about. */
export type TreeEvent = "both-first" | "both-second" | "exactly-one-first" | "at-least-one-first";

export function eventPaths(event: TreeEvent): TreePath[] {
  switch (event) {
    case "both-first":
      return [[0, 0]];
    case "both-second":
      return [[1, 1]];
    case "exactly-one-first":
      return [
        [0, 1],
        [1, 0],
      ];
    case "at-least-one-first":
      return [
        [0, 0],
        [0, 1],
        [1, 0],
      ];
  }
}
