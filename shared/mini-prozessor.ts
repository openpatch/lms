/**
 * The Mini-Prozessor of the hyperbook's Lektion 4.2, "Wie der Prozessor ein
 * Programm ausführt" — the same six commands and the same rules as its
 * `<mini-prozessor>` web component, so a program that runs there runs here.
 *
 * A command is 8 bits: 3 for what to do, 5 for which cell. Numbers wrap at a
 * byte. The processor stops on STOPP, on an opcode it does not know (6 and 7),
 * and when the program counter runs off the end of memory.
 */

export const OPCODES = ["STOPP", "LADE", "ADDIERE", "SUBTRAHIERE", "SPEICHERE", "SPRINGE"] as const;

export type Opcode = (typeof OPCODES)[number];

export const STOPP = 0;
export const LADE = 1;
export const ADDIERE = 2;
export const SUBTRAHIERE = 3;
export const SPEICHERE = 4;
export const SPRINGE = 5;

export function encode(op: number, addr: number): number {
  return ((op & 7) << 5) | (addr & 31);
}

export function decode(value: number): { op: number; addr: number } {
  const byte = value & 255;
  return { op: byte >> 5, addr: byte & 31 };
}

/** "LADE 5", "STOPP", or "?" for an opcode the processor does not know. */
export function mnemonic(value: number): string {
  const { op, addr } = decode(value);
  const name = OPCODES[op];
  if (!name) return "?";
  return op === STOPP ? name : `${name} ${addr}`;
}

export function toBits(value: number, width = 8): string {
  return (value & ((1 << width) - 1)).toString(2).padStart(width, "0");
}

export interface RunResult {
  memory: number[];
  akku: number;
  /** Commands executed, STOPP included. */
  steps: number;
  /** False when the step limit was hit — an endless loop. */
  halted: boolean;
}

/** Runs a program to the end, or until `limit` commands have run. */
export function run(initial: readonly number[], limit = 500): RunResult {
  const memory = initial.map((cell) => cell & 255);
  let akku = 0;
  let pc = 0;
  let steps = 0;
  while (steps < limit) {
    if (pc >= memory.length) return { memory, akku, steps, halted: true };
    const { op, addr } = decode(memory[pc]);
    pc += 1;
    steps += 1;
    const cell = addr < memory.length ? memory[addr] : 0;
    switch (op) {
      case LADE:
        akku = cell;
        break;
      case ADDIERE:
        akku = (akku + cell) & 255;
        break;
      case SUBTRAHIERE:
        akku = (akku - cell + 256) & 255;
        break;
      case SPEICHERE:
        if (addr < memory.length) memory[addr] = akku;
        break;
      case SPRINGE:
        pc = addr;
        break;
      default:
        return { memory, akku, steps, halted: true };
    }
  }
  return { memory, akku, steps, halted: false };
}

/**
 * Memory with a program written into its first `cells` cells and `data` in
 * the rest — how the station's "write a program" task is run, both by the
 * player's own test run and by the server grading it.
 */
export function withProgram(data: readonly number[], program: readonly number[], cells: number): number[] {
  return data.map((value, cell) => (cell < cells ? (program[cell] ?? 0) & 255 : value & 255));
}
