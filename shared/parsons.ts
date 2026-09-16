// A Parsons puzzle: the lines of a program, shuffled, to be put back in order.
//
// Two games use it and they use it differently. Python hands the indentation
// over to the player, because in Python the indentation *is* the block. Java
// hands it back already set, because there the braces carry the block and the
// indentation is only manners — so the Java puzzle is about where a `}` goes,
// which is the thing that actually catches people out.

/** The lines of a program, shuffled; put them back in order. */
export interface ParsonsQuestion {
  id: number;
  /** Line texts in the order they are offered, never the order they belong in. */
  lines: string[];
  /** Indentation of each offered line, or null when the player has to set it. */
  indents: number[] | null;
  /** For each position in the finished program: which offered line goes there. */
  solution: number[];
  /** The indent each position needs. Only graded when `indents` is null. */
  solutionIndents: number[];
  captionKey: string;
}

/** What the player submits for a Parsons puzzle. */
export interface ParsonsAnswer {
  /** Offered line indices, in the order the player put them. */
  order: number[];
  /** The indent the player chose for each placed line. */
  indents: number[];
}

/** One template line, before it is shuffled. */
export interface ParsonsLine {
  text: string;
  indent: number;
}

export interface ParsonsTemplate {
  captionKey: string;
  lines: ParsonsLine[];
}

/** Shuffles a template into a puzzle. `shuffled` is the caller's shuffle, so
 *  the two games keep their own random source. */
export function parsonsQuestion(
  template: ParsonsTemplate,
  withIndent: boolean,
  shuffled: number[],
): Omit<ParsonsQuestion, "id"> {
  const lines = shuffled.map((index) => template.lines[index].text);
  const indents = shuffled.map((index) => template.lines[index].indent);
  // solution[position] is the offered card that belongs there.
  const solution = template.lines.map((_, index) => shuffled.indexOf(index));

  return {
    lines,
    indents: withIndent ? null : indents,
    solution,
    solutionIndents: template.lines.map((line) => line.indent),
    captionKey: template.captionKey,
  };
}

/**
 * How much of the puzzle is right, as a share of its lines.
 *
 * Lines are compared by their text and not by which card they came from: a
 * program with two identical lines in it has two right answers, and marking one
 * of them wrong because the wrong card carried it would be marking the reader
 * wrong for something they cannot see.
 */
export function parsonsScore(question: ParsonsQuestion, answer: string): number {
  let parsed: ParsonsAnswer;
  try {
    parsed = JSON.parse(answer) as ParsonsAnswer;
  } catch {
    return 0;
  }
  if (!Array.isArray(parsed?.order)) return 0;

  const wanted = question.solution.map((line) => question.lines[line]);
  const placed = parsed.order;
  const chosenIndents = Array.isArray(parsed.indents) ? parsed.indents : [];

  let hits = 0;
  for (let position = 0; position < wanted.length; position++) {
    const card = placed[position];
    if (card == null || question.lines[card] == null) continue;
    if (question.lines[card] !== wanted[position]) continue;
    if (question.indents == null && chosenIndents[position] !== question.solutionIndents[position]) {
      continue;
    }
    hits++;
  }
  return wanted.length === 0 ? 0 : hits / wanted.length;
}
