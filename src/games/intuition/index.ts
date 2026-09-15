import { intuitionSpec } from "../../../shared/games/intuition";
import { defineGame } from "../../lib/game-registry";
import FarbeStage, { FarbeRulesExample } from "./stages/Farbe";
import LampenStage, { LampenRulesExample } from "./stages/Lampen";
import PixelStage, { PixelRulesExample } from "./stages/Pixel";
import DrehenStage, { DrehenRulesExample } from "./stages/Drehen";
import KabelStage, { KabelRulesExample } from "./stages/Kabel";
import WegStage, { WegRulesExample } from "./stages/Weg";
import NachbarnStage, { NachbarnRulesExample } from "./stages/Nachbarn";
import {
  DrehenReview,
  FarbeReview,
  KabelReview,
  LampenReview,
  NachbarnReview,
  PixelReview,
  WegReview,
} from "./stages/reviews";

// No two stations of this game share a component: each one is a different
// thing to look at, which is the point of it.
export default defineGame(intuitionSpec, {
  farbe: { Component: FarbeStage, RulesExample: FarbeRulesExample, Review: FarbeReview },
  lampen: { Component: LampenStage, RulesExample: LampenRulesExample, Review: LampenReview },
  pixel: { Component: PixelStage, RulesExample: PixelRulesExample, Review: PixelReview },
  drehen: { Component: DrehenStage, RulesExample: DrehenRulesExample, Review: DrehenReview },
  kabel: { Component: KabelStage, RulesExample: KabelRulesExample, Review: KabelReview },
  weg: { Component: WegStage, RulesExample: WegRulesExample, Review: WegReview },
  nachbarn: {
    Component: NachbarnStage,
    RulesExample: NachbarnRulesExample,
    Review: NachbarnReview,
  },
});
