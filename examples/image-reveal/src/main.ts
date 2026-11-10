import { registerWidget } from "@teacharium/widget";

import "./styles.css";
import { ImageRevealConfig } from "./ImageReveal";

registerWidget({
  name: "ExampleImageReveal",
  category: "Media",
  description: "An image the learner reveals with a click",
  aiPrompt:
    "Use ExampleImageReveal to hide an image (an answer, a diagram) until the learner chooses to see it.",
  config: ImageRevealConfig,
});
