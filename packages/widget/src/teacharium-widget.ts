/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-empty-object-type */
import type React from "react";
import type {
  DefaultComponentProps,
  Fields,
  PuckComponent,
} from "@measured/puck";
import type { TeachariumWidgetApi } from "./teacharium-widget-api";
import type { TeachariumCustomFields } from "./teacharium-custom-fields";

interface TeachariumComponentProps {
  api: TeachariumWidgetApi;
}

// Create a union type of all your custom fields

export interface TeachariumComponentConfig<T = {}> {
  usagePrompt: string;
  fields: Fields<DefaultComponentProps, TeachariumCustomFields>;
  defaultProps: DefaultComponentProps;
  resolveData?: (arg: { props: any; changed: any }) => Promise<any>; // Todo tighten type
  resolveFields?: (
    data: unknown,
    context: {
      fields: Fields<DefaultComponentProps, TeachariumCustomFields>;
    },
  ) => Fields<DefaultComponentProps, TeachariumCustomFields>;
  render: PuckComponent<T & TeachariumComponentProps>;
}

export interface WidgetCssClass {
  /** CSS class name without dot prefix, e.g. "tw-default-choice-container" */
  className: string;
  /** Brief description of what this class targets */
  description: string;
}

export interface TeachariumWidget<T> {
  name: string;
  category: string;
  description?: string;
  aiPrompt?: string;
  icon?: React.ComponentType<{ className?: string }> | string;
  config: TeachariumComponentConfig<T>;
  /** CSS classes this widget exposes for custom CSS targeting */
  cssClasses?: WidgetCssClass[];
}

export const registerWidget = (widget: TeachariumWidget<any>) => {
  window.TeachariumComponents = window.TeachariumComponents || {};
  window.TeachariumComponents[widget.name] = widget;
};

export const getWidgets = () => {
  return Object.values(window.TeachariumComponents || {});
};

declare global {
  interface Window {
    TeachariumComponents?: Record<string, TeachariumWidget<any>>;
  }
}
