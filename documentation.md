# Mini-game framework

This app is a lobby that runs mini games for a class. One person hosts, the class
joins with a six-digit code, and everyone plays the same game at the same time.

This document describes how a mini game is built and how to add one.

## The model

A **mini game** is a collection of **stages** — at least one.

- Each stage has its own **rules** (the text shown before the round starts) and its
  own **settings** (questions per round, time, difficulty toggles, …).
- The host picks **which stages** a session plays when creating the lobby.
- One active stage is played per round, in the order the stages are declared.
  Three active stages means three rounds; one active stage means the game ends after
  a single round.

Everything else — the countdown, the timer, answer bookkeeping, streaks and combo
bonus, the score header, the host's progress view, round results — belongs to the
framework and is the same for every game.

```
 lobby ──► explanation ──► countdown ──► playing ──► round-finished ──► … ──► finished
           (stage rules)     (3, 2, 1)   (stage UI)   (next stage)
```

## Where things live

| File | Purpose |
| --- | --- |
| `shared/framework.ts` | The contract: settings schema, `GameSpec`/`StageSpec`, round data, scoring helpers |
| `shared/games/<game>.ts` | One game's spec (metadata + stages + settings) and its question types |
| `shared/games/index.ts` | Registry of all specs, plus `validateGameSpecs()` |
| `server/framework.ts` | `createStageGame()` — runs rounds, records answers, ends rounds |
| `server/games/<game>.ts` | One stage handler per stage: generate questions, grade an answer |
| `src/lib/game-registry.ts` | `defineGame()` — joins a spec with its React components |
| `src/lib/game-theme.ts` | The colour palettes and the `--game-*` variables that paint a game's screens |
| `src/games/<game>/stages/*.tsx` | One component per stage: render the current question |
| `src/components/StageShell.tsx` | The bars around a stage: round, score and clock pinned under the app header, the stage's action pinned to the bottom edge (`StageActionBar`), plus host view and feedback |
| `src/components/StageRules.tsx` | The rules screen before a round |
| `src/components/StageSettingsForm.tsx` | The host's stage picker and settings, built from the schema |
| `src/components/NumberLine.tsx` | Ticks, click-to-pick and markers on an axis |
| `src/components/PlotCanvas.tsx` | Coordinate system: curves, markers, and a curve the player draws. It sizes itself from the viewport height minus `reserveRem` — the room the rest of the stage needs — so the whole stage stays on screen on a tablet |
| `src/components/MatchBoard.tsx` | Cards dropped into slots (drag, or tap card then slot) |
| `src/components/TermInput.tsx` | A MathLive math field: the player writes a term, the stage gets LaTeX |
| `src/components/ParameterSliders.tsx` | One slider per parameter, for "tune it until it fits" stages |
| `shared/<topic>-math.ts`, `shared/polynomial.ts`, `shared/matching.ts`, `shared/term-algebra.ts` | Topic logic both sides share: fractions, roots, probability trees, polynomials, card assignments, terms with several variables |
| `scripts/check-games.ts` | `npm run check:games` — smoke test for every registered game |

A game touches exactly three places: its spec (shared), its handlers (server), its
components (client). The spec is the single source of truth both sides read.

## Adding a mini game

The example game (`shared/games/example.ts`, `server/games/example.ts`,
`src/games/example/`) is the smallest complete game — copy it as a starting point.

### 1. Write the spec

`shared/games/primes.ts`:

```ts
import type { GameSpec, StageQuestion } from "../framework";

export const primesSpec: GameSpec = {
  id: "primes",
  titleKey: "games.primes.title",
  descriptionKey: "games.primes.description",
  category: "math",          // "math" | "cs"
  grades: ["7"],             // Jahrgangsstufen, shown as a badge on the card
  icon: "🔢",                // emoji or short symbol on the game card
  color: "fuchsia",          // this game's colour — see "Colour", must be unused
  status: "live",            // "live" | "coming-soon"
  minPlayers: 1,
  maxPlayers: 50,
  stages: [
    {
      id: "spot",
      nameKey: "games.primes.stages.spot.name",
      summaryKey: "games.primes.stages.spot.summary",   // one line in the stage picker
      rulesKey: "games.primes.stages.spot.rules",       // the rules screen
      settings: [
        { type: "select", key: "questionsPerRound", labelKey: "settings.questionsPerRound", options: [5, 10], default: 10 },
        { type: "range", key: "duration", labelKey: "settings.duration", min: 30, max: 120, step: 15, default: 60, unit: "s" },
      ],
    },
  ],
};

/** Whatever your stage needs; the framework only requires `id`. */
export interface SpotQuestion extends StageQuestion {
  value: number;
  isPrime: boolean;
}
```

Register it in `shared/games/index.ts`.

Every stage should have a `duration` setting — the framework uses it as the round
length. (A stage can override this with `getDurationSeconds`.)

### 2. Write the server stage handlers

`server/games/primes.ts`:

```ts
import { primesSpec, type SpotQuestion } from "../../shared/games/primes";
import { speedPoints } from "../../shared/framework";
import { createStageGame, type StageHandler } from "../framework";

const spotStage: StageHandler<SpotQuestion> = {
  id: "spot",

  createQuestions({ settings }) {
    return Array.from({ length: Number(settings.questionsPerRound) }, (_, id) => {
      const value = 2 + Math.floor(Math.random() * 98);
      return { id, value, isPrime: isPrime(value) };
    });
  },

  evaluate(question, answer, { questionMs }) {
    const correct = answer === String(question.isPrime);
    return { correct, points: correct ? speedPoints(questionMs / 1000) : 0 };
  },
};

export default createStageGame(primesSpec, [spotStage]);
```

Register the handler in `server/games/index.ts`.

`createStageGame` takes care of the rest: it resolves the active stages, builds one
round per stage, blocks answers from the host and answers to already-answered
questions, records timing and streak, applies the combo bonus, ends the round when
everyone has answered or the clock runs out, and reports results.

A handler can also provide:

| Member | Use |
| --- | --- |
| `createExtra(ctx)` | Per-round state for stages that are not question based |
| `onAction(data, payload, playerId, ctx)` | Handle actions other than `answer`; mutate `data.extra`, return `true` when something changed |
| `scorePlayer(data, playerId)` | Custom score when points-per-answer does not fit |
| `getDurationSeconds(ctx)` | Round length when it is not the `duration` setting |

`ctx` carries the stage's resolved `settings`, the `round` number, `totalRounds`
and the non-host `players`.

### 3. Write the client stage components

`src/games/primes/stages/Spot.tsx`:

```tsx
export default function SpotStage({ question, submit }: StageProps<SpotQuestion>) {
  if (!question) return null;          // the shell shows "all answered" for you
  return (
    <div className="flex flex-col items-center gap-6">
      <span className="text-5xl">{question.value}</span>
      <div className="flex gap-4">
        <GameButton onClick={() => submit("true")}>Prime</GameButton>
        <GameButton onClick={() => submit("false")}>Not prime</GameButton>
      </div>
    </div>
  );
}
```

A stage component receives `StageProps`: the round `data`, the `question` this
player still has to answer (or `null`), `answeredCount`, `submit(answer)`,
`sendAction(payload)` for anything that is not an answer, the resolved `settings`,
`isHost` and `playerId`. It renders the question and nothing else — timer, score,
streak, progress, feedback flash and the host view come from `StageShell`.

Wrap the stage's primary button in `<StageActionBar>` (exported from
`StageShell`). It is portalled into the bar pinned to the bottom of the screen,
so "Abschicken" stays in reach however far the stage scrolls; the bar hides
itself when a stage puts nothing in it (a host view, or answers that are buttons
in their own right).

`src/games/primes/index.ts`:

```ts
import { primesSpec } from "../../../shared/games/primes";
import { defineGame } from "../../lib/game-registry";
import SpotStage from "./stages/Spot";

export default defineGame(primesSpec, {
  spot: { Component: SpotStage },
});
```

Register it in `src/lib/game-registry.ts`. `defineGame` throws if a stage has no
component or a component has no stage, so a typo surfaces immediately.

Optional per stage:

| Key | Use |
| --- | --- |
| `RulesExample` | A small illustration shown with the rules |
| `questionless` | `true` for stages without questions, so the component renders anyway |
| `HostView` | Replaces the default progress list the host sees |
| `scorePlayer` | Client-side mirror of the handler's `scorePlayer` |

### 4. Add the translations

`src/locales/en.json` and `src/locales/de.json`:

```json
"primes": {
  "title": "Prime Hunt",
  "description": "Spot the primes before the time runs out.",
  "stages": {
    "spot": {
      "name": "Spot the Prime",
      "summary": "Prime or not prime?",
      "rules": "Decide for {{questionsPerRound}} numbers whether they are prime. You have {{duration}} seconds."
    }
  }
}
```

The rules text is interpolated with the stage's settings, so `{{duration}}` and any
other setting key can be used directly. Labels shared by several games
(`settings.duration`, `settings.questionsPerRound`, …) live under `settings` — reuse
them instead of adding a new key per game.

### 5. Check it

```
npm run check:games   # specs, handlers, one round per stage, translations
npm run build         # types + client bundle
npm run dev           # client, plus `npm run dev:server` for the game server
```

`check:games` builds a round of every stage, feeds it a nonsense answer and verifies
that it is graded rather than crashing, and reports any missing translation.

## Colour

Every game owns one colour from `GameColor` (`shared/types.ts`), and no two games
may share one — `validateGameSpecs()` rejects a duplicate. The point is practical:
in a lesson the teacher and thirty students each hold their own screen, and the
colour is how they check at a glance that they are all in the same game.

The shades live in `src/lib/game-theme.ts`. A page announces its game with
`useActiveGame(game)`; `Layout` then puts that palette's `--game-*` variables on
the app shell and shows the colour strip and the game badge in the header. Every
`game-*` utility reads those variables, so a stage that writes `bg-game-50` or
`text-game-ink` is automatically painted in whatever game it is running inside.
Outside a game the variables fall back to the brand palette.

Which shade to reach for:

| Utility | Use for |
| --- | --- |
| `bg-game-solid`, `hover:bg-game-solid-hover` | Filled buttons and anything else carrying white text |
| `text-game-ink` | Coloured text and headings on white or a `50`/`100` tint |
| `bg-game-50`, `bg-game-100` | Card and panel tints |
| `border-game-200`, `border-game-300`, `border-game-solid` | Resting, hover and active borders |

Do not use `bg-game-500` behind white text: the warm palettes are far too light
at 500, which is exactly why `solid` exists.

## Settings schema

Settings are declarative so that one schema drives both the host UI and the
server-side validation. Four field types exist:

```ts
{ type: "select", key, labelKey, options: number[], default }
{ type: "range",  key, labelKey, min, max, step, default, unit?: "s" }
{ type: "toggle", key, labelKey, default }
{ type: "choice", key, labelKey, options: { value: string, labelKey }[], default }
```

`select` picks a number and shows it as is; `choice` picks a named value and shows
the translation of its `labelKey` (see the notation setting of the rational game).

The server never trusts what the client sends: `resolveGameSettings()` drops unknown
stages and keys, clamps ranges to `[min, max]` and snaps them to `step`, rejects
select and choice values outside `options`, and fills in defaults for anything missing. The
same function renders the lobby form, so both sides always agree.

The stage selection is normalized the same way: unknown ids are dropped, the order
follows the spec, and an empty selection falls back to every stage — a session
always has at least one round.

## Scoring

`shared/framework.ts` holds the scoring rules so that games stay comparable:

- A stage returns `{ correct, points }` from `evaluate()`; `points` is the base
  score, normally 0–100.
- `speedPoints(seconds, perSecond?, floor?)` turns the time a player needed into
  points, measured per question rather than from the round start.
- `closenessPoints(relativeError, zeroAt?)` scores "how close did you get" —
  full points at no error, nothing from `zeroAt` upwards. Used wherever a player
  places, draws or tunes something instead of typing an exact answer.
- The framework applies the combo bonus for consecutive correct answers:
  +10% per step, capped at +50% (`comboMultiplier`).
- A round's score is the sum of the awarded points, unless the stage defines
  `scorePlayer`. Round scores add up to the player's total across rounds.

## Drawing a graph

The two drawing stages of the analysis game accept a graph in one of two ways,
picked by the host with the `inputMode` setting:

- **Freihand** — the player draws the curve with a finger, a pencil or the mouse.
- **Punkte setzen** (the default) — the player drags a handful of points and an
  interpolating spline runs through them. This follows Chieko Komoda, *Automatic
  Grading of Online Graph Plotting Problems* (ACA 2025): students first work out
  the y-intercept and the turning points by differentiation, then place points
  there, and the curve follows. The number of points comes from the shape of the
  curve — one per turning point plus the ends and the y-axis. That count is the
  scaffolding, so it is fixed by default; with the `extraPoints` setting on, a
  player may tap the grid for up to three more points (and tap one to remove it),
  never dropping below the count the question started with. The cap keeps the
  exercise about key points instead of tracing the curve with a dense chain.

The curve is the **Oshima spline** (`shared/spline.ts`), a chain of cubic Bézier
segments whose control points are `P_j + c·(P_{j+1} − P_{j−1})` with a coefficient
`c` that adapts to the spacing and the angle of the neighbouring points; for
evenly spaced points on a line it reduces to Catmull-Rom's ⅙. Definition:
Takato & Vallejo, *Using Oshima splines to produce accurate numerical results and
high quality graphical output*, Math. Comput. Sci. 14 (2020) 399–413
([arXiv:1905.04664](https://arxiv.org/abs/1905.04664)), section 2.

Both modes are graded the same way: the submitted curve is sampled against the
target function and the mean error — as a share of the plot's y range — becomes
the score. In points mode the server rebuilds the spline from the submitted
points rather than trusting a curve from the client.

## Lehrplan-Abdeckung

The games follow the school's binding unterrichtsvorhaben (SILP, `wissen/uv.tsv`
in the `schule-material` repository). Each game carries the Jahrgangsstufen it
serves in `grades`; this table says which vorhaben a stage was built for.

| UV | Titel | Spiel | Stationen |
| --- | --- | --- | --- |
| `UV-MAT-SEK1-07-01` | Rationale Zahlen | `rational` | arrange (Anordnung), calculate (Grundrechenarten), signs (Vorzeichenregeln), change (Zustandsänderungen, Zeitzonen) |
| `UV-MAT-SEK1-07-06` / `08-01` | Zufallsexperimente | `chance` | laplace (einstufig), tree (zweistufig, Pfadregeln) |
| `UV-MAT-SEK1-08-02` | Terme mit mehreren Variablen | `terme` | build (Terme aufstellen), evaluate (Termwert, wertgleiche Terme), collect (Zusammenfassen), expand (Klammern auflösen), factor (Ausklammern), binomial (binomische Formeln), zero (Satz vom Nullprodukt), fraction (Bruchgleichungen), rearrange (Formeln umstellen), inequality (Ungleichungen) |
| `UV-MAT-SEK1-09-01` | Quadratwurzeln und reelle Zahlen | `squareroot` | speed, numberline, classify (Zahlbereiche), simplify (Wurzelgesetze), bisect (Intervallhalbierung) |
| `UV-MAT-Q1GK-01` / `Q1LK-01` | Extremwertprobleme | `extremum` | derive (hilfsmittelfrei ableiten), optimize (Nebenbedingung → Zielfunktion → Maximum) |
| EF/Q1 Analysis | Ableitungsbegriff | `analysis` | multiple-choice, draw-graph, draw-derivative |

Two rules the SILP sets that the games keep to: every stage marked
*hilfsmittelfrei* has to be solvable without a calculator (from year 7 every
class test has such a part), and the Zufallsexperimente stay two-stage —
conditional probabilities and the Vierfeldertafel belong to the EF.

The `terme` stages follow the chapter order of EdM 8, Kapitel 2, so a stage can be
played the week its lesson is taught: build and evaluate (2.1), collect (2.2/2.3),
expand (2.4/2.5/2.7), factor (2.6), binomial (2.8), zero (2.9), fraction (2.10),
rearrange (2.11), inequality (2.12). Its *binomische Formeln* are the verbindlich
new content of the vorhaben, which is why that stage runs in both directions, and
the Bruchgleichungen keep to the SILP's *ohne Doppelbrüche*.

Together the ten stages cover every entry of *Das Wichtigste auf einen Blick*
(EdM 8, S. 92–93), and the generators are built to reach that page's own examples:
monomials carrying two variables and a power (`xy²`, `56x²y`), a common factor of
`2xy` rather than only `2x`, a minus bracket of three terms, a product of two
brackets over three variables (`(4x − 3y)(2x + 3z)`), and a Bruchgleichung with the
variable in *both* denominators, cleared with the Hauptnenner. `scripts/` has no
test for this; `check:games` only proves a stage runs. What keeps the coverage
honest is sampling the generators and asserting each of those shapes actually
turns up.

Two things from those pages are deliberately left out: the Rechenbaum and the
Termtyp of "Bist du fit?" Aufgabe 1, which need a tree editor rather than a term
field. The `fraction` stage also only asks for a single excluded value, so the
Hauptnenner shape — which excludes two — is always asked to be solved.

## Writing a term

Stages that ask for a term use `TermInput`, a [MathLive](https://mathlive.io)
math field: the player writes `3x²` or `(x+3)(x−2)` as it looks on paper, with a
virtual keyboard on a tablet, and the stage receives LaTeX. MathLive is loaded on
demand, so only the games that ask for a term pay for the library; it renders with
the KaTeX fonts the app already ships.

`shared/term-algebra.ts` reads that LaTeX on the server. It keeps two
representations, because for these tasks the *shape* of an answer is part of the
answer:

- a **Term** — the canonical value, a sorted list of monomials with rational
  coefficients. Two terms are equivalent exactly when their canonical forms match.
  `evaluateTermExact` substitutes fractions without going through a float, so
  `(x² + x) : 2` at `x = ⅔` is exactly `5/9`.
- a **Node** — the syntax tree of what was typed, which records where the brackets
  were.

That is what lets the stages grade what they actually asked for.
`gradeSimplified()` demands a sum of monomials with nothing left to collect, so
`3(2x−5)` and `6x−10−5` are both rejected for `6x−15`. `gradeFactored()` demands a
product, and with a common monomial it demands the whole one, so `2(6x+9)` does not
pass for `12x+18` where `6(2x+3)` does. Equivalent spellings stay equivalent
throughout: `0,5x`, `x/2` and `\frac{x}{2}` are one and the same answer.

The parser accepts only what a term can contain. Anything else — `\sqrt{x}`, an
unfinished `\placeholder{}` — is unreadable rather than half-understood, and is
graded as a wrong answer instead of crashing the round.

### Quotients and relations

Two stages need more than a polynomial, and `term-algebra.ts` grows exactly as far
as they require:

- **Rearranging a formula** produces answers a polynomial cannot express: solving
  `A = a · b` for `b` gives `A/a`. `RationalTerm` is a quotient `num/den`, compared
  by cross-multiplying, so `U/2 − b` and `(U − 2b)/2` are one answer and the player
  is free to stop wherever the formula is solved. `parseTerm` still refuses to
  divide by a variable — the polynomial stages ask for polynomials — while
  `parseRational` allows it.
- **Inequalities** are answered as a whole statement, `x < 4`, because deciding
  whether the relation turns round is the exercise. `parseInequality` reads `<`,
  `>`, `\le`, `\ge` and their unicode and `<=`/`>=` spellings (a math field turns
  `<=` into `\le` as it is typed), and it reads `4 > x` as the same statement as
  `x < 4`. Something still to be solved — `2x < 8` — is not a solution and is not
  accepted as one. The relation is found with `splitRelation`, which knows that the
  `\le` inside `\left` is not a relation.

## Conventions

- Stage ids are stable: they appear in i18n keys and in stored lobby settings.
- Question types live next to the spec in `shared/games/<game>.ts`; both sides import them.
- Anything a stage sends is a string (`submit(answer)`); complex answers are JSON.
  The server caps answer length and ignores answers it cannot parse.
- Keep the pure logic (question generation, grading) in the handler and out of the
  components, so `check:games` can exercise it.
