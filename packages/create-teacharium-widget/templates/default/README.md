# {{displayName}}

Custom components for [Teacharium](https://teacharium.io) lessons.

| Command | What it does |
| --- | --- |
| `npm run dev` | Preview every component at http://localhost:5199, rebuilding as you edit |
| `npm run build` | Build `dist/widget.js`, check it, and capture `dist/manifest.json` |
| `npx teacharium login` | Log in to Teacharium (once per machine) |
| `npm run deploy` | Build and publish to your organization |

The first publish creates the widget in your organization and writes its
`widgetId` to `teacharium.json`. Commit that file so everyone on your team
publishes to the same widget.

After publishing, enable the widget for a lesson in its settings, then find
the components in the editor's component list.

## Project layout

- `src/main.ts` registers every component in this package.
- `src/components/*` one folder per component.
- `src/styles.css` styles for all components (prefix class names).
- `teacharium.json` widget name, entry point and (after publishing) id.

## Publishing from CI

Create an organization API token with **Can publish widgets** and run
`npx teacharium publish` with it in `TEACHARIUM_TOKEN`.

Docs: https://docs.teacharium.io/api-documentation/widget-sdk
