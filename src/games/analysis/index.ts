import AnalysisGame from "./AnalysisGame";
import AnalysisSettings from "./AnalysisSettings";
import AnalysisExplanation from "./AnalysisExplanation";
import type { GameDefinition } from "../../lib/game-registry";

const analysisGame: GameDefinition = {
  id: "analysis",
  titleKey: "games.analysis.title",
  descriptionKey: "games.analysis.description",
  category: "math",
  icon: "\u222B",
  status: "live",
  minPlayers: 1,
  maxPlayers: 50,
  Component: AnalysisGame,
  SettingsComponent: AnalysisSettings,
  ExplanationComponent: AnalysisExplanation,
};

export default analysisGame;
