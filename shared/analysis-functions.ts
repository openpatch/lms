// Shared function pool for the analysis (calculus) game.
// Used by both the client (to render graphs) and the server (to evaluate answers).
// Functions are referenced by index to avoid serialization of closures.

export interface AnalysisFunctionDef {
  /** LaTeX for f(x), e.g. "x^2" — rendered as KaTeX */
  latex: string;
  /** LaTeX for f'(x), e.g. "2x" */
  derivativeLatex: string;
  /** Three distractor LaTeX strings for the multiple-choice round */
  distractors: string[];
  /** Drawing grid bounds */
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

export const ANALYSIS_FUNCTIONS: AnalysisFunctionDef[] = [
  {
    latex: "x^2",
    derivativeLatex: "2x",
    distractors: ["x", "x^2", "2"],
    xMin: -3, xMax: 3, yMin: -1, yMax: 6,
  },
  {
    latex: "x^3",
    derivativeLatex: "3x^2",
    distractors: ["3x", "x^2", "x^3"],
    xMin: -2, xMax: 2, yMin: -4, yMax: 4,
  },
  {
    latex: "\\sin(x)",
    derivativeLatex: "\\cos(x)",
    distractors: ["-\\sin(x)", "-\\cos(x)", "\\sin(x)"],
    xMin: -Math.PI, xMax: Math.PI, yMin: -2, yMax: 2,
  },
  {
    latex: "\\cos(x)",
    derivativeLatex: "-\\sin(x)",
    distractors: ["\\sin(x)", "-\\cos(x)", "\\cos(x)"],
    xMin: -Math.PI, xMax: Math.PI, yMin: -2, yMax: 2,
  },
  {
    latex: "x^2 - 2",
    derivativeLatex: "2x",
    distractors: ["2x - 2", "x", "2"],
    xMin: -3, xMax: 3, yMin: -3, yMax: 5,
  },
  {
    latex: "-x^2",
    derivativeLatex: "-2x",
    distractors: ["2x", "-x", "-2"],
    xMin: -3, xMax: 3, yMin: -5, yMax: 1,
  },
  {
    latex: "2x - 1",
    derivativeLatex: "2",
    distractors: ["2x", "1", "x"],
    xMin: -3, xMax: 3, yMin: -5, yMax: 5,
  },
  {
    latex: "x^2 + x",
    derivativeLatex: "2x + 1",
    distractors: ["2x", "x + 1", "2x - 1"],
    xMin: -3, xMax: 3, yMin: -1, yMax: 8,
  },
  {
    latex: "\\frac{1}{x}",
    derivativeLatex: "-\\frac{1}{x^2}",
    distractors: ["\\frac{1}{x^2}", "-\\frac{1}{x}", "\\frac{2}{x}"],
    xMin: -3, xMax: 3, yMin: -4, yMax: 4,
  },
  {
    latex: "e^x",
    derivativeLatex: "e^x",
    distractors: ["x\\,e^{x-1}", "e", "x\\,e^x"],
    xMin: -2, xMax: 2, yMin: -1, yMax: 8,
  },
];

export function evaluateFunction(id: number, x: number): number {
  switch (id) {
    case 0: return x * x;
    case 1: return x * x * x;
    case 2: return Math.sin(x);
    case 3: return Math.cos(x);
    case 4: return x * x - 2;
    case 5: return -(x * x);
    case 6: return 2 * x - 1;
    case 7: return x * x + x;
    case 8: return x === 0 ? NaN : 1 / x;
    case 9: return Math.exp(x);
    default: return NaN;
  }
}

export function evaluateDerivative(id: number, x: number): number {
  switch (id) {
    case 0: return 2 * x;
    case 1: return 3 * x * x;
    case 2: return Math.cos(x);
    case 3: return -Math.sin(x);
    case 4: return 2 * x;
    case 5: return -2 * x;
    case 6: return 2;
    case 7: return 2 * x + 1;
    case 8: return x === 0 ? NaN : -1 / (x * x);
    case 9: return Math.exp(x);
    default: return NaN;
  }
}

// Functions suitable for the drawing rounds (avoid 1/x due to discontinuity)
export const DRAWABLE_FUNCTION_IDS = [0, 1, 2, 3, 4, 5, 7];
