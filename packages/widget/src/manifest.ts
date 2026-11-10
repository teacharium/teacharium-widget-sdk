/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Widget manifests and the editor's common fields.
 *
 * Pure (no React, no window): shared by the Teacharium editor, the server-side
 * component catalog, and the `teacharium` CLI, which captures a bundle's
 * manifest at build time. Keeping one implementation guarantees a manifest
 * stores the same field set the editor validates against.
 */
import type { TeachariumWidget } from "./teacharium-widget";

/** A JSON-safe Puck field definition (functions such as `render` removed). */
export type JsonField = { type: string } & Record<string, unknown>;

/**
 * Manifest of one component registered by a widget bundle.
 *
 * `fields` is the augmented field set the editor validates against (common
 * fields such as `name`, `transitionIn`, `frame`, `visible` included for
 * non-Logic widgets), with every function-valued property removed.
 */
export interface WidgetManifest {
  name: string;
  category?: string;
  usagePrompt?: string;
  aiPrompt?: string;
  fields: Record<string, JsonField>;
  defaultProps?: Record<string, unknown>;
  registersItems?: boolean;
  capturedAt: string;
}

export const WIDGET_VERSION_MANIFEST_SCHEMA_VERSION = 1;

/**
 * Manifest of a whole widget bundle. A bundle can register any number of
 * components, so it stores a list.
 */
export interface WidgetVersionManifest {
  schemaVersion: typeof WIDGET_VERSION_MANIFEST_SCHEMA_VERSION;
  capturedAt: string;
  components: WidgetManifest[];
}

/** Names reserved by components built into Teacharium itself. */
export const BUILT_IN_COMPONENT_NAMES: readonly string[] = ["Text"];

const TRANSITION_IN_OPTIONS = [
  { label: "None", value: "none" },
  { label: "Slide Left", value: "slideLeft" },
  { label: "Slide Right", value: "slideRight" },
  { label: "Slide Bottom", value: "slideBottom" },
  { label: "Slide Top", value: "slideTop" },
  { label: "Fade In", value: "fadeIn" },
];

/**
 * The widget's config with the common editor fields (name, transition,
 * frame, alignment, visibility) added.
 */
export function augmentWidgetConfigWithNameField<T>(
  widget: TeachariumWidget<T>,
): TeachariumWidget<T>["config"] {
  const existingFields = widget.config.fields ?? {};
  const hasNameField = Object.prototype.hasOwnProperty.call(
    existingFields,
    "name",
  );

  const commonFields: any = {};

  if (!hasNameField) {
    commonFields.name = {
      type: "text",
      label: "Component Name",
      placeholder: "Defaults to widget ID",
    };
  }

  commonFields.transitionIn = {
    type: "select",
    label: "Transition In",
    options: TRANSITION_IN_OPTIONS,
  };

  commonFields.transitionDelay = {
    type: "number",
    label: "Transition Delay (ms)",
    min: 0,
  };

  commonFields.frame = {
    type: "frame",
    label: "Frame",
  };

  commonFields.horizontalAlignment = {
    type: "select",
    label: "Horizontal Alignment",
    options: [
      { label: "None", value: "none" },
      { label: "Left", value: "left" },
      { label: "Center", value: "center" },
      { label: "Right", value: "right" },
    ],
  };

  commonFields.visible = {
    type: "condition",
    label: "Visible",
  };

  return {
    ...widget.config,
    fields: {
      ...existingFields,
      ...commonFields,
    },
    resolveFields: (data: any, { fields }: any) => {
      const originalResolvedFields = widget.config.resolveFields
        ? widget.config.resolveFields(data, { fields })
        : fields;

      // Make transitionDelay only visible when transitionIn is not "none"
      const transitionInValue = data?.props?.transitionIn ?? "none";
      const hasTransitionIn = transitionInValue !== "none";

      return {
        ...originalResolvedFields,
        transitionDelay: originalResolvedFields.transitionDelay
          ? {
              ...originalResolvedFields.transitionDelay,
              visible: hasTransitionIn,
            }
          : originalResolvedFields.transitionDelay,
      };
    },
  };
}

/**
 * Whether the editor decorates this widget with the common fields.
 * Logic components are invisible and are left undecorated.
 */
export function shouldDecorateWidget(
  widget: Pick<TeachariumWidget<unknown>, "category">,
): boolean {
  return widget.category !== "Logic";
}

/**
 * The component config the editor registers for a widget: the widget's own
 * config, augmented with common fields unless it is a Logic component.
 */
export function getEditorWidgetConfig<T>(
  widget: TeachariumWidget<T>,
): TeachariumWidget<T>["config"] {
  return shouldDecorateWidget(widget)
    ? augmentWidgetConfigWithNameField(widget)
    : widget.config;
}

/**
 * Recursively copy a value keeping only JSON-safe data.
 * Functions, symbols and undefined are dropped (array slots become null,
 * matching JSON.stringify); cycles are cut.
 */
export function toJsonSafe(
  value: unknown,
  seen = new WeakSet<object>(),
): unknown {
  if (value === null) return null;

  const valueType = typeof value;
  if (valueType === "string" || valueType === "boolean") return value;
  if (valueType === "number") {
    return Number.isFinite(value as number) ? value : null;
  }
  if (valueType !== "object") return undefined;

  const objectValue = value as object;
  if (seen.has(objectValue)) return undefined;
  seen.add(objectValue);

  try {
    if (Array.isArray(objectValue)) {
      return objectValue.map((item) => {
        const safe = toJsonSafe(item, seen);
        return safe === undefined ? null : safe;
      });
    }

    if (objectValue instanceof Date) {
      return objectValue.toISOString();
    }

    const result: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(objectValue)) {
      const safe = toJsonSafe(entry, seen);
      if (safe !== undefined) {
        result[key] = safe;
      }
    }
    return result;
  } finally {
    seen.delete(objectValue);
  }
}

/**
 * Convert Puck field definitions to JSON-safe fields, dropping fields that are
 * themselves functions and function properties such as a custom field's
 * `render`. `type: "custom"` fields keep their `valueType`.
 */
export function toJsonFields(
  fields: Record<string, unknown> | undefined | null,
): Record<string, JsonField> {
  const result: Record<string, JsonField> = {};
  for (const [fieldName, fieldValue] of Object.entries(fields ?? {})) {
    if (typeof fieldValue === "function") continue;
    const safe = toJsonSafe(fieldValue);
    if (
      safe &&
      typeof safe === "object" &&
      !Array.isArray(safe) &&
      typeof (safe as { type?: unknown }).type === "string"
    ) {
      result[fieldName] = safe as JsonField;
    }
  }
  return result;
}

function detectRegistersItems(
  widget: TeachariumWidget<unknown>,
): boolean | undefined {
  // No registry-level flag exists today; honour one if a widget declares it.
  const flag = (widget as { registersItems?: unknown }).registersItems;
  return typeof flag === "boolean" ? flag : undefined;
}

/**
 * Build the manifest for one registered widget component.
 * `render`, `resolveFields` and `resolveData` are not part of the manifest.
 */
export function buildWidgetManifest(
  widget: TeachariumWidget<any>,
  capturedAt: string = new Date().toISOString(),
): WidgetManifest {
  const editorConfig = getEditorWidgetConfig(widget);
  const manifest: WidgetManifest = {
    name: widget.name,
    fields: toJsonFields(editorConfig.fields as Record<string, unknown>),
    capturedAt,
  };

  if (widget.category) manifest.category = widget.category;
  if (typeof editorConfig.usagePrompt === "string") {
    manifest.usagePrompt = editorConfig.usagePrompt;
  }
  if (typeof widget.aiPrompt === "string") manifest.aiPrompt = widget.aiPrompt;

  const defaultProps = toJsonSafe(editorConfig.defaultProps);
  if (
    defaultProps &&
    typeof defaultProps === "object" &&
    !Array.isArray(defaultProps)
  ) {
    manifest.defaultProps = defaultProps as Record<string, unknown>;
  }

  const registersItems = detectRegistersItems(widget);
  if (registersItems !== undefined) manifest.registersItems = registersItems;

  return manifest;
}

/** Build the manifest for every component a bundle registered. */
export function buildWidgetVersionManifest(
  widgets: TeachariumWidget<any>[],
  capturedAt: string = new Date().toISOString(),
): WidgetVersionManifest {
  return {
    schemaVersion: WIDGET_VERSION_MANIFEST_SCHEMA_VERSION,
    capturedAt,
    components: widgets.map((widget) =>
      buildWidgetManifest(widget, capturedAt),
    ),
  };
}
