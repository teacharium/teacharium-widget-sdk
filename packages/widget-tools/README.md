# @teacharium/widget-tools

The `teacharium` CLI and Vite plugin for building, previewing and publishing
[Teacharium](https://teacharium.io) widgets.

```bash
npm create teacharium-widget my-widgets   # new project
npx teacharium dev                        # preview at http://localhost:5199
npx teacharium build                      # dist/widget.js, widget.css, manifest.json
npx teacharium login                      # once per machine
npx teacharium publish                    # upload to your organization
```

| Command | |
| --- | --- |
| `dev [--port]` | Watch-build and preview every component in the real Teacharium player, with live variables, scoring and events |
| `build [--watch]` | Bundle, check the bundle contract, capture `manifest.json` |
| `publish [--org] [--no-build]` | Build and publish; creates the widget on first run |
| `login` / `logout` / `whoami` | OAuth login, stored per server |
| `widgets` | List your organizations' widgets |

Options: `--api-url` (or `TEACHARIUM_API_URL`) for another Teacharium server;
`TEACHARIUM_TOKEN` to publish from CI with an organization API token.

## Vite plugin

```ts
// vite.config.ts
import { defineConfig } from "vite";
import { teachariumWidget } from "@teacharium/widget-tools";

export default defineConfig({ plugins: [teachariumWidget()] });
```

It configures a library build that matches what Teacharium loads: one ES
module (`dist/widget.js`) with `react` and `react-dom` left external, and one
stylesheet (`dist/widget.css`).

Docs: https://docs.teacharium.io/api-documentation/widget-sdk
