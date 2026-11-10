# Notes for AI coding agents

This is a Teacharium widget package. Read the Widget SDK docs before writing
code: https://docs.teacharium.io/api-documentation/widget-sdk (also as plain
text in https://docs.teacharium.io/llms-full.txt).

- Each component is registered in `src/main.ts` with `registerWidget()`.
  Component names must be unique and must never change once lessons use them.
- Components receive `api` (TeachariumWidgetApi). Use `api.hooks.*` for
  variables, expressions, persistent state (`useWidgetState`), scoring
  (`useIsItem`) and media URLs (`useResolvedMediaUrl`).
- Respect `api.isEditing` and `api.isReviewMode`: no interaction in either.
- No Tailwind. Plain CSS in `src/styles.css`, class names prefixed.
- Only `react` and `react-dom` are provided at runtime; everything else is
  bundled. Don't import `@teacharium/player`.
- Verify with `npm run build` (type check, bundle, contract checks, manifest)
  and preview with `npm run dev`.
