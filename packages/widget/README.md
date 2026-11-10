# @teacharium/widget

Types and helpers for building [Teacharium](https://teacharium.io) widgets:
React components that authors add to Teacharium lessons.

```bash
npm create teacharium-widget my-widgets
```

```ts
import { registerWidget, type TeachariumComponentConfig } from "@teacharium/widget";

registerWidget({
  name: "AcmeCallout",
  category: "General",
  config: CalloutConfig, // fields, defaultProps and render({ api, ...props })
});
```

What's in the package:

- `registerWidget()` and the `TeachariumWidget` / `TeachariumComponentConfig` types
- `TeachariumWidgetApi`, the `api` every component receives (variables,
  expressions, scoring, events, media, persistent state)
- Teacharium field types (`variable`, `numericExpression`, `imageMedia`, …)
- Helpers: `executeActions`, `formatNumber`, `roundToStep`, `AudioPlayer`, …
- `@teacharium/widget/manifest`: build widget manifests (used by the CLI)

Build, preview and publish with
[`@teacharium/widget-tools`](https://www.npmjs.com/package/@teacharium/widget-tools).

Docs: https://docs.teacharium.io/api-documentation/widget-sdk
