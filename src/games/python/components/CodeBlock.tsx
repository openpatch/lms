import Block, {
  CodeLine as Line,
  type CodeBlockProps,
  type Language,
} from "../../../components/CodeBlock";

/**
 * A Python listing.
 *
 * The highlighting is deliberately crude: it knows the keywords, the builtins
 * and the turtle commands of the hyperbook's Turtle-Lernpfad, and treats
 * everything else as a plain name. That is the whole language the game uses.
 * The layout of the block itself is src/components/CodeBlock.tsx.
 */

const KEYWORDS = new Set([
  "and",
  "def",
  "elif",
  "else",
  "for",
  "from",
  "if",
  "import",
  "in",
  "not",
  "or",
  "return",
  "while",
]);

const CONSTANTS = new Set(["True", "False", "None"]);

const BUILTINS = new Set([
  "print",
  "input",
  "int",
  "float",
  "str",
  "len",
  "range",
  "randint",
  "forward",
  "backward",
  "right",
  "left",
  "goto",
  "penup",
  "pendown",
  "pencolor",
  "fillcolor",
  "pensize",
  "dot",
  "circle",
  "write",
  "bgcolor",
  "hideturtle",
  "speed",
]);

// Python's "//" is floor division, not a comment, so only "#" starts one.
const TOKEN = /("[^"]*"?|'[^']*'?|#.*$|\d+\.?\d*|[A-Za-z_][A-Za-z_0-9]*|[\s\S])/g;

function classify(token: string): string {
  if (token.startsWith('"') || token.startsWith("'")) return "text-emerald-700";
  if (token.startsWith("#")) return "text-slate-400 italic";
  if (/^\d/.test(token)) return "text-orange-600";
  if (KEYWORDS.has(token)) return "text-purple-600 font-semibold";
  if (CONSTANTS.has(token)) return "text-purple-600";
  if (BUILTINS.has(token)) return "text-sky-700";
  return "";
}

const python: Language = { token: TOKEN, classify };

export function CodeLine({ text }: { text: string }) {
  return <Line text={text} language={python} />;
}

export type { CodeBlockProps };

export default function CodeBlock(props: CodeBlockProps) {
  return <Block {...props} language={python} />;
}
