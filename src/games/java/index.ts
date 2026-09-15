import { javaSpec } from "../../../shared/games/java";
import { defineGame } from "../../lib/game-registry";
import TraceStage, {
  ArraysRulesExample,
  LoopsRulesExample,
  MethodsRulesExample,
  OutputRulesExample,
  SortingRulesExample,
  VariablesRulesExample,
} from "./stages/Trace";
import ChoiceStage, {
  ChoiceRulesExample,
  TypesRulesExample,
} from "./stages/Choice";
import LogicStage, { LogicRulesExample } from "./stages/Logic";
import StructogramStage, {
  StructogramRulesExample,
} from "./stages/Structogram";
import BugsStage, { BugsRulesExample } from "./stages/Bugs";
import {
  BugSolution,
  ChoiceSolution,
  LogicSolution,
  StructogramSolution,
  TypedSolution,
} from "./stages/solutions";
import {
  bugLabel,
  choiceLabel,
  logicLabel,
  structogramLabel,
} from "./stages/answer-labels";
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
//
// Their rules examples are not shared. That picture is what a class reads the
// station off, so it has to be a question that station would actually ask:
// one integer-division snippet over all six said the same thing about loops,
// arrays and Bubblesort, which was worse than saying nothing.
const trace = {
  Component: TraceStage,
  Review: TraceReview,
  Solution: TypedSolution,
};

export default defineGame(javaSpec, {
  output: { ...trace, RulesExample: OutputRulesExample },
  variables: { ...trace, RulesExample: VariablesRulesExample },
  loops: { ...trace, RulesExample: LoopsRulesExample },
  methods: { ...trace, RulesExample: MethodsRulesExample },
  arrays: { ...trace, RulesExample: ArraysRulesExample },
  sorting: { ...trace, RulesExample: SortingRulesExample },
  types: {
    Component: ChoiceStage,
    RulesExample: TypesRulesExample,
    Review: ChoiceReview,
    Solution: ChoiceSolution,
    answerLabel: choiceLabel,
  },
  branch: {
    Component: ChoiceStage,
    RulesExample: ChoiceRulesExample,
    Review: ChoiceReview,
    Solution: ChoiceSolution,
    answerLabel: choiceLabel,
  },
  logic: {
    Component: LogicStage,
    RulesExample: LogicRulesExample,
    Review: LogicReview,
    Solution: LogicSolution,
    answerLabel: logicLabel,
  },
  structogram: {
    Component: StructogramStage,
    RulesExample: StructogramRulesExample,
    Review: StructogramReview,
    Solution: StructogramSolution,
    answerLabel: structogramLabel,
  },
  bugs: {
    Component: BugsStage,
    RulesExample: BugsRulesExample,
    Review: BugsReview,
    Solution: BugSolution,
    answerLabel: bugLabel,
  },
});
