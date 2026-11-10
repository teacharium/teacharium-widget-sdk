import type { BaseField } from "@measured/puck";

export type TeachariumCustomFieldType =
  | "imageMedia"
  | "videoMedia"
  | "audioMedia"
  | "voiceover"
  | "action"
  | "variable"
  | "numericExpression"
  | "stringExpression"
  | "placeholder"
  | "step"
  | "condition"
  | "textStyle"
  | "frame"
  | "color"
  | "svgSource";

export type TeachariumCustomField = BaseField & {
  type: TeachariumCustomFieldType;
  label?: string;
  placeholder?: string;
  description?: string;
  value?: string;
};

export type ImageMediaField = TeachariumCustomField & {
  type: "imageMedia";
  label: string;
};

export type VideoMediaField = TeachariumCustomField & {
  type: "videoMedia";
  label: string;
};

export type AudioMediaField = TeachariumCustomField & {
  type: "audioMedia";
  label: string;
};

export type VoiceoverField = TeachariumCustomField & {
  type: "voiceover";
  label?: string;
};

export type ActionField = TeachariumCustomField & {
  type: "action";
  label: string;
};

export type VariableField = TeachariumCustomField & {
  type: "variable";
  label: string;
};

export type NumericExpressionField = TeachariumCustomField & {
  type: "numericExpression";
  label: string;
};

export type StringExpressionField = TeachariumCustomField & {
  type: "stringExpression";
  label: string;
};

export type ConditionField = TeachariumCustomField & {
  type: "condition";
  label: string;
};

export type PlaceholderField = TeachariumCustomField & {
  type: "placeholder";
  label?: string;
  description?: string;
  value?: string;
};

export type StepField = TeachariumCustomField & {
  type: "step";
  label: string;
  placeholder?: string;
  description?: string;
};

export type TextStyleField = TeachariumCustomField & {
  type: "textStyle";
  label?: string;
};

export type FrameField = TeachariumCustomField & {
  type: "frame";
  label?: string;
};

export type ColorField = TeachariumCustomField & {
  type: "color";
  label?: string;
};

/**
 * Raw SVG markup stored directly in the component's props (not in the media
 * library). May contain `{{variable}}` substitutions.
 */
export type SvgSourceField = TeachariumCustomField & {
  type: "svgSource";
  label?: string;
};

export type TeachariumCustomFields = TeachariumCustomField;
