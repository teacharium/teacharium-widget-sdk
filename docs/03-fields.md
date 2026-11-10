---
title: Fields
---

# Fields

`fields` describe the settings panel authors use in the lesson editor. Each
key is a prop name; the stored value is passed to your `render` function.

```ts
fields: {
  title: { type: "text", label: "Title" },
  level: {
    type: "select",
    label: "Level",
    options: [
      { label: "Easy", value: "easy" },
      { label: "Hard", value: "hard" },
    ],
  },
}
```

Keep stored values JSON-serializable: lessons save props as JSON, and they're
exported into SCORM packages and the self-hosted player.

## Puck fields

All [Puck field types](https://puckeditor.com/docs/api-reference/fields) work:

| Type | Stores | Notes |
| --- | --- | --- |
| `text` | string | |
| `textarea` | string | |
| `number` | number | `min`, `max`, `step` |
| `select` | any option value | `options: [{ label, value }]` |
| `radio` | any option value | Use for booleans: `[{label:"Yes",value:true},{label:"No",value:false}]` |
| `array` | array of objects | `arrayFields`, `defaultItemProps`, `getItemSummary` |
| `object` | object | `objectFields` |
| `slot` | nested components | Lets authors drop other components (for example `Text`) inside yours |
| `custom` | anything | Your own field UI via `render` |

## Teacharium fields

These field types are provided by the Teacharium editor:

| Type | Stores | Read it with |
| --- | --- | --- |
| `variable` | a variable name | `api.hooks.useVariableValues([name])`, `api.updateVariables({ [name]: value })` |
| `numericExpression` | an expression string, such as `{{score}} * 2` | `api.hooks.useNumberExpressions([expr], [fallback])` |
| `stringExpression` | a template string, such as `Hi {{name}}` | `api.hooks.useStringExpressions([expr])` |
| `condition` | `{ expression: "{{score}} >= 80" }` | `api.hooks.useConditionEvaluation(condition)` |
| `imageMedia` | a media library reference | `api.hooks.useResolvedMediaUrl(value)` |
| `audioMedia` | a media library reference | `api.hooks.useResolvedMediaUrl(value)` |
| `videoMedia` | a video library reference | `api.hooks.useResolvedVideoUrls(value)` (HLS, MP4, thumbnail) |
| `voiceover` | `{ enabled, voice, content, contentHash, showPlayButton }` | `api.hooks.useResolvedVoiceoverUrl(contentHash, voice)` and `<AudioPlayer>` from `@teacharium/widget` |
| `action` | a list of `{ actionType, parameters }` | `executeActions(api, actions)` from `@teacharium/widget` |
| `step` | a step id | Emit `{ type: "goToStep", params: { targetStepId } }` |
| `color` | a CSS color string | |
| `svgSource` | raw SVG markup (may contain `{{variables}}`) | Resolve with `useStringExpressions(..., { escapeHtml: true })` and sanitize before rendering |
| `placeholder` | nothing | Shows `description` as help text in the panel |

Prefer expression fields (`numericExpression`, `stringExpression`) over plain
`number`/`text` when a value might reasonably depend on a variable: authors can
still type a constant, and lessons can make it dynamic later.

## Changing fields after publishing

Lessons keep the props they were saved with. When you change fields in a new
version:

- Adding a field is safe; give `render` a default for lessons that don't have it yet.
- Never rename or repurpose a prop. Add a new one and keep reading the old one.
- Removing a field just hides it from authors; old lessons still pass the value.
