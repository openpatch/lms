import { javaSpec } from "../../../shared/games/java";
import { defineGame } from "../../lib/game-registry";
import TraceStage, { TraceRulesExample } from "./stages/Trace";
import ChoiceStage, { ChoiceRulesExample, TypesRulesExample } from "./stages/Choice";
import LogicStage, { LogicRulesExample } from "./stages/Logic";
import StructogramStage, { StructogramRulesExample } from "./stages/Structogram";
import BugsStage, { BugsRulesExample } from "./stages/Bugs";
import {
  BugsReview,
  ChoiceReview,
  LogicReview,
  StructogramReview,
  TraceReview,
} from "./stages/reviews";

// Six stations ask the same thing of the player — read the listing, write down
// what comes out — so they share one component and differ only in the programs
// the server generates for them.
const trace = { Component: TraceStage, RulesExample: TraceRulesExample, Review: TraceReview };

export default defineGame(javaSpec, {
  output: trace,
  variables: trace,
  loops: trace,
  methods: trace,
  arrays: trace,
  sorting: trace,
  types: { Component: ChoiceStage, RulesExample: TypesRulesExample, Review: ChoiceReview },
  branch: { Component: ChoiceStage, RulesExample: ChoiceRulesExample, Review: ChoiceReview },
  logic: { Component: LogicStage, RulesExample: LogicRulesExample, Review: LogicReview },
  structogram: {
    Component: StructogramStage,
    RulesExample: StructogramRulesExample,
    Review: StructogramReview,
  },
  bugs: { Component: BugsStage, RulesExample: BugsRulesExample, Review: BugsReview },
});
