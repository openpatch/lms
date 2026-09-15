import { pythonSpec } from "../../../shared/games/python";
import { defineGame } from "../../lib/game-registry";
import TraceStage, { TraceRulesExample } from "./stages/Trace";
import BranchStage, { BranchRulesExample } from "./stages/Branch";
import LogicStage, { LogicRulesExample } from "./stages/Logic";
import TurtleStage, { TurtleRulesExample } from "./stages/Turtle";
import ParsonsStage, { ParsonsRulesExample } from "./stages/Parsons";
import BugsStage, { BugsRulesExample } from "./stages/Bugs";
import {
  BranchReview,
  BugsReview,
  LogicReview,
  ParsonsReview,
  TraceReview,
  TurtleReview,
} from "./stages/reviews";

// Five stations ask the same thing of the player — read the listing, write down
// what comes out — so they share one component and differ only in the programs
// the server generates for them.
const trace = {
  Component: TraceStage,
  RulesExample: TraceRulesExample,
  Review: TraceReview,
};

export default defineGame(pythonSpec, {
  output: trace,
  variables: trace,
  loops: trace,
  functions: trace,
  lists: trace,
  branch: {
    Component: BranchStage,
    RulesExample: BranchRulesExample,
    Review: BranchReview,
  },
  logic: {
    Component: LogicStage,
    RulesExample: LogicRulesExample,
    Review: LogicReview,
  },
  turtle: {
    Component: TurtleStage,
    RulesExample: TurtleRulesExample,
    Review: TurtleReview,
  },
  parsons: {
    Component: ParsonsStage,
    RulesExample: ParsonsRulesExample,
    Review: ParsonsReview,
  },
  bugs: {
    Component: BugsStage,
    RulesExample: BugsRulesExample,
    Review: BugsReview,
  },
});
