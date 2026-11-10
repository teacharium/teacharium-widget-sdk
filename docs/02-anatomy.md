---
title: Anatomy of a widget
---

# Anatomy of a widget

```
my-widgets/
├── teacharium.json        # widget name, entry point, id after first publish
├── vite.config.ts         # uses teachariumWidget() from @teacharium/widget-tools
├── src/
│   ├── main.ts            # registers every component
│   ├── styles.css         # styles for all components
│   └── components/
│       ├── hello-card/HelloCard.tsx
│       └── true-or-false/TrueOrFalse.tsx
└── dist/                  # build output: widget.js, widget.css, manifest.json
```

## teacharium.json

```json
{
  "name": "My Widgets",
  "description": "Custom widgets for our science lessons",
  "entry": "src/main.ts",
  "widgetId": "…written by teacharium publish…"
}
```

`name` and `description` are used when the widget is first created. `widgetId`
links the folder to the widget in your organization; keep it in version control
so your teammates and CI publish to the same widget. Delete it to publish as a
brand-new widget.

## A component

A component is a [Puck](https://puckeditor.com) component config with a few
Teacharium additions:

```tsx
import type { PuckComponent } from "@measured/puck";
import type {
  TeachariumComponentConfig,
  TeachariumWidgetApi,
} from "@teacharium/widget";

interface CalloutProps {
  api: TeachariumWidgetApi;
  title: string;
  body: string;
}

const Callout: PuckComponent<CalloutProps> = ({ api, title, body }) => {
  const [text] = api.hooks.useStringExpressions([body]);
  return (
    <aside className="callout">
      <strong>{title}</strong>
      <p>{text}</p>
    </aside>
  );
};

export const CalloutConfig: TeachariumComponentConfig<CalloutProps> = {
  usagePrompt: "A highlighted note.",
  render: Callout,
  fields: {
    title: { type: "text", label: "Title" },
    body: { type: "stringExpression", label: "Body" },
  },
  defaultProps: { title: "Note", body: "" },
};
```

- `render` receives the component's props plus `api`, the
  [runtime API](./04-runtime-api.md).
- `fields` define the settings panel authors see in the editor ([Fields](./03-fields.md)).
- `defaultProps` are the values a newly added component starts with.
- `usagePrompt` is a one-line description shown to authors and to Teacharium's
  AI lesson tools.
- Optional `resolveData` and `resolveFields` work as in Puck.

## Registering components

`src/main.ts` registers each component. This is what the bundle does when
Teacharium loads it:

```ts
import { registerWidget } from "@teacharium/widget";
import { StickyNote } from "lucide-react";
import "./styles.css";
import { CalloutConfig } from "./components/callout/Callout";
import { QuizCardConfig } from "./components/quiz-card/QuizCard";

registerWidget({
  name: "AcmeCallout",
  category: "General",
  description: "A highlighted note",
  aiPrompt: "Use AcmeCallout for tips and warnings. body accepts {{variables}}.",
  icon: StickyNote,
  config: CalloutConfig,
  cssClasses: [{ className: "callout", description: "Callout container" }],
});

registerWidget({
  name: "AcmeQuizCard",
  category: "Questions",
  config: QuizCardConfig,
});
```

| Option | Purpose |
| --- | --- |
| `name` | The component's identity. **Lessons store it**, so it must be unique and must not change once lessons use it. |
| `category` | Group in the editor's component list: `General`, `Questions`, `Media`, `Layout`, `Logic`, `Math`, `Charts`, or your own. |
| `description` | Shown to authors. |
| `aiPrompt` | Tells Teacharium's AI tools when and how to use the component. |
| `icon` | A React icon component (for example from `lucide-react`) shown in the component list. It's bundled into your widget. |
| `cssClasses` | Class names authors may target with lesson custom CSS. |

### Naming rules

Component names are global within an organization: your components share the
editor with Teacharium's built-in components and every other widget your
organization uses. Publishing refuses a component name that another available
widget already uses, so prefix names with something distinctive (`AcmeCallout`,
not `Callout`).

Never rename a component that lessons use: those lessons would no longer find
it. Add a new component instead and stop offering the old one.

### Logic components

Components in the `Logic` category are invisible helpers (timers, gates,
branching). They don't get the common layout settings (transition, frame,
alignment, visibility) that other components get automatically, and they
usually render a small placeholder only while `api.isEditing`.

## Common settings you get for free

Every non-Logic component automatically gets these settings in the editor, and
the player applies them for you: component name, transition in and delay,
frame (border/background), horizontal alignment, and a visibility condition.
Don't define fields with these names yourself.
