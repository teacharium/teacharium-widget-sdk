---
title: Getting started
---

# Build custom widgets

Widgets are React components that authors drop into Teacharium lessons, next
to the built-in text, questions and media. With the Widget SDK you write them
in your own repository and editor, preview them on your machine, and publish
them to your Teacharium organization.

One widget **package** can contain any number of **components**. They are
built into one bundle, published together, and appear in the lesson editor's
component list once the widget is enabled for a lesson.

| Package | What it's for |
| --- | --- |
| `create-teacharium-widget` | Scaffolds a new widget package |
| `@teacharium/widget` | Types, `registerWidget()` and helpers you import in components |
| `@teacharium/widget-tools` | The `teacharium` CLI (`dev`, `build`, `publish`) and the Vite plugin |

## Quickstart

You need Node.js 20.19 or later and a Teacharium account.

```bash
npm create teacharium-widget my-widgets
cd my-widgets
npm install
npm run dev
```

`npm run dev` opens a local preview at http://localhost:5199. It lists every
component in the package, renders the selected one inside the real Teacharium
player, and rebuilds as you edit. Change `src/components/hello-card/HelloCard.tsx`
and watch it update.

When you're ready, log in and publish:

```bash
npx teacharium login
npm run deploy
```

The first publish asks which organization should own the widget, creates it,
and saves its id to `teacharium.json`. Commit that file.

## Use it in a lesson

1. Open a lesson and go to **Lesson settings → Widgets**.
2. Turn on your widget.
3. Your components appear in the editor's component list under their category.

Publish again whenever you change the code. Lessons pick up the new version
the next time they load; there is no per-lesson upgrade step.

## What's next

- [Anatomy of a widget](./02-anatomy.md): components, `registerWidget()` and naming
- [Fields](./03-fields.md): the settings authors edit
- [Runtime API](./04-runtime-api.md): variables, scoring, events, media and state
- [Styling](./05-styling.md)
- [Preview and publish](./06-preview-and-publish.md): the CLI, CI and limits

Examples live in the [Widget SDK repository](https://github.com/teacharium/teacharium-widget-sdk/tree/main/examples).
