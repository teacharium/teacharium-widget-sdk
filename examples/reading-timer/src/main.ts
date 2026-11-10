import { registerWidget } from "@teacharium/widget";

import "./styles.css";
import { ReadingTimerConfig } from "./ReadingTimer";

registerWidget({
  name: "ExampleReadingTimer",
  category: "Logic",
  description: "Keeps Next disabled until the learner has spent some time on the step",
  aiPrompt:
    "Use ExampleReadingTimer on a reading step to keep the Next button disabled for `seconds` seconds.",
  config: ReadingTimerConfig,
});
