import SquarerootGame from "./SquarerootGame";
import SquarerootSettings from "./SquarerootSettings";
import SquarerootExplanation from "./SquarerootExplanation";
import type { GameDefinition } from "../../lib/game-registry";

const squarerootGame: GameDefinition = {
  id: "squareroot",
  titleKey: "games.squareroot.title",
  descriptionKey: "games.squareroot.description",
  category: "math",
  icon: "\u221A",
  status: "live",
  minPlayers: 1,
  maxPlayers: 50,
  Component: SquarerootGame,
  SettingsComponent: SquarerootSettings,
  ExplanationComponent: SquarerootExplanation,
};

export default squarerootGame;
