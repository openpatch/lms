// Core types shared by client and server.
// The mini-game contract (stages, settings, rounds) lives in framework.ts.

export type GameCategory = "math" | "cs";

/** Jahrgangsstufen a game is meant for; shown as a badge on the game card. */
export type Grade = "5" | "6" | "7" | "8" | "9" | "10" | "EF" | "Q1" | "Q2";

export const GRADES: Grade[] = ["5", "6", "7", "8", "9", "10", "EF", "Q1", "Q2"];

export type GameStatus = "live" | "coming-soon";

/**
 * The palette a game is painted in. Every game owns exactly one, so a glance at
 * the screen says which game a class is in — the shades themselves live in
 * src/lib/game-theme.ts.
 *
 * Seventeen, and that is close to as many as this list can hold. They have to
 * be told apart across a room, and the seven added after the first ten were
 * picked by measuring: each one is at least as far from every colour already
 * here as the closest existing pair (amber and orange) are from each other. A
 * colour nearer than that would not be a new colour, it would be a second
 * amber. `scripts/check-games.ts` holds that line.
 */
export type GameColor =
  | "violet"
  | "indigo"
  | "sky"
  | "cyan"
  | "lime"
  | "amber"
  | "orange"
  | "rose"
  | "fuchsia"
  | "teal"
  | "red"
  | "green"
  | "yellow"
  | "blue"
  | "purple"
  | "pink"
  | "slate";

export const GAME_COLORS: GameColor[] = [
  "violet",
  "indigo",
  "sky",
  "cyan",
  "lime",
  "amber",
  "orange",
  "rose",
  "fuchsia",
  "teal",
  "red",
  "green",
  "yellow",
  "blue",
  "purple",
  "pink",
  "slate",
];

export type LobbyPhase =
  | "lobby"
  | "explanation"
  | "countdown"
  | "playing"
  | "round-finished"
  | "finished";

export interface Player {
  id: string;
  name: string;
  isHost: boolean;
  score: number;
  /**
   * Rounds won, which is not the same thing as points and deliberately does
   * not become them. Somebody who is out of the running overall can still take
   * a round, and a session where the same person wins everything is a session
   * the rest stopped playing in — so winning one is worth keeping, and worth
   * keeping separately.
   */
  crowns: number;
  connected: boolean;
}

export interface LobbyState {
  code: string;
  gameId: string;
  hostId: string;
  players: Player[];
  phase: LobbyPhase;
  /** The current round's data — a StageRoundData once a round has started. */
  gameData: unknown;
  /** The host's stage selection and per-stage settings — a GameSettings. */
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
  /** Stop the round now, whatever the clock says. Host only. */
  | { type: "end-round" }
  | { type: "update-settings"; settings: unknown }
  | { type: "game-action"; payload: unknown }
  | { type: "kick"; playerId: string }
  | { type: "close-lobby" };

// Messages: Server -> Client
// Anything carrying a point in time also carries the server's own clock reading,
// so a client can measure how far its clock is off and still count down right
// (see src/lib/server-time.ts).
export type ServerMessage =
  | { type: "lobby-state"; state: LobbyState; serverNow: number }
  | { type: "error"; message: string }
  | { type: "countdown"; gameData: unknown; countdownEndsAt: number; serverNow: number }
  | { type: "game-start"; gameData: unknown; serverNow: number }
  | { type: "game-state"; gameData: unknown }
  | { type: "game-event"; event: unknown }
  | { type: "round-finished"; results: GameResult[]; isLastRound: boolean }
  /** `results` are the totals; `roundResults` is what the last round added to
   *  them, since a game that ends never sends a "round-finished" for it. */
  | { type: "finished"; results: GameResult[]; roundResults: GameResult[] }
  /** The lobby is gone: it expired, or the host closed it. Stop reconnecting. */
  | { type: "lobby-closed"; reason: LobbyClosedReason };

export type LobbyClosedReason = "expired" | "host-closed" | "not-found";

export interface GameResult {
  playerId: string;
  playerName: string;
  score: number;
  /** Rounds this player has won so far, this session. */
  crowns?: number;
  /** Whether they won the round this result is for. Ties win together. */
  wonRound?: boolean;
}

/** Metadata every mini game carries; GameSpec extends it with its stages. */
export interface GameMeta {
  id: string;
  titleKey: string; // i18n key, e.g. "games.example.title"
  descriptionKey: string;
  category: GameCategory;
  /** Jahrgangsstufen this game fits, in ascending order. Empty for demo games. */
  grades: Grade[];
  icon: string; // emoji or short symbol
  /** This game's colour, unique across the registry. */
  color: GameColor;
  status: GameStatus;
  /**
   * Kept out of the arena. For the example game, which exists to be copied
   * when adding a new one and has no business in a teacher's list of things to
   * play — it is still registered, still checked, and still reachable by its
   * own URL for anyone working on it.
   */
  hidden?: boolean;
  minPlayers: number;
  maxPlayers: number;
}

/** One player's answer to one question, as recorded by the framework. */
export interface PlayerAnswer {
  /** The raw answer string the client sent. */
  answer: string;
  /** Milliseconds between the round start and this answer. */
  timeMs: number;
  correct?: boolean;
  /** Points awarded, combo bonus included. */
  points?: number;
  /** The player's streak after this answer. */
  streak?: number;
}
