import Block, {
  CodeLine as Line,
  type CodeBlockProps,
  type Language,
} from "../../../components/CodeBlock";

/**
 * A Java listing.
 *
 * The highlighting knows the Java of the hyperbook's Lernpfad *Grundlagen der
 * Programmierung mit Java* and nothing else: the primitive types, the control
 * structures, and the handful of calls those chapters use. Everything else is a
 * plain name. The layout of the block itself is src/components/CodeBlock.tsx.
 */

const KEYWORDS = new Set([
  "break",
  "class",
  "continue",
  "do",
  "else",
  "extends",
  "for",
  "if",
  "new",
  "private",
  "public",
  "return",
  "static",
  "this",
  "void",
  "while",
]);

const TYPES = new Set(["boolean", "char", "double", "int", "String", "Integer", "Math", "IO"]);

const CONSTANTS = new Set(["true", "false", "null"]);

const CALLS = new Set([
  "println",
  "print",
  "readln",
  "parseInt",
  "parseDouble",
  "length",
  "charAt",
  "substring",
  "indexOf",
  "toUpperCase",
  "equals",
  "round",
  "abs",
  "random",
  "PI",
]);

// A char literal is single-quoted and "//" starts a comment — both unlike Python.
const TOKEN = /("[^"]*"?|'[^']*'?|\/\/.*$|\d+\.?\d*|[A-Za-z_][A-Za-z_0-9]*|[\s\S])/g;

function classify(token: string): string {
  if (token.startsWith('"') || token.startsWith("'")) return "text-emerald-700";
  if (token.startsWith("//")) return "text-slate-400 italic";
  if (/^\d/.test(token)) return "text-orange-600";
  if (KEYWORDS.has(token)) return "text-purple-600 font-semibold";
  if (CONSTANTS.has(token)) return "text-purple-600";
  if (TYPES.has(token)) return "text-indigo-700 font-semibold";
  if (CALLS.has(token)) return "text-sky-700";
  return "";
}

const java: Language = { token: TOKEN, classify };

export function CodeLine({ text }: { text: string }) {
  return <Line text={text} language={java} />;
}

export type { CodeBlockProps };

export default function CodeBlock(props: CodeBlockProps) {
  return <Block {...props} language={java} />;
}
