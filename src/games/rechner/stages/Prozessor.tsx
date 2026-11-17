import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { CpuQuestion } from "../../../../shared/games/rechner";
import { OPCODES, encode, mnemonic, run, toBits, withProgram } from "../../../../shared/mini-prozessor";
import type { StageProps } from "../../../lib/game-registry";
import GameButton from "../../../components/GameButton";
import { StageActionBar } from "../../../components/StageShell";
import { MemoryTable, OpcodeTable } from "../components/Memory";
import { termText } from "../labels";

interface Draft {
  questionId: number;
  text: string;
  op: number | null;
  program: { op: number; addr: number }[];
  test: { result: number | null; steps: number } | null;
}

/**
 * The Mini-Prozessor of Lektion 4.2: turn a command into its number and back,
 * follow a program through memory, or write one.
 */
export default function ProzessorStage({ question, submit }: StageProps<CpuQuestion>) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<Draft | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Only the tasks answered in a single box want it focused.
  const typed = question != null && (question.task === "encode" || question.task === "trace");
  useEffect(() => {
    if (typed) inputRef.current?.focus();
  }, [question?.id, typed]);

  if (!question) return null;

  const current: Draft =
    draft?.questionId === question.id
      ? draft
      : {
          questionId: question.id,
          text: "",
          op: null,
          program: Array.from({ length: question.programCells }, () => ({ op: 0, addr: 0 })),
          test: null,
        };
  const update = (patch: Partial<Draft>) => setDraft({ ...current, ...patch });
  const cellWord = t("games.rechner.cpu.cell");

  const numberInput = (label: string) => (
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      aria-label={label}
      placeholder={label}
      value={current.text}
      onChange={(e) => update({ text: e.target.value.replace(/[^0-9]/g, "") })}
      onKeyDown={(e) => e.key === "Enter" && current.text && submit(current.text)}
      className="w-40 rounded-lg border-2 border-gray-200 px-3 py-2 text-center text-2xl focus:border-game-solid focus:outline-none"
    />
  );

  if (question.task === "encode" || question.task === "trace") {
    return (
      <div key={question.id} className="animate-question-in flex w-full max-w-xl flex-col items-center gap-5">
        {question.task === "encode" ? (
          <>
            <p className="text-gray-500">{t("games.rechner.cpu.encodePrompt")}</p>
            <p className="font-mono text-4xl font-bold text-game-ink">{mnemonic(encode(question.op, question.addr))}</p>
            <OpcodeTable />
          </>
        ) : (
          <>
            <p className="text-center text-gray-500">
              {t("games.rechner.cpu.tracePrompt", { cell: question.resultCell })}
            </p>
            <MemoryTable memory={question.memory} raw={question.raw} highlight={question.resultCell} />
            {question.raw && <OpcodeTable />}
          </>
        )}
        {numberInput(t("games.rechner.cpu.number"))}
        <StageActionBar>
          <GameButton onClick={() => submit(current.text)} disabled={!current.text}>
            {t("game.submit")}
          </GameButton>
        </StageActionBar>
      </div>
    );
  }

  if (question.task === "decode") {
    const send = () => current.op != null && current.text && submit(`${current.op},${current.text}`);
    return (
      <div key={question.id} className="animate-question-in flex w-full max-w-xl flex-col items-center gap-5">
        <p className="text-gray-500">{t("games.rechner.cpu.decodePrompt")}</p>
        <p className="font-mono text-4xl font-bold text-game-ink">
          {question.asBits ? `${toBits(question.value).slice(0, 3)} ${toBits(question.value).slice(3)}` : question.value}
        </p>
        <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-3">
          {OPCODES.map((name, op) => (
            <button
              key={name}
              onClick={() => update({ op })}
              aria-pressed={current.op === op}
              className={`rounded-lg border-2 px-2 py-2 font-mono font-semibold ${
                current.op === op ? "border-game-solid bg-game-solid text-white" : "border-gray-200 bg-white text-gray-700 hover:border-game-300"
              }`}
            >
              {name}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-3 text-gray-600">
          {t("games.rechner.cpu.address")}
          <input
            type="text"
            inputMode="numeric"
            value={current.text}
            onChange={(e) => update({ text: e.target.value.replace(/[^0-9]/g, "") })}
            onKeyDown={(e) => e.key === "Enter" && send()}
            className="w-24 rounded-lg border-2 border-gray-200 px-3 py-2 text-center text-xl focus:border-game-solid focus:outline-none"
          />
        </label>
        <OpcodeTable />
        <StageActionBar>
          <GameButton onClick={send} disabled={current.op == null || !current.text}>
            {t("game.submit")}
          </GameButton>
        </StageActionBar>
      </div>
    );
  }

  // write
  const program = current.program.map(({ op, addr }) => encode(op, addr));
  const setSlot = (index: number, patch: Partial<{ op: number; addr: number }>) => {
    const next = current.program.map((slot, i) => (i === index ? { ...slot, ...patch } : slot));
    update({ program: next, test: null });
  };
  const testRun = () => {
    const result = run(withProgram(question.memory, program, question.programCells));
    update({ test: { result: result.halted ? result.memory[question.resultCell] : null, steps: result.steps } });
  };
  const addresses = Array.from({ length: question.memory.length }, (_, i) => i);

  return (
    <div key={question.id} className="animate-question-in flex w-full max-w-2xl flex-col items-center gap-4">
      <p className="text-center text-gray-600">
        {t("games.rechner.cpu.writePrompt", {
          formula: termText(question.terms, cellWord),
          cell: question.resultCell,
        })}
      </p>
      <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-start">
        <ol className="flex flex-1 flex-col gap-1.5">
          {current.program.map((slot, index) => (
            <li key={index} className="flex items-center gap-2">
              <span className="w-14 shrink-0 font-mono text-xs text-gray-500">
                {cellWord} {index}
              </span>
              <select
                aria-label={t("games.rechner.cpu.slotCommand", { cell: index })}
                value={slot.op}
                onChange={(e) => setSlot(index, { op: Number(e.target.value) })}
                className="min-w-0 flex-1 rounded-lg border-2 border-gray-200 bg-white px-2 py-1 font-mono text-sm"
              >
                {OPCODES.map((name, op) => (
                  <option key={name} value={op}>
                    {name}
                  </option>
                ))}
              </select>
              <select
                aria-label={t("games.rechner.cpu.slotAddress", { cell: index })}
                value={slot.addr}
                disabled={slot.op === 0}
                onChange={(e) => setSlot(index, { addr: Number(e.target.value) })}
                className="w-16 rounded-lg border-2 border-gray-200 bg-white px-2 py-1 font-mono text-sm disabled:opacity-40"
              >
                {addresses.map((addr) => (
                  <option key={addr} value={addr}>
                    {addr}
                  </option>
                ))}
              </select>
              <span className="w-9 shrink-0 text-right font-mono text-xs tabular-nums text-gray-400">
                {program[index]}
              </span>
            </li>
          ))}
        </ol>
        <div className="flex-1">
          <MemoryTable memory={question.memory} from={10} highlight={question.resultCell} />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={testRun}
          className="rounded-lg border-2 border-game-solid px-4 py-1.5 font-semibold text-game-ink hover:bg-game-50"
        >
          {t("games.rechner.cpu.testRun")}
        </button>
        <p role="status" className="text-sm">
          {current.test == null ? (
            <span className="text-gray-500">{t("games.rechner.cpu.expected", { cell: question.resultCell, value: question.expected })}</span>
          ) : current.test.result == null ? (
            <span className="font-medium text-rose-600">{t("games.rechner.cpu.endless")}</span>
          ) : (
            <span className={`font-medium ${current.test.result === question.expected ? "text-emerald-600" : "text-rose-600"}`}>
              {t("games.rechner.cpu.testResult", {
                cell: question.resultCell,
                value: current.test.result,
                expected: question.expected,
                steps: current.test.steps,
              })}
            </span>
          )}
        </p>
      </div>
      <OpcodeTable />
      <StageActionBar>
        <GameButton onClick={() => submit(JSON.stringify({ program }))}>{t("game.submit")}</GameButton>
      </StageActionBar>
    </div>
  );
}

export function ProzessorRulesExample() {
  const memory = [37, 70, 135, 0, 0, 3, 4, 0];
  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-2">
      <MemoryTable memory={memory} highlight={7} />
      <p className="font-mono text-sm text-gray-500">LADE 5 = 1 · 32 + 5 = 37</p>
    </div>
  );
}
