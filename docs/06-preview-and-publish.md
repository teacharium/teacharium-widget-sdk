---
title: Preview and publish
---

# Preview and publish

The `teacharium` CLI comes with `@teacharium/widget-tools`. Run it with `npx
teacharium …` or through the scripts in your `package.json`.

## Preview: `teacharium dev`

```bash
npx teacharium dev            # http://localhost:5199
npx teacharium dev --port 6000
```

Rebuilds on every change and serves a preview that:

- lists every component your package registers;
- renders the selected component in the real Teacharium player, with the same
  layout chrome, variables, scoring and events as a lesson;
- edits props through a form generated from your fields (complex fields as
  JSON);
- shows live variables, item status (score, attempted, correct, answer) and an
  event log;
- switches between player and review mode.

The preview runs entirely on your machine and needs no login. Media library
fields can't be resolved offline: put a full image URL in the props JSON to
preview images.

## Build: `teacharium build`

```bash
npx teacharium build
npx teacharium build --watch
```

Produces `dist/widget.js`, `dist/widget.css` and `dist/manifest.json`, then
checks the bundle:

- only `react` and `react-dom` are left as imports (everything else must be bundled);
- no Tailwind classes in `src/`;
- size limits: 3.5 MB of JavaScript, 512 KB of CSS;
- the bundle loads, and every registered component has a name and a `render`;
- no component uses a name reserved by Teacharium.

`manifest.json` describes each component's fields and defaults. Teacharium uses
it to validate lessons and to let its AI tools and MCP server build lessons
with your components.

## Log in

```bash
npx teacharium login
npx teacharium whoami
npx teacharium logout
```

`login` opens your browser to approve access (OAuth). The session is stored in
your user config directory and refreshed automatically.

## Publish: `teacharium publish`

```bash
npx teacharium publish
npx teacharium publish --org "Acme Learning"   # first publish only
```

Builds, then uploads the bundle, stylesheet and manifest.

- **First publish:** creates the widget in your organization (you choose which
  if you belong to several) and writes `widgetId` to `teacharium.json`.
- **Later publishes:** replace the widget's code. Lessons that use it load the
  new version next time they open.
- Publishing is refused when a component name is already used by another
  widget available to your organization. Rename the new component.
- Widgets published from the CLI are marked *externally managed* in
  Teacharium: their code lives in your repository, not in Teacharium's widget
  builder.

### Publishing from CI

An organization admin can create an API token with the **Can publish widgets**
permission (Organization settings → API tokens). Use it instead of a login:

```yaml
# GitHub Actions
- run: npm ci
- run: npx teacharium publish
  env:
    TEACHARIUM_TOKEN: ${{ secrets.TEACHARIUM_TOKEN }}
```

The token can only publish to widgets in its own organization. Create the
widget with a normal login first and commit `teacharium.json`.

### Other servers

`--api-url` (or `TEACHARIUM_API_URL`) points the CLI at another Teacharium
deployment, for example a staging server. Each server publishes to its own
environment, and logins are stored per server.

## Security

Widgets run as code inside the lesson page, with the same access as the rest of
the page. Only publish code you trust, review dependencies you bundle, and
treat your organization's API tokens as secrets.
