# Teacharium Widget SDK

Build custom interactive components for [Teacharium](https://teacharium.io)
lessons in your own repository, preview them locally, and publish them to your
Teacharium organization.

```bash
npm create teacharium-widget my-widgets
cd my-widgets
npm install
npm run dev        # preview at http://localhost:5199
npx teacharium login
npm run deploy     # publish to your organization
```

## What's here

| Path | |
| --- | --- |
| [`packages/widget`](packages/widget) | `@teacharium/widget`: types, `registerWidget()`, runtime API and helpers |
| [`packages/widget-tools`](packages/widget-tools) | `@teacharium/widget-tools`: the `teacharium` CLI, Vite plugin and local preview |
| [`packages/create-teacharium-widget`](packages/create-teacharium-widget) | `npm create teacharium-widget` scaffolder and template |
| [`examples`](examples) | Example widget packages |
| [`docs`](docs) | Developer documentation (also at [docs.teacharium.io](https://docs.teacharium.io/api-documentation/widget-sdk)) |

## Docs

1. [Getting started](docs/01-getting-started.md)
2. [Anatomy of a widget](docs/02-anatomy.md)
3. [Fields](docs/03-fields.md)
4. [Runtime API](docs/04-runtime-api.md)
5. [Styling](docs/05-styling.md)
6. [Preview and publish](docs/06-preview-and-publish.md)

## Examples

- [`variable-slider`](examples/variable-slider): reads and writes a lesson variable, expression-driven limits
- [`image-reveal`](examples/image-reveal): media library images and persistent widget state
- [`reading-timer`](examples/reading-timer): lesson events, gating the Next button

To try one, run `pnpm install` at the root of this repository, then
`pnpm --filter ./examples/variable-slider dev`.

## About this repository

This repository is published from Teacharium's main codebase, where these
packages are developed alongside the app that runs them. Issues and
suggestions are welcome; pull requests are reviewed and applied upstream.
