---
title: Styling
---

# Styling

Write plain CSS (or anything Vite compiles to CSS, such as Sass) and import it
from your entry module. The build emits a single `dist/widget.css` that
Teacharium loads alongside your bundle.

```ts
// src/main.ts
import "./styles.css";
```

## Rules

- **Prefix every class** with your component's name (`.acme-callout`,
  `.acme-callout__title`). Your CSS shares the page with the lesson, the player
  and other widgets.
- **No Tailwind.** Widgets run in places without Teacharium's Tailwind build
  (SCORM packages, the self-hosted player, LMS embeds), so utility classes
  would render unstyled. `teacharium build` fails when it finds Tailwind
  classes in your source; pass `--allow-tailwind` only if you compile Tailwind
  into your own `widget.css`.
- Don't style elements globally (`button { … }`, `body { … }`).
- Size to your container: the author places your component in a grid cell, so
  use `width: 100%` and avoid fixed viewport units.

## Theme colors

The Teacharium editor defines a few color variables (`--tool-green`,
`--tool-blue`, `--tool-orange`, `--tool-yellow`, `--tool-red`), but exported
players don't, so always give a fallback:

```css
.acme-callout {
  border-left: 4px solid var(--tool-blue, #00aedb);
}
```

## Letting authors restyle you

Lessons can have custom CSS. List the classes you consider stable in
`cssClasses` when you register the component; Teacharium shows them to authors
(and to its AI CSS assistant) as safe hooks:

```ts
registerWidget({
  name: "AcmeCallout",
  config: CalloutConfig,
  cssClasses: [
    { className: "acme-callout", description: "Callout box" },
    { className: "acme-callout__title", description: "Callout title" },
  ],
});
```

Treat those class names like public API and keep them stable.
