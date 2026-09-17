// A tiny turtle, shared by the generator on the server and the picture on the
// client.
//
// A program is a structured command list rather than Python source text, so one
// tree renders both ways: `toPython()` writes the lines the player reads, and
// `runTurtle()` walks the same tree into the drawing those lines make. That is
// what lets the server build a question and three wrong pictures from mutated
// copies of the program without ever parsing Python.
//
// The tree covers the ideas the Turtle-Lernpfad teaches one after another —
// variables, loops, branches, own functions and lists — so a station can be
// narrowed to the ones a class has already met.

/**
 * A number in a program: a constant, `factor * <name> + offset` for anything
 * read from a variable or a loop counter, or one entry of a list.
 */
export type TurtleValue =
  | number
  | { factor: number; offset: number; variable: string }
  | { list: string; index: TurtleValue };

/** A colour: a name like "red", or one looked up in a list of them. */
export type TurtleColor = string | { list: string; index: TurtleValue };

/** What an `if` asks about a variable. */
export type TurtleCondition =
  | { test: "even"; variable: string }
  | { test: "odd"; variable: string }
  | { test: "less"; variable: string; value: number };

export type TurtleCommand =
  | { op: "forward"; value: TurtleValue }
  | { op: "backward"; value: TurtleValue }
  | { op: "right"; value: TurtleValue }
  | { op: "left"; value: TurtleValue }
  | { op: "penup" }
  | { op: "pendown" }
  | { op: "goto"; x: number; y: number }
  | { op: "dot"; value: TurtleValue }
  | { op: "pencolor"; color: TurtleColor }
  | { op: "pensize"; value: TurtleValue }
  | { op: "repeat"; times: number; variable: string; body: TurtleCommand[] }
  /** `name = <value>`. */
  | { op: "assign"; name: string; value: TurtleValue }
  /** `name = [40, 70, 100]`. */
  | { op: "numbers"; name: string; values: number[] }
  /** `name = ["red", "blue"]`. */
  | { op: "colors"; name: string; values: string[] }
  | { op: "branch"; condition: TurtleCondition; body: TurtleCommand[]; orElse?: TurtleCommand[] }
  | { op: "define"; name: string; body: TurtleCommand[] }
  | { op: "call"; name: string };

export interface TurtlePoint {
  x: number;
  y: number;
}

/** One uninterrupted stroke: the pen went down, moved, and came up again. */
export interface TurtleStroke {
  points: TurtlePoint[];
  color: string;
  width: number;
}

export interface TurtleDot extends TurtlePoint {
  size: number;
  color: string;
}

export interface TurtleDrawing {
  strokes: TurtleStroke[];
  dots: TurtleDot[];
}

export interface TurtleBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

const DEFAULT_COLOR = "black";

/**
 * What a program has in hand while it runs: its variables, its lists and the
 * functions it has defined. One set for the whole program rather than one per
 * block, because that is what Python does — a name assigned inside a loop is
 * still there on the next turn, and the loop counter outlives the loop.
 */
interface TurtleEnv {
  numbers: Record<string, number>;
  lists: Record<string, number[] | string[]>;
  functions: Record<string, TurtleCommand[]>;
  /** Calls still running. A program that calls itself is stopped, not hung. */
  depth: number;
}

/** Deep enough for a function that calls a helper; too shallow to recurse. */
const MAX_CALL_DEPTH = 8;

/** Resolves a value against the variables and lists currently in scope. */
function resolve(value: TurtleValue, env: TurtleEnv): number {
  if (typeof value === "number") return value;
  if ("variable" in value) return value.factor * (env.numbers[value.variable] ?? 0) + value.offset;
  const item = itemAt(value, env);
  return typeof item === "number" ? item : 0;
}

/**
 * The entry `farben[i]` reads. The generator only ever builds indexes that are
 * in range; a mutated copy is clamped rather than dropped, so a wrong option is
 * still a picture the player can rule out.
 */
function itemAt(
  value: { list: string; index: TurtleValue },
  env: TurtleEnv,
): number | string | undefined {
  const items = env.lists[value.list];
  if (!items || items.length === 0) return undefined;
  const index = Math.round(resolve(value.index, env));
  return items[Math.min(items.length - 1, Math.max(0, index))];
}

function resolveColor(color: TurtleColor, env: TurtleEnv): string {
  if (typeof color === "string") return color;
  const item = itemAt(color, env);
  return typeof item === "string" ? item : DEFAULT_COLOR;
}

function holds(condition: TurtleCondition, env: TurtleEnv): boolean {
  const value = env.numbers[condition.variable] ?? 0;
  switch (condition.test) {
    case "even":
      return Math.abs(value % 2) === 0;
    case "odd":
      return Math.abs(value % 2) === 1;
    case "less":
      return value < condition.value;
  }
}

// ---------------------------------------------------------------------------
// Running a program
// ---------------------------------------------------------------------------

interface TurtleState {
  x: number;
  y: number;
  /** Degrees, 0 pointing right and growing counter-clockwise, as in Python. */
  heading: number;
  penDown: boolean;
  color: string;
  width: number;
  stroke: TurtlePoint[];
}

function endStroke(state: TurtleState, drawing: TurtleDrawing): void {
  if (state.stroke.length > 1) {
    drawing.strokes.push({ points: state.stroke, color: state.color, width: state.width });
  }
  state.stroke = state.penDown ? [{ x: state.x, y: state.y }] : [];
}

function move(state: TurtleState, distance: number, drawing: TurtleDrawing): void {
  const radians = (state.heading * Math.PI) / 180;
  state.x += distance * Math.cos(radians);
  state.y += distance * Math.sin(radians);
  if (state.penDown) state.stroke.push({ x: state.x, y: state.y });
  else endStroke(state, drawing);
}

function run(
  commands: TurtleCommand[],
  state: TurtleState,
  env: TurtleEnv,
  drawing: TurtleDrawing,
): void {
  for (const command of commands) step(command, state, env, drawing);
}

function step(
  command: TurtleCommand,
  state: TurtleState,
  env: TurtleEnv,
  drawing: TurtleDrawing,
): void {
  switch (command.op) {
    case "forward":
      move(state, resolve(command.value, env), drawing);
      break;
    case "backward":
      move(state, -resolve(command.value, env), drawing);
      break;
    case "right":
      state.heading -= resolve(command.value, env);
      break;
    case "left":
      state.heading += resolve(command.value, env);
      break;
    case "penup":
      endStroke(state, drawing);
      state.penDown = false;
      state.stroke = [];
      break;
    case "pendown":
      state.penDown = true;
      state.stroke = [{ x: state.x, y: state.y }];
      break;
    case "goto":
      if (state.penDown) {
        state.x = command.x;
        state.y = command.y;
        state.stroke.push({ x: state.x, y: state.y });
      } else {
        state.x = command.x;
        state.y = command.y;
      }
      break;
    case "dot":
      drawing.dots.push({
        x: state.x,
        y: state.y,
        size: Math.max(1, resolve(command.value, env)),
        color: state.color,
      });
      break;
    case "pencolor":
      endStroke(state, drawing);
      state.color = resolveColor(command.color, env);
      break;
    case "pensize":
      endStroke(state, drawing);
      state.width = Math.max(1, resolve(command.value, env));
      break;
    case "repeat":
      for (let i = 0; i < command.times; i++) {
        env.numbers[command.variable] = i;
        run(command.body, state, env, drawing);
      }
      break;
    case "assign":
      env.numbers[command.name] = resolve(command.value, env);
      break;
    case "numbers":
    case "colors":
      env.lists[command.name] = command.values;
      break;
    case "branch":
      if (holds(command.condition, env)) run(command.body, state, env, drawing);
      else if (command.orElse) run(command.orElse, state, env, drawing);
      break;
    case "define":
      env.functions[command.name] = command.body;
      break;
    case "call": {
      const body = env.functions[command.name];
      if (!body || env.depth >= MAX_CALL_DEPTH) break;
      env.depth++;
      run(body, state, env, drawing);
      env.depth--;
      break;
    }
  }
}

/** Walks a program and returns everything it puts on the canvas. */
export function runTurtle(program: TurtleCommand[]): TurtleDrawing {
  const drawing: TurtleDrawing = { strokes: [], dots: [] };
  const state: TurtleState = {
    x: 0,
    y: 0,
    heading: 0,
    penDown: true,
    color: DEFAULT_COLOR,
    width: 2,
    stroke: [{ x: 0, y: 0 }],
  };
  run(program, state, { numbers: {}, lists: {}, functions: {}, depth: 0 }, drawing);
  endStroke(state, drawing);
  return drawing;
}

export function drawingBounds(drawing: TurtleDrawing): TurtleBounds {
  const bounds: TurtleBounds = { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  const include = (x: number, y: number, pad = 0) => {
    bounds.minX = Math.min(bounds.minX, x - pad);
    bounds.minY = Math.min(bounds.minY, y - pad);
    bounds.maxX = Math.max(bounds.maxX, x + pad);
    bounds.maxY = Math.max(bounds.maxY, y + pad);
  };
  for (const stroke of drawing.strokes) {
    for (const point of stroke.points) include(point.x, point.y, stroke.width / 2);
  }
  for (const dot of drawing.dots) include(dot.x, dot.y, dot.size / 2);
  return bounds;
}

/**
 * A coarse picture of a drawing: which cells of a square grid it inks.
 *
 * The grid is fitted to the drawing's own bounding box, exactly as the SVG
 * fits it to its card, so two programs that differ only in scale share a
 * fingerprint — they really do look the same on screen. That is what the
 * question generator needs: not "is this a different program" but "is this a
 * different picture".
 */
export function drawingFingerprint(drawing: TurtleDrawing, size = 24): Uint8Array {
  const grid = new Uint8Array(size * size);
  const bounds = drawingBounds(drawing);
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  const span = Math.max(width, height, 1e-6);
  // Centre the shorter side, the way preserveAspectRatio="xMidYMid" does.
  const offsetX = (span - width) / 2;
  const offsetY = (span - height) / 2;

  const mark = (x: number, y: number) => {
    const column = Math.floor(((x - bounds.minX + offsetX) / span) * size);
    const row = Math.floor(((bounds.maxY - y + offsetY) / span) * size);
    if (column >= 0 && column < size && row >= 0 && row < size) grid[row * size + column] = 1;
  };

  for (const stroke of drawing.strokes) {
    for (let i = 1; i < stroke.points.length; i++) {
      const from = stroke.points[i - 1];
      const to = stroke.points[i];
      const length = Math.hypot(to.x - from.x, to.y - from.y);
      const steps = Math.max(2, Math.ceil((length / span) * size * 3));
      for (let step = 0; step <= steps; step++) {
        mark(from.x + ((to.x - from.x) * step) / steps, from.y + ((to.y - from.y) * step) / steps);
      }
    }
  }

  for (const dot of drawing.dots) {
    const radius = dot.size / 2;
    mark(dot.x, dot.y);
    for (let angle = 0; angle < 16; angle++) {
      const radians = (angle * Math.PI) / 8;
      mark(dot.x + radius * Math.cos(radians), dot.y + radius * Math.sin(radians));
    }
  }

  return grid;
}

/** How many cells two fingerprints disagree on — how different they look. */
export function fingerprintDistance(a: Uint8Array, b: Uint8Array): number {
  let differing = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) differing++;
  return differing;
}

// ---------------------------------------------------------------------------
// Writing the program out as Python
// ---------------------------------------------------------------------------

function valueToPython(value: TurtleValue): string {
  if (typeof value === "number") return formatNumber(value);
  if ("list" in value) return `${value.list}[${valueToPython(value.index)}]`;
  const { factor, offset, variable } = value;
  const product = factor === 1 ? variable : `${variable} * ${formatNumber(factor)}`;
  if (offset === 0) return product;
  return offset > 0
    ? `${product} + ${formatNumber(offset)}`
    : `${product} - ${formatNumber(-offset)}`;
}

function colorToPython(color: TurtleColor): string {
  return typeof color === "string" ? `"${color}"` : `${color.list}[${valueToPython(color.index)}]`;
}

function conditionToPython(condition: TurtleCondition): string {
  switch (condition.test) {
    case "even":
      return `${condition.variable} % 2 == 0`;
    case "odd":
      return `${condition.variable} % 2 == 1`;
    case "less":
      return `${condition.variable} < ${formatNumber(condition.value)}`;
  }
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
}

function commandToPython(command: TurtleCommand, indent: number, lines: string[]): void {
  const pad = "    ".repeat(indent);
  switch (command.op) {
    case "forward":
    case "backward":
    case "right":
    case "left":
    case "pensize":
    case "dot":
      lines.push(`${pad}${command.op}(${valueToPython(command.value)})`);
      break;
    case "penup":
    case "pendown":
      lines.push(`${pad}${command.op}()`);
      break;
    case "goto":
      lines.push(`${pad}goto(${formatNumber(command.x)}, ${formatNumber(command.y)})`);
      break;
    case "pencolor":
      lines.push(`${pad}pencolor(${colorToPython(command.color)})`);
      break;
    case "repeat":
      lines.push(`${pad}for ${command.variable} in range(${command.times}):`);
      for (const child of command.body) commandToPython(child, indent + 1, lines);
      break;
    case "assign":
      lines.push(`${pad}${command.name} = ${valueToPython(command.value)}`);
      break;
    case "numbers":
      lines.push(`${pad}${command.name} = [${command.values.map(formatNumber).join(", ")}]`);
      break;
    case "colors":
      lines.push(`${pad}${command.name} = [${command.values.map((c) => `"${c}"`).join(", ")}]`);
      break;
    case "branch":
      lines.push(`${pad}if ${conditionToPython(command.condition)}:`);
      for (const child of command.body) commandToPython(child, indent + 1, lines);
      if (command.orElse && command.orElse.length > 0) {
        lines.push(`${pad}else:`);
        for (const child of command.orElse) commandToPython(child, indent + 1, lines);
      }
      break;
    case "define":
      lines.push(`${pad}def ${command.name}():`);
      for (const child of command.body) commandToPython(child, indent + 1, lines);
      // A blank line after the definition, the way the Lernpfad prints it.
      lines.push("");
      break;
    case "call":
      lines.push(`${pad}${command.name}()`);
      break;
  }
}

/** The program as the player sees it, `from turtle import *` included. */
export function toPython(program: TurtleCommand[]): string[] {
  const lines: string[] = ["from turtle import *", ""];
  for (const command of program) commandToPython(command, 0, lines);
  return lines;
}
