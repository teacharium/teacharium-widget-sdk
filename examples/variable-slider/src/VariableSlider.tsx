import type { PuckComponent } from "@measured/puck";
import {
  formatNumber,
  roundToStep,
  type TeachariumComponentConfig,
  type TeachariumWidgetApi,
} from "@teacharium/widget";

export interface VariableSliderProps {
  api: TeachariumWidgetApi;
  label: string;
  /** Name of a lesson variable (picked by the author in the editor). */
  variable: string;
  /** Expressions, so limits can depend on other variables. */
  min: string;
  max: string;
  step: string;
  numberFormat: string;
}

const VariableSlider: PuckComponent<VariableSliderProps> = ({
  api,
  label,
  variable,
  min,
  max,
  step,
  numberFormat,
}) => {
  // Always arrays, even for one value. The second argument gives defaults
  // for expressions that are empty or invalid.
  const [minValue, maxValue, stepValue] = api.hooks.useNumberExpressions(
    [min, max, step],
    [0, 10, 1],
  );

  // Re-renders whenever the variable changes, wherever it's changed from.
  const [current] = api.hooks.useVariableValues([variable]);
  const value = typeof current === "number" ? current : minValue;

  const disabled = api.isEditing || api.isReviewMode || !variable;

  return (
    <label className="example-slider">
      <span>{label}</span>
      <input
        type="range"
        min={minValue}
        max={maxValue}
        step={stepValue}
        value={value}
        disabled={disabled}
        onChange={(event) => {
          // roundToStep avoids floating point drift (0.1 + 0.2 !== 0.3).
          const next = roundToStep(Number(event.target.value), stepValue, minValue);
          api.updateVariables({ [variable]: next });
        }}
      />
      <span className="example-slider__value">
        {formatNumber(value, numberFormat || undefined)}
      </span>
      {!variable && api.isEditing && (
        <em className="example-slider__hint">Choose a variable to bind.</em>
      )}
    </label>
  );
};

export const VariableSliderConfig: TeachariumComponentConfig<VariableSliderProps> =
  {
    usagePrompt: "A slider bound to a number variable.",
    render: VariableSlider,
    fields: {
      label: { type: "text", label: "Label" },
      variable: { type: "variable", label: "Variable" },
      min: { type: "numericExpression", label: "Minimum" },
      max: { type: "numericExpression", label: "Maximum" },
      step: { type: "numericExpression", label: "Step" },
      numberFormat: {
        type: "text",
        label: "Number format",
        placeholder: "e.g. #,##0.0",
      },
    },
    defaultProps: {
      label: "Speed",
      variable: "",
      min: "0",
      max: "100",
      step: "5",
      numberFormat: "",
    },
  };
