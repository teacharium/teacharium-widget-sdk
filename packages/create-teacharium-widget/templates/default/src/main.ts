/**
 * Entry point: register every component this package provides.
 * One package can register as many components as you like; they are
 * published and versioned together.
 */
import { registerWidget } from "@teacharium/widget";

import "./styles.css";
import { HelloCardConfig } from "./components/hello-card/HelloCard";
import { TrueOrFalseConfig } from "./components/true-or-false/TrueOrFalse";

registerWidget({
  // Component names are how lessons refer to your component. Make them
  // distinctive and never rename them after lessons use them.
  name: "{{componentPrefix}}HelloCard",
  category: "General",
  description: "A greeting card that can show a lesson variable",
  aiPrompt:
    "Use HelloCard to greet the learner. `message` can include {{variables}}.",
  config: HelloCardConfig,
  cssClasses: [
    { className: "hello-card", description: "Card container" },
    { className: "hello-card__title", description: "Card title" },
  ],
});

registerWidget({
  name: "{{componentPrefix}}TrueOrFalse",
  category: "Questions",
  description: "A scored true-or-false question",
  aiPrompt:
    "Use TrueOrFalse for a single statement the learner marks as true or false. It is scored.",
  config: TrueOrFalseConfig,
});
