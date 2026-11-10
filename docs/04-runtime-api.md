---
title: Runtime API
---

# Runtime API

Every component receives an `api` prop (`TeachariumWidgetApi`). It is the only
way to talk to the lesson: Teacharium provides it in the editor, the player,
SCORM packages, LTI and the self-hosted player alike.

## Where you're running

| Property | Meaning |
| --- | --- |
| `api.isEditing` | An author is editing the lesson. Don't run timers, play media or change variables. |
| `api.isReviewMode` | A learner is reviewing finished work. Show their answers, disable interaction. |
| `api.playerMode` | `"editing" \| "preview" \| "playbook" \| "player" \| "review"` |
| `api.stepId` | Id of the step the component is on |

A good default: `const interactive = !api.isEditing && !api.isReviewMode;`

## State that survives navigation

`useState` resets when the learner leaves a step. Use widget state for anything
the learner did:

```ts
const [selected, setSelected] = api.hooks.useWidgetState<string | null>("selected", null);

const { state, updateState, resetState } = api.hooks.useWidgetStateObject({
  attempts: 0,
  showHint: false,
});
```

It's restored when the learner comes back to the step, and saved with the
session so resumed and reviewed lessons show the same thing.

## Variables

Lessons have variables that authors use in text (`{{score}}`), conditions and
expressions.

```ts
// Read (re-renders on change). Always pass arrays.
const [score, name] = api.hooks.useVariableValues(["score", "name"]);

// Write
api.updateVariables({ score: 10 });
api.incrementVariable("attempts");
api.decrementVariable("lives", 1);

// Create a variable for this component. It's prefixed with the component's
// id unless you ask for a lesson-wide one; the full name is returned.
const answerVar = api.addVariable("answer", "", "string");
api.addVariable("TotalTime", 0, "number", { scope: "lesson", skipPrefix: true });
```

Let authors pick variables with a `variable` field instead of hard-coding names.

## Expressions and conditions

```ts
const [width, height] = api.hooks.useNumberExpressions([widthExpr, heightExpr], [100, 50]);
const [greeting] = api.hooks.useStringExpressions(["Hello {{name}}"]);
const { result, hasError } = api.hooks.useConditionEvaluation({
  expression: "{{score}} >= 80 and {{attempts}} < 3",
});
```

Pass `{ escapeHtml: true }` as the third argument of `useStringExpressions`
when the result is inserted as HTML.

## Scoring: items

A component that learners answer registers as an **item**. Items feed the
player's Check Answer button and feedback, lesson scores, SCORM and LTI results,
and review mode.

```ts
const item = api.hooks.useIsItem({ options: { type: "scored", maxScore: 1 } });

function onAnswer(choice: string) {
  const correct = choice === props.correctChoice;
  item.updateAttempted(true);
  item.updateCorrect(correct);
  item.updateScore(correct ? 1 : 0);
  item.updateAnswer({ humanReadable: choice, machineReadable: choice });
}
```

`type` is `"scored"` (counts toward the score), `"practice"` (tracked, not
scored) or `"instructional"`. A component with several answerable parts (rows
of a matrix) can register each with `api.hooks.useIsItemWithId(id, options)`.

To react to the footer's Check Answer button, subscribe to `checkAnswer`:

```ts
api.hooks.useLessonEventSubscription("checkAnswer", () => {
  if (!api.isEditing) setShowFeedback(true);
});
```

## Events

Components talk to the player and each other through lesson events. Every
event has a `params` object (pass `{}` when there are no arguments).

```ts
const emit = api.hooks.useLessonEventEmitter();
emit({ type: "setNextButtonStatus", params: { status: "disabled" } });

api.hooks.useLessonEventSubscription("step_started", (event) => {
  /* … */
});
```

Events you can emit:

| Event | `params` |
| --- | --- |
| `nextStep`, `previousStep` | `{}` |
| `goToStep` | `{ targetStepId }` |
| `setVariable` | `{ variableName, value }` |
| `updateVariables` | `{ variables: { name: value } }` |
| `setNextButtonStatus`, `setCheckAnswerButtonStatus`, `setHintButtonStatus` | `{ status: "enabled" \| "disabled" \| "hidden" }` |
| `setNextButtonLabel`, `setCheckAnswerButtonLabel` | `{ label }` |
| `showFeedback` | `{ message, variant: "correct" \| "incorrect" \| "info" \| "hint", autoHideMs? }` |
| `hideFeedback`, `checkAnswer`, `showHint` | `{}` |

Events you can listen to include `lesson_started`, `step_started`,
`step_completed`, `section_completed`, `variable_changed`, `checkAnswer`,
`showHint`, `displayAnswer` and `setItemStatus`, plus custom events other
components emit. `teacharium dev` shows every event in its event log.

The `action` field and `executeActions(api, actions)` let authors configure a
sequence of these events without code.

## Media

Media fields store references, not URLs. Resolve them through the host, which
signs URLs in Teacharium and maps them to packaged files in exports:

```ts
const { data: imageUrl, isLoading } = api.hooks.useResolvedMediaUrl(props.image);
const { hlsStreamUrl, mp4Url, thumbnailUrl } = api.hooks.useResolvedVideoUrls(props.video);
const { data: audioUrl } = api.hooks.useResolvedVoiceoverUrl(
  props.voiceover?.enabled ? props.voiceover.contentHash : undefined,
  props.voiceover?.voice,
);
```

`@teacharium/widget` also exports an `AudioPlayer` component.

## Numbers

Floating point makes `0.1 + 0.2` equal `0.30000000000000004`. Use the helpers
from `@teacharium/widget` instead of `toFixed`, `===` and bare `value + step`:

```ts
import { formatNumber, roundTo, roundToStep, isWithinTolerance } from "@teacharium/widget";

formatNumber(1250, "$#,##0.00", 100); // "$12.50"
roundToStep(value + step, step, min);
isWithinTolerance(answer, 3.14, 0.01);
```

## What's available at runtime

Only `react` and `react-dom` are shared with the page; Teacharium provides its
own copy so there's exactly one React. Everything else you import, including
`@teacharium/widget` and any npm packages, is bundled into your widget. Don't
import `@teacharium/player` in a widget: use `api.hooks` instead.
