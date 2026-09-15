// Python source code: the shape of a listing the game builds.
//
// Reading back what a student typed as the output of a program is not specific
// to Python and lives in code-answer.ts.

/** One line of a listing: its text and how deep it is indented. */
export interface CodeLine {
  text: string;
  indent: number;
}

export const INDENT = "    ";

export function renderLine(line: CodeLine): string {
  return INDENT.repeat(line.indent) + line.text;
}

export function renderProgram(lines: CodeLine[]): string[] {
  return lines.map(renderLine);
}
