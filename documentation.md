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

While a round runs, the host sees the class ranked by **that round** — not by
the running total, on purpose: a player who is out of the running overall can
still win the round they are in, and seeing that keeps them playing. The totals
come back the moment the round ends, with what it added beside them. The rows
are placed rather than stacked so a change in the order slides instead of
jumping — on a projector that is the difference between watching an overtake
and noticing afterwards that it happened. The host can also stop a round before the clock does
(`end-round`, host only), which a lesson needs: a class that has all finished,
a bell about to go, a station that turned out to be too hard. Whatever has been
answered counts, and the rest counts for what it would have counted for had the
clock run out on it.

Whoever takes a round is **crowned** for it, on `Player.crowns`, and that is
kept well away from the points. A session where one player is simply better
than everyone else is a session the rest stop playing in, so the round is a
second thing to win: come fourth overall with two crowns and the last screen
says so by name. A tie is won by everybody in it — a tiebreak nobody can see
would be worse than sharing — and a round where nobody scored is a round nobody
won. Crowns reset with the scores when the host restarts.

```
 lobby ──► explanation ──► countdown ──► playing ──► round-finished ──► … ──► finished
           (stage rules)     (3, 2, 1)   (stage UI)   (next stage)
                                          ▲
                                          the round's clock starts here
```

A round is **built** when the rules go up, because that is when the client
needs its questions, and it is **begun** when play starts — which can be a long
time later, since the host holds the rules screen for as long as they want to
talk. Everything timed therefore counts from `onRoundBegin` and not from the
build: the clock in the header, when the round runs out, how long the first
answer took, and the timeline of a live stage. A stage that stamped a clock
reading of its own while it was being built puts it right in `onBegin`.

## Where things live

| File | Purpose |
| --- | --- |
| `shared/framework.ts` | The contract: settings schema, `GameSpec`/`StageSpec`, round data, scoring helpers |
| `shared/games/<game>.ts` | One game's spec (metadata + stages + settings) and its question types |
| `shared/games/index.ts` | Registry of all specs, plus `validateGameSpecs()` |
| `server/index.ts` | The Node process: HTTP for opening a lobby, one WebSocket per player |
| `server/rooms.ts` | One lobby in memory — phases, timers, broadcast — and the registry of all of them. Also the tick a live round runs on |
| `server/store.ts` | SQLite: lobbies mirrored for restart recovery, results written when a game ends |
| `server/auth.ts` | Teacher accounts: one gate, `teacherFrom()`, and no public sign-up |
| `server/framework.ts` | `createStageGame()` — runs rounds, records answers, ends rounds |
| `server/games/<game>.ts` | One stage handler per stage: generate questions, grade an answer |
| `src/lib/game-registry.ts` | `defineGame()` — joins a spec with its React components |
| `src/lib/game-theme.ts` | The colour palettes and the `--game-*` variables that paint a game's screens |
| `GameMeta.hidden` | Keeps a game out of the arena while leaving it registered, checked and reachable by URL — the example game, which is a template rather than something a class plays |
| `src/games/<game>/stages/*.tsx` | One component per stage: render the current question |
| `src/components/StageShell.tsx` | The bars around a stage: round, score and clock pinned under the app header, the stage's action pinned to the bottom edge (`StageActionBar`) — or the host's, through `hostAction` — plus the ranked host view and feedback |
| `src/lib/lobby-session.ts` | `useLobbySession()` — which round is on and what it came to, for all three screens that watch a lobby |
| `src/pages/Review.tsx`, `ReviewSession.tsx` | Lessons after the fact — see "After the lesson" |
| `src/components/AnswerGrid.tsx` | One round read down the names instead of across the questions |
| `src/pages/Demo.tsx` | The teacher playing a game alone, to try it out — see "Trying it out first" |
| `src/pages/Preview.tsx` | One stage on its own with no server and no lobby, `/preview` — development only, see "Looking at one stage" |
| `src/components/StageRules.tsx` | The rules screen before a round |
| `src/components/StageSettingsForm.tsx` | The host's stage picker and settings, built from the schema |
| `src/components/NumberLine.tsx` | Ticks, click-to-pick and markers on an axis |
| `src/components/PlotCanvas.tsx` | Coordinate system: curves, markers, and a curve the player draws. It sizes itself from the viewport height minus `reserveRem` — the room the rest of the stage needs — so the whole stage stays on screen on a tablet |
| `src/components/MatchBoard.tsx` | Cards dropped into slots (drag, or tap card then slot) |
| `src/components/TermInput.tsx` | A MathLive math field: the player writes a term, the stage gets LaTeX |
| `src/components/Calculator.tsx`, `src/lib/calculator.ts` | The scratch calculator a station lends the class (`calculator` on a stage), and the parser behind it |
| `src/components/ParameterSliders.tsx` | One slider per parameter, for "tune it until it fits" stages |
| `shared/<topic>-math.ts`, `shared/polynomial.ts`, `shared/matching.ts`, `shared/term-algebra.ts` | Topic logic both sides share: fractions, roots, probability trees, polynomials, card assignments, terms with several variables |
| `shared/code-answer.ts` | How a typed answer is read, in any language: numbers as numbers, `wahr` for `true`, a multi-line output as a sequence |
| `shared/python-turtle.ts`, `shared/python-code.ts` | The turtle a program is written into and drawn from, and the shape of a Python listing |
| `shared/java-code.ts`, `shared/java-structogram.ts` | How Java prints a value and what `/` and `%` do to two ints; the Struktogramm both sides draw |
| `src/components/CodeBlock.tsx` | A listing, optionally numbered and clickable line by line. A `Language` — one per game, in `src/games/<game>/components/CodeBlock.tsx` — says how to split a line and which token gets which colour |
| `src/games/java/components/Structogram.tsx` | A Struktogramm drawn with borders: statement, Verzweigung, kopf- and fußgesteuerte Schleife |
| `shared/intuition-graph.ts`, `shared/intuition-cipher.ts` | The little graph two stations are drawn on — crossings, a planar generator, a shortest path — and the ring of letters a third one turns |
| `src/games/intuition/components/Board.tsx` | The 100x100 square both map stations draw on: edges, nodes, and whatever a node does when it is touched |
| `src/games/intuition/components/PixelPicture.tsx` | A glyph squeezed through an n-by-n canvas and blown back up, so a blocky picture needs no image file |
| `src/games/intuition/stages/LiveSummary.tsx` | What a live round comes to: hits, misses, longest run, average reaction |
| `scripts/check-games.ts` | `pnpm check:games` — smoke test for every registered game |
| `src/lib/auth.ts`, `src/pages/Login.tsx`, `src/components/RequireTeacher.tsx` | Signing a teacher in, and the screens that need one |
| `scripts/check-server.ts` | `pnpm check:server` — signs in, opens a lobby, plays a round, restarts the server |
| `scripts/teacher.ts` | `pnpm teacher add\|list\|password\|remove` — the only way accounts exist |
| `deploy/nginx.conf` | Example reverse proxy; running the server is covered in the [README](README.md) |

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
| `revealMs` | Holds the question just answered on screen for this long, with `revealed` set, so the stage can show the answer where the answer was given. The shell owns the timing and the clock keeps running; the stage only draws itself differently (`squareroot` numberline is the worked example) |
| `calculator` | `true` lends the player a scratch calculator in the bottom bar, for a station whose questions do arithmetic nobody should have to do in their head against a clock (the Java and Python trace stations). It never sees the question — reading `7 / 2` as 3.5 and knowing Java prints 3 is still the player's half |
| `HostView` | Replaces the default progress list the host sees |
| `scorePlayer` | Client-side mirror of the handler's `scorePlayer` |
| `Review` | One row of the round review on the players' devices |
| `ClassAnswers` | The class's answers to one question, for the host's debrief — see "Talking the round through" |

Once a round is over, every player sees their own answers on their own device:
each question of the round with a tick or a cross, what they answered and what it
scored (`src/components/RoundReview.tsx`). Without a `Review` a row still shows the
answer and the points; a `Review` adds the question itself and, when the answer was
wrong, the right one. **Every game has one** — a row that says only "0 Punkte"
leaves a player to work out for themselves which of ten questions that was
about, which is the half of the round where the learning was supposed to
happen. The frame the rows share (`game.yourAnswer`, `game.correctAnswer`, the
"nicht beantwortet" line) is `src/components/review-parts.tsx`; only the middle
of it is worth writing per stage. It receives `{ question, answer, data, playerId }` — `answer`
is `undefined` for a question the round ran out on — and renders into a row the
review draws the frame of, so keep it to a line or three and use `ReviewLine` for
the "label: value" lines (`src/games/terme/stages/reviews.tsx` is the example).

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

### Looking at one stage

`npm run dev` on its own, with no game server and no account, serves
`/preview` — an index of every stage, each a link to itself. A stage opened
that way plays for real: the page builds the round with that game's own
handler, `server/games/<game>.ts`, and grades the answers with it, so what is
on screen is what a class would get. "neue Aufgaben" builds another round, for
the questions that come out differently every time.

It is development only. `src/App.tsx` mounts the route behind
`import.meta.env.DEV` and loads the page lazily, so neither it nor the question
generator it pulls out of `server/` reaches the production bundle.

It is not a substitute for "Trying it out first" below — there is no rules
screen, no round result, no clock that means anything and nobody else in the
lobby. It answers a narrower question: what does this stage look like, and does
it still work.

## Live stages

Most stages are a list of questions: the player answers each one once, the
framework records it, and the round ends when everybody is through or the clock
runs out. A **live stage** is the other kind — one the player acts *in*.
Targets appear and have to be hit; a light turns green and has to be beaten.
There is no question to be on, and the round only ever ends on the clock.

A stage handler declares itself with `live: true`, and three things change.

**It keeps a tally, not answers.** Thirty players resolving fifty targets each
would put fifteen hundred answer objects into a round that is broadcast on a
tick. Instead each player has one `LiveTally` in `extra.tally` — points, hits,
misses, streak, best streak, total reaction — written with `recordLiveEvent()`,
which applies the same combo bonus the question path applies so a run of ten
targets is worth what a run of ten right answers is worth. `questions` stays
empty, which is also what keeps the progress counter and the per-question
review out of the way.

**It is broadcast on a tick, not on every action.** This is the part that
decides whether the stage works in a room of thirty. A question game sends a
few hundred messages a round; a class tapping four times a second sends
thousands, and every one of them would otherwise cost a SQLite write and one
serialised copy of the round per socket. `Room` runs an interval for as long as
a live round lasts, `server/index.ts` calls `markLive()` instead of saving and
broadcasting, and the tick sends the round once if anything changed. SQLite is
written far less often again (`LIVE_SAVE_MS`), because what a restart has to
put back is the round, not the last quarter-second of it.

The beat is a cost as much as a cadence — the whole round goes out on each one,
timeline included — so a stage picks its own with `tickMs`. `ziele` carries a
fifty-target timeline that never changes and only wants the scoreboard to keep
up, so it beats once a second. `ampel` carries almost nothing but has to get
its own state onto thirty screens together, so it beats four times as often.

**It can move by itself.** `onTick(data, now, ctx)` is called on that same beat,
so a stage does not have to wait for a player to do something. That is what
makes the traffic light possible: when it turns green is decided on the server,
on the tick, and sent — so it is not in anything the device was given in
advance. It could not be. Every other stage in the app ships its answer to the
client (the Caesar shift, the expected output), and a determined student with
the network tab open has always been able to read it; a station whose answer is
*how fast can you react* is the one where that would not be cheating so much as
replacing the exercise.

Two things a live stage has to get right, and both are about not measuring the
wrong thing:

- **The device does the timing, the server does the scoring.** The shooting
  gallery's whole timeline goes out with the round so that thirty devices show
  the same target at the same moment whatever the wifi is doing. What the
  device sends back is when each target was resolved, in order; the server
  decides what that was worth, and throws out anything faster than
  `MIN_REACTION_MS`, anything arriving after the target was gone, and anything
  out of order — which needs no bookkeeping at all, because the next target a
  player may report is always `hits + misses`.
- **Latency must not look like slowness.** The traffic light is measured from
  the moment green arrived *on the device*, not from the moment the server sent
  it. On school wifi those two are a reaction time apart, and counting the
  difference would turn the station into a test of the connection. The cost of
  that choice is one edge case, handled in `Ampel.tsx`: a device that arrives
  in the middle of a light never saw it turn, so it sits that light out instead
  of being handed a reaction to nothing — otherwise reloading during green
  would be worth a hundred points, which a class would find in one lesson.

`RoundSummary` replaces the round review for these, since there is no list of
questions to walk back through — what there is, is the tally.

## Talking the round through

A leaderboard tells a teacher who won. What they leave the lesson needing is
the other thing — which question the class fell over, and the question itself,
large enough to put back on the wall. `src/components/RoundDebrief.tsx` is that
screen: the round's questions ranked hardest first, and any one of them opened
up with the question as it was asked, the right answer, and what the class
actually said.

It is **folded away by default**. Most rounds a teacher wants to get on with
the next one, and a wall of statistics between them and that button would be
worse than nothing.

Nothing is stored and nothing is asked for. When a round ends the host's own
copy of it still holds every player's answers, so all of this is arithmetic on
something already on screen.

The question is drawn by **the stage's own `Component`** — the only way to show
it exactly as the class saw it, and the only way that works for every game
rather than the three that happen to have a `Review` row. It is handed a submit
that does nothing and a bottom bar that is not in the document, and the whole
subtree is `inert`: nothing in it can be clicked, and nothing in it can take
focus, which matters because stages focus their answer box on mount and the
page would otherwise jump to a field that is not there to be filled in.

Two optional hooks let a game say more, and the screen is useful without either:

| Hook | What it adds |
| --- | --- |
| `Solution` | The right answer on its own. For the case the data cannot cover: the question *nobody* got, where the answer appears nowhere on the board |
| `answerLabel` | What a stored answer means. A stage that takes typed text needs nothing; one whose answers are `"2"` or a line number does, or the class's answers read as a column of indices |
| `ClassAnswers` | The class's answers drawn the way the question was, replacing both the question as asked and the list under it. It gets `{ question, answers, data }`. For a stage whose answers are *positions* or *shapes*: twenty decimals in a column say nothing that twenty marks on a number line — or twenty curves over the right one — say at a glance |

`java` has both (`src/games/java/stages/solutions.tsx` and `answer-labels.ts`),
which is five components between eleven stations because the stations share
their components. Every other game still gets the question, the ranking and the
distribution — and its `Review` already renders the right answer for the
player, so a `Solution` for it is mostly a matter of lifting that half out.

**A stage whose answers are not words needs one of the two.** Without an
`answerLabel` the list prints the answer as it was stored, which for a station
that sends JSON is a column of truncated `{"min":2.75,…` — and for a
continuous answer, one such row per player. Either give it a label (`chance`
and `intuition` do, in their own `answer-labels.ts`) or give it a
`ClassAnswers` that replaces the list with the picture: the marks on a number
line (`squareroot` numberline and bisect, `rational` arrange, `extremum`
optimize), the class's curves over the right one (`analysis`), every route
taken across the map (`intuition` weg), or the colours they mixed (`intuition`
farbe).

## After the lesson

The debrief above is for the minute after a round, while the class is still in
the room. The other half of the same need comes later: the lesson is over, the
lobby is long gone, and the next one has to be planned. `/review` is that —
every lesson this teacher has played, and inside one, every round it played.

**A round is stored as it ends**, not when the game does (`Room.endRound` →
`store.saveRound`). A lesson that stops at the bell and a lobby closed on the
way out of the room are both normal, and either would otherwise take the round
with it. A demo stores nothing: a rehearsal is not a lesson.

What is stored is **the round itself** — its questions, its settings, and every
player's answer — as JSON in the `rounds` table, with the player list beside it
because names are not in the round. That is what lets the review screen hand
the question back to the stage's own `Component` and have a Struktogramm still
be a Struktogramm rather than a row of stored strings. Around 5 KB per round for
seven students, so about 20 KB for a full class; a single answer is cut at
`MAX_STORED_ANSWER` so one pathological drawing cannot set the size of the
table.

Each round is then shown **both ways round**:

| Screen | Sorted by | Answers |
| --- | --- | --- |
| `RoundDebrief` | the questions, hardest first | what to teach again |
| `AnswerGrid` | the students, by how many they got | who to teach it to |

They read the same stored round; the grid is it turned ninety degrees. Clicking
a name gives that student's round in words — every question, what they wrote,
whether it was right — which is the thing that was not recoverable at all
before, because the lobby took it with it.

**Every endpoint is scoped by teacher id in the SQL**, not by the code. A code
is six characters and guessable, and it must not be a key to somebody else's
classroom: another teacher asking for it gets a 404, which `check:server`
verifies by asking as the wrong teacher — for the delete as well as the reads,
where being wrong would cost somebody their lesson rather than merely leak it.

**Deleting** takes the rounds and the scores together, and there is no undo and
no copy kept — which is the point, since a teacher who wants a class's answers
gone wants them gone. The screen therefore asks twice, and puts the second
question somewhere the first click cannot reach: arming it turns the trigger
into "cancel" and the destructive button appears on its own row underneath. The
first arrangement had them overlapping, so a double click deleted the lesson;
the trigger's centre landing inside the confirm button is the kind of thing
that has to be measured rather than eyeballed.

## Trying it out first

Preparing a lesson with one of these means knowing what the round will actually
feel like: how hard the questions come out at this setting, whether sixty
seconds is too long, what the stage looks like blown up on the projector. None
of that can be read off the settings form. Finding it out by opening a lobby
and joining it from a second device works, and is enough of a nuisance that it
does not get done.

So **"Ohne Klasse ausprobieren"**, under the create-lobby button on a game's
page, opens a lobby with the class left out. It is not a simulation — a
rehearsal against a mock is worth nothing. It is the real server running the
real rounds, with one difference: the lobby opens with a **single player seat**
(`demoPlayerId(hostId)`, in `shared/types.ts`) and the host's own actions are
recorded against it. The teacher holds both seats at once, which is the whole
point: they see the rules screen they would be reading out, then play the stage
a student would play, and when the round ends they get the player's review and
the host's debrief on the same screen, because in a rehearsal there is nobody
to hide either from.

Three things make it a rehearsal rather than a lesson:

- **Nobody can join it.** The code is never shown, and `join` is refused
  outright, so a guessed code cannot put a student in a lobby with no lesson in
  it.
- **Nothing is written down.** `endRound` skips `store.saveResults`, so what a
  teacher scored playing against themselves stays out of the record of what
  classes scored.
- **It gives way.** One lobby per teacher still holds, but a demo has nobody in
  it, so asking for a class lobby closes it and carries on rather than making
  the teacher go and find it first. The reverse never happens: a lobby with a
  class in it gives way to nothing, a demo included — losing a class to a stray
  click on "try it out" would be the worst thing that button could do.

The one thing the demo screen adds to a stage is `StageShell`'s `sideAction`,
which puts the host's "Runde beenden" in the bottom bar next to the stage's own
button. One person holding both seats needs both, and a sixty-second live stage
should not have to be sat through twice to get to the debrief.

`pnpm check:server` plays a demo round end to end and checks all three
guarantees, including that the teacher's taps actually score — without the
attribution they land on the host and score nothing, which is what the check
catches.

## Colour

Every game owns one colour from `GameColor` (`shared/types.ts`), and no two games
may share one — `validateGameSpecs()` rejects a duplicate. The point is practical:
in a lesson the teacher and thirty students each hold their own screen, and the
colour is how they check at a glance that they are all in the same game.

There are seventeen, and that is close to as many as the list can hold. Two
rules keep a new one honest, and `check:games` enforces the second:

- **A `solid` is the lightest shade of its hue that still carries white text at
  4.5:1.** That is not a new rule — computing it reproduces every one of the
  first ten exactly. Where that shade lands too near a colour already in use,
  go one step darker; `red` is a step darker than `pink` or `blue` for exactly
  that reason.
- **No two colours may look closer than the closest pair already does.** Amber
  and orange were 4.1 apart in OKLab when there were ten of them, so that is
  the floor — not a standard imposed after the fact, but the standard the list
  already met, written down so the eighteenth colour cannot quietly be a second
  amber. `emerald` fails it at 3.9 against teal, which is why it is not here.

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
server-side validation. Five field types exist:

```ts
{ type: "select", key, labelKey, options: number[], default }
{ type: "range",  key, labelKey, min, max, step, default, unit?: "s" }
{ type: "toggle", key, labelKey, default }
{ type: "choice", key, labelKey, options: { value: string, labelKey }[], default }
{ type: "multi",  key, labelKey, options: { value: string, labelKey }[], default: string[] }
```

`select` picks a number and shows it as is; `choice` picks a named value and shows
the translation of its `labelKey` (see the notation setting of the rational game).
`multi` is `choice` with checkboxes instead of a dropdown: the host picks any
combination and the value is a `string[]` in spec order (see the operations setting
of the rational game's calculate stage). The form keeps the last box checked, and
the server puts the whole default back if an empty selection arrives anyway.

The server never trusts what the client sends: `resolveGameSettings()` drops unknown
stages and keys, clamps ranges to `[min, max]` and snaps them to `step`, rejects
select, choice and multi values outside `options`, and fills in defaults for anything
missing. The same function renders the lobby form, so both sides always agree.

The stage selection is normalized the same way: unknown ids are dropped, the order
follows the spec, and an empty selection falls back to every stage — a session
always has at least one round.

## Scoring

`shared/framework.ts` holds the scoring rules so that games stay comparable:

**Every stage is worth the same.** A round of any station scores `ROUND_POINTS`
— a hundred — before the combo bonus, and the score is the player's **average**
over the questions the round put in front of them rather than the sum of them.

That is not a detail. The host picks which stations a session plays, and they
are not the same size: fifteen quick true-or-false questions used to be worth
five times three untangling puzzles, so the station with the most questions
decided the game before anybody had answered anything. Averaging also means the
number each answer carries can stay what it always was — nought to a hundred
for that one question — so the round review still reads as "how did I do on
this one" while the round total reads as "how did I do", like a percentage. A
question nobody reached counts as a zero, which is what it cost before.

A live stage is averaged the same way, over `extra.offered` — how many events
the round has put on the table, which has to come from the round and not from
the player: counting only the events somebody got round to would score a player
who hit three targets and then put the tablet down a perfect hundred.

`scripts/check-games.ts` holds the line, playing a flawless round of every
stage and failing if it does not come to exactly `ROUND_POINTS`.

- A stage returns `{ correct, points }` from `evaluate()`; `points` is the base
  score for that one question, normally 0–100.
- `speedPoints(seconds, perSecond?, floor?)` turns the time a player needed into
  points, measured per question rather than from the round start.
- `closenessPoints(relativeError, zeroAt?)` scores "how close did you get" —
  full points at no error, nothing from `zeroAt` upwards. Used wherever a player
  places, draws or tunes something instead of typing an exact answer.
- The framework applies the combo bonus for consecutive correct answers:
  +10% per step, capped at +50% (`comboMultiplier`).
- A round's score is the average of the awarded points, unless the stage
  defines `scorePlayer` — and one that does still owes the same cap, as the tap
  stage of the example game shows. Round scores add up to the player's total
  across rounds, and after each round the players see that total with what the
  round just added beside it.

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
| `UV-MAT-SEK1-07-01` | Rationale Zahlen | `rational` | arrange (Anordnung), order (Ordnen der Größe nach, Betrag), calculate (Grundrechenarten), signs (Vorzeichenregeln), change (Zustandsänderungen, Zeitzonen) |
| `UV-MAT-SEK1-07-06` / `08-01` | Zufallsexperimente | `chance` | laplace (einstufig), tree (zweistufig, Pfadregeln) |
| `UV-MAT-SEK1-08-02` | Terme mit mehreren Variablen | `terme` | build (Terme aufstellen), evaluate (Termwert, wertgleiche Terme), collect (Zusammenfassen), expand (Klammern auflösen), factor (Ausklammern), binomial (binomische Formeln), zero (Satz vom Nullprodukt), fraction (Bruchgleichungen), rearrange (Formeln umstellen), inequality (Ungleichungen) |
| `UV-MAT-SEK1-09-01` | Quadratwurzeln und reelle Zahlen | `squareroot` | speed, numberline, classify (Zahlbereiche), simplify (Wurzelgesetze), bisect (Intervallhalbierung) |
| `UV-MAT-Q1GK-01` / `Q1LK-01` | Extremwertprobleme | `extremum` | derive (hilfsmittelfrei ableiten), optimize (Nebenbedingung → Zielfunktion → Maximum) |
| EF/Q1 Analysis | Ableitungsbegriff | `analysis` | multiple-choice, draw-graph, draw-derivative |
| `UV-INF-SEK1-10-01` | Computerprogramme mit System entwickeln | `python` | output (Grundrechenarten), variables (Variablen, Eingaben), loops (for/while/verschachtelt), branch (if/elif/else), logic (and/or/not), functions (Parameter, return), lists (strukturierter Datentyp), turtle (Programm → Bild), parsons (Quelltexte erstellen), bugs (Quelltexte auf Korrektheit prüfen) |
| `UV-INF-EF-02` bis `EF-06` | Grundlagen der Programmierung mit Java | `java` | output (Rechnen, `/` und `%`), types (Datentypen, Typumwandlung), variables (Zuweisungen, Kurzformen) — EF-II; logic (`&&`/`\|\|`/`!`), branch (Verzweigungen), loops (for/while/do-while/verschachtelt), structogram (Mehrfachrepräsentation) — EF-III; sorting (Suchen und Sortieren) — EF-IV; arrays (eindimensionale Felder) — EF-V; methods (Untermethoden mit und ohne Rückgabewert) — EF-VI; bugs (Fehlermeldungen lesen und korrigieren) |

Two rules the SILP sets that the games keep to: every stage marked
*hilfsmittelfrei* has to be solvable without a calculator (from year 7 every
class test has such a part), and the Zufallsexperimente stay two-stage —
conditional probabilities and the Vierfeldertafel belong to the EF. A third
holds for `python`: the fachkonferenz settled on **Python** for UV 10.1, so the
game is Python and nothing else.

`java` keeps to two more. The SILP calls Mehrfachrepräsentation *verbindlich* for
EF-III — every control structure shown as a Flussdiagramm **and** as a
Struktogramm — which is why `structogram` is a station of its own rather than an
illustration on a rules screen. And EF-V sets arrays as the **only** data
structure of the Einführungsphase, so nothing in the game reaches past a
one-dimensional `int[]`.

The stations follow the chapter order of the hyperbook's Lernpfad *Grundlagen
der Programmierung mit Java*, so a station can be played the week its lesson is
taught, and they stay inside the Java that Lernpfad teaches: `void main()` and
`IO.println` rather than `public static void main(String[] args)` and
`System.out.println`, the four primitive types, `String`, and one array.

Kapitel 6 of that Lernpfad — Objektorientierung, `UV-INF-EF-07` with its
24 hours — is deliberately not in the game. It is about modelling with class
diagrams rather than about reading a listing, so it needs a diagram editor and
belongs in a game of its own.

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

## The game with no vorhaben

`intuition` ("Bauchgefühl") is not in that table and carries no `grades`, and
both are on purpose.

Every other game asks the player to know something, which means every other
game is only playable by a class that has had the lesson. This one asks them to
look. Match the colour, switch the lamps until the number comes out, say what
the blurry picture is, turn the ring until there are words, pull the wires
apart, find the quickest way across the map, sort the cards by swapping
neighbours — each rule is one sentence, none of them contains a technical term,
and the first question of a round teaches the rule by being played. So it works
in the first lesson of Jahrgang 5, in a Q2 course, and on the parents' evening,
and a badge reading "5, 6" would only tell the wrong half of the school to stay
away.

Underneath, most stations are one idea from the subject with the vocabulary
taken off: place value (`lampen`), resolution (`pixel`), a shift cipher
(`drehen`), a planar drawing (`kabel`), a shortest path (`weg`), sorting by
adjacent swaps (`nachbarn`). Two are not pretending to be anything — `ziele`
and `ampel` are an aim trainer and a reaction test, they are the two live
stages (see **Live stages**), and they are in here because a round wants
somewhere to put its hands. That is meant to be useful rather than a joke at the player's
expense — a class that has spent ten minutes flicking lamps worth 1, 2, 4 and 8
has somewhere to stand when the word *Dualsystem* turns up later.

Three rules hold across its stations, and they are what make it the game that
gets asked for again:

- **Partial credit almost everywhere.** A colour that is nearly right, six of
  eight wires pulled apart, the second-best route, a row sorted the long way
  round — all of those score. `closenessPoints` exists for exactly this. A
  round where half the class ends on nothing is a round nobody replays.
- **The feedback is on screen while you work**, not afterwards: the running
  total under the lamps, the crossings still left, the minutes so far, the
  sentence coming apart as the ring turns.
- **Nothing ships.** The pictures are emoji the system already has, drawn to a
  canvas and squeezed down (`PixelPicture`), so a station about resolution
  needs no image files in the repository.

Two of the generators are tuned rather than merely correct, and the numbers are
worth keeping:

- `weg` makes about a third of its roads slow ones (`SLOW_ROAD_CHANCE`,
  `SLOW_ROAD_FACTOR`). Without that, minutes follow the drawn length closely
  enough that the route which *looks* shortest is already the quickest four
  times out of five, and there is nothing on the map worth reading. With it, a
  glance is right about half the time — often enough that a gut feeling is
  worth having, wrong often enough that the numbers are worth a look.
- `pixel` scores with `speedPoints(seconds, 6, 30)`. Steeper than that and
  stabbing at one of the four options straight away pays as well as waiting to
  actually see the thing: a blind guess is worth a quarter of 100, so
  recognising it a few seconds in has to be worth clearly more.

`kabel` is the one station whose generator has a real obligation: thirty people
must never be handed a tangle that cannot be undone. `buildPlanarGraph` earns
that by construction rather than by checking — it sorts every possible edge by
length and keeps one only when it crosses nothing already kept and passes no
third node closely enough to look like it does, so the drawing it is born in has
no crossings at all. The puzzle is that drawing with its positions dealt out
again, and putting them back is always a solution.

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

## Reading a program

The `python` and `java` games ask the player to be the machine, so every stage
shows a listing and takes back what the program does. Three things make that
work.

**The listing.** `src/components/CodeBlock.tsx` lays a listing out and knows no
language at all; each game hands it a `Language` that splits a line into tokens
and colours them. Both are deliberately crude — the Python one knows the
keywords, builtins and turtle commands of the Turtle-Lernpfad, the Java one the
primitive types, control structures and the handful of calls of the Java
Lernpfad — because nothing else is in the language those lessons teach. The two
tokenizers are not interchangeable: `//` starts a comment in Java and is floor
division in Python. With `numbered` and `onPickLine` the same component becomes
the bug hunt: every line is a button, and tapping one is the answer.

**The answer.** A value typed into a box is compared by `shared/code-answer.ts`,
which makes the obvious spellings equal: numbers as numbers, so `7`, `7.0` and
`7,0` are one answer and the int/float distinction never costs a point it was
not asked about; `wahr` for `true`; any of spaces, commas or newlines between
the lines of a multi-line output. A program that prints several lines is scored
line by line, so reading four of five loop passes correctly is worth something.

That leniency is why the Java game's `types` station offers its answers instead
of taking one: there, `9` and `9.0` *are* different answers, and a box that
accepted both would hide the very thing the question is about. Everything the
station needs to compute exactly — an integer division that truncates, a double
printed with its `.0` — is in `shared/java-code.ts`, and the generators keep to
divisors whose quotient terminates so that nobody is asked to write down
`2.3333333333333335`.

**The picture.** A turtle program is a `TurtleCommand[]`, not Python text:
`toPython()` writes the lines the player reads and `runTurtle()` walks the same
tree into the drawing those lines make. That is what lets the "which picture"
stage build its three wrong answers by mutating the program — one turn the other
way, two turns too few — and then keep only the mutations that really do look
different. Different is measured on the picture rather than the program:
`drawingFingerprint()` inks a 24x24 grid fitted to the drawing's own bounding
box, exactly as the SVG fits it to its card, so a square drawn twice as large
has the same fingerprint and is thrown away. Without that check a "wrong" answer
could be pixel-for-pixel the right one.

## Drawing a Struktogramm

The `structogram` station of the Java game is the same idea one representation
further along: a program and four diagrams, only one of which says what the
program says. A `Structogram` (`shared/java-structogram.ts`) is a list of boxes —
a statement, a Verzweigung with a yes- and a no-branch, or a loop whose test sits
in the head or in the foot — and `src/games/java/components/Structogram.tsx`
draws them with borders and one small SVG for the triangle over a Verzweigung.
A box carries the text it shows rather than the code it came from, so the client
draws a diagram without knowing any Java.

The three wrong answers are mutations of the right one, and each is a
misconception rather than noise: the branches exchanged, the test moved from the
head to the foot, a relation off by a step, or two boxes of a sequence swapped.
`structogramSignature()` flattens a diagram to a string so a mutation that
changed nothing — swapping two identical boxes — is thrown away instead of being
offered as a wrong answer that is right.

## Conventions

- Stage ids are stable: they appear in i18n keys and in stored lobby settings.
- Question types live next to the spec in `shared/games/<game>.ts`; both sides import them.
- Anything a stage sends is a string (`submit(answer)`); complex answers are JSON.
  The server caps answer length and ignores answers it cannot parse.
- Keep the pure logic (question generation, grading) in the handler and out of the
  components, so `check:games` can exercise it.
