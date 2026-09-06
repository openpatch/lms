// Shared types used by both client and server

export type GameCategory = "math" | "cs";

export type GameStatus = "live" | "coming-soon";

export type LobbyPhase = "lobby" | "explanation" | "countdown" | "playing" | "round-finished" | "finished";

export interface Player {
  id: string;
  name: string;
  isHost: boolean;
  score: number;
  connected: boolean;
}

export interface LobbyState {
  code: string;
  gameId: string;
  hostId: string;
  players: Player[];
  phase: LobbyPhase;
  gameData: unknown;
  settings: unknown;
  countdownEndsAt: number | null;
}

// Messages: Client -> Server
export type ClientMessage =
  | { type: "join"; name: string }
  | { type: "host"; gameId: string }
  | { type: "start" }
  | { type: "begin-countdown" }
  | { type: "restart" }
  | { type: "next-round" }
  | { type: "update-settings"; settings: unknown }
  | { type: "game-action"; payload: unknown }
  | { type: "kick"; playerId: string };

// Messages: Server -> Client
export type ServerMessage =
  | { type: "lobby-state"; state: LobbyState }
  | { type: "error"; message: string }
  | { type: "countdown"; gameData: unknown; countdownEndsAt: number }
  | { type: "game-start"; gameData: unknown }
  | { type: "game-state"; gameData: unknown }
  | { type: "game-event"; event: unknown }
  | { type: "round-finished"; results: GameResult[]; isLastRound: boolean }
  | { type: "finished"; results: GameResult[] };

export interface GameResult {
  playerId: string;
  playerName: string;
  score: number;
}

// Game metadata used by the client registry
export interface GameMeta {
  id: string;
  titleKey: string; // i18n key, e.g. "games.example.title"
  descriptionKey: string;
  category: GameCategory;
  icon: string; // emoji
  status: GameStatus;
  minPlayers: number;
  maxPlayers: number;
}

// Example game settings (shared between client and server)
export interface ExampleSettings {
  rounds: number;      // 1-10
  duration: number;    // seconds per round, 5-30
  targetScore: number; // clicks needed to "win" a round, 10-100
}

export const defaultExampleSettings: ExampleSettings = {
  rounds: 3,
  duration: 10,
  targetScore: 50,
};

// Squareroot game types
export type SquarerootRoundType = "speed" | "numberline" | "classify";
export type ClassifyAnswer = "natural" | "rational" | "irrational";

export interface SquarerootSettings {
  questionsPerRound: number; // 5, 10, 15
  duration: number;           // seconds per round, 30-120
}

export const defaultSquarerootSettings: SquarerootSettings = {
  questionsPerRound: 10,
  duration: 60,
};

export interface SquarerootQuestion {
  id: number;
  value: number;          // number under the radical
  numericAnswer: number;  // sqrt(value) as a number
  lineMin?: number;        // number line range (round 2)
  lineMax?: number;
  classifyAnswer?: ClassifyAnswer; // correct classification (round 3)
}

export interface PlayerAnswer {
  answer: string;
  timeMs: number; // milliseconds since round start
  correct?: boolean; // whether this answer was correct
  points?: number;  // points awarded for this answer
  streak?: number;  // streak count after this answer
}

export interface SquarerootGameData {
  currentRound: number;
  totalRounds: number;
  roundType: SquarerootRoundType;
  questions: SquarerootQuestion[];
  answers: Record<string, Record<number, PlayerAnswer>>; // playerId -> questionId -> answer
  startTime: number;
  duration: number;
  finished: boolean;
}
