import { registerWidget } from "@teacharium/widget";

import "./styles.css";
import { VariableSliderConfig } from "./VariableSlider";

registerWidget({
  name: "ExampleVariableSlider",
  category: "General",
  description: "A slider that reads and writes a lesson variable",
  aiPrompt:
    "Use ExampleVariableSlider to let the learner set a number. Bind `variable` to a number variable; min, max and step accept expressions like {{maxSpeed}}.",
  config: VariableSliderConfig,
  cssClasses: [
    { className: "example-slider", description: "Slider container" },
    { className: "example-slider__value", description: "Current value label" },
  ],
});
