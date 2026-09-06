import ExampleGame from "./ExampleGame";
import ExampleSettings from "./ExampleSettings";
import ExampleExplanation from "./ExampleExplanation";
import type { GameDefinition } from "../../lib/game-registry";

const exampleGame: GameDefinition = {
  id: "example",
  titleKey: "games.example.title",
  descriptionKey: "games.example.description",
  category: "math",
  icon: "🎯",
  status: "live",
  minPlayers: 1,
  maxPlayers: 50,
  Component: ExampleGame,
  SettingsComponent: ExampleSettings,
  ExplanationComponent: ExampleExplanation,
};

export default exampleGame;
