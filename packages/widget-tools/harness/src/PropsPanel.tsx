import { useEffect, useState } from "react";
import type { JsonField } from "@teacharium/widget/manifest";

interface PropsPanelProps {
  fields: Record<string, JsonField>;
  props: Record<string, unknown>;
  onChange: (props: Record<string, unknown>) => void;
}

/** Fields the harness edits with a form control; the rest are edited as JSON. */
const SIMPLE_TYPES = new Set(["text", "textarea", "number", "select", "radio"]);

/** Common editor fields (layout chrome) that rarely matter while previewing. */
const COMMON_FIELDS = new Set([
  "name",
  "transitionIn",
  "transitionDelay",
  "frame",
  "horizontalAlignment",
  "visible",
]);

interface Option {
  label: string;
  value: unknown;
}

function SimpleField({
  name,
  field,
  value,
  onChange,
}: {
  name: string;
  field: JsonField;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const label = (field.label as string | undefined) ?? name;
  const options = (field.options as Option[] | undefined) ?? [];

  let control: React.ReactNode;
  switch (field.type) {
    case "textarea":
      control = (
        <textarea
          rows={3}
          value={(value as string | undefined) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
      break;
    case "number":
      control = (
        <input
          type="number"
          value={(value as number | undefined) ?? ""}
          min={field.min as number | undefined}
          max={field.max as number | undefined}
          step={field.step as number | undefined}
          onChange={(e) =>
            onChange(e.target.value === "" ? undefined : Number(e.target.value))
          }
        />
      );
      break;
    case "select":
    case "radio": {
      const index = options.findIndex(
        (option) => JSON.stringify(option.value) === JSON.stringify(value),
      );
      control = (
        <select
          value={index}
          onChange={(e) => onChange(options[Number(e.target.value)]?.value)}
        >
          {index === -1 && <option value={-1}>—</option>}
          {options.map((option, i) => (
            <option key={i} value={i}>
              {option.label}
            </option>
          ))}
        </select>
      );
      break;
    }
    default:
      control = (
        <input
          type="text"
          value={(value as string | undefined) ?? ""}
          placeholder={field.placeholder as string | undefined}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }

  return (
    <label className="h-field">
      <span className="h-field-label">
        {label} <code>{name}</code>
      </span>
      {control}
    </label>
  );
}

export function PropsPanel({ fields, props, onChange }: PropsPanelProps) {
  const [json, setJson] = useState(() => JSON.stringify(props, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);

  useEffect(() => {
    setJson(JSON.stringify(props, null, 2));
    setJsonError(null);
  }, [props]);

  const entries = Object.entries(fields);
  const simple = entries.filter(
    ([name, field]) => SIMPLE_TYPES.has(field.type) && !COMMON_FIELDS.has(name),
  );
  const complex = entries.filter(
    ([name, field]) =>
      !SIMPLE_TYPES.has(field.type) && !COMMON_FIELDS.has(name),
  );

  return (
    <div className="h-props">
      {simple.map(([name, field]) => (
        <SimpleField
          key={name}
          name={name}
          field={field}
          value={props[name]}
          onChange={(value) => onChange({ ...props, [name]: value })}
        />
      ))}
      {complex.length > 0 && (
        <p className="h-hint">
          Edit {complex.map(([name, f]) => `${name} (${f.type})`).join(", ")} in
          the JSON below.
        </p>
      )}
      <label className="h-field">
        <span className="h-field-label">All props (JSON)</span>
        <textarea
          className="h-json"
          rows={14}
          spellCheck={false}
          value={json}
          onChange={(e) => {
            setJson(e.target.value);
            try {
              const parsed = JSON.parse(e.target.value);
              if (
                !parsed ||
                typeof parsed !== "object" ||
                Array.isArray(parsed)
              ) {
                throw new Error("Props must be a JSON object");
              }
              setJsonError(null);
              onChange(parsed);
            } catch (error) {
              setJsonError(
                error instanceof Error ? error.message : String(error),
              );
            }
          }}
        />
        {jsonError && <span className="h-error-text">{jsonError}</span>}
      </label>
    </div>
  );
}
