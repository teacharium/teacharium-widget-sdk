import type { PuckComponent } from "@measured/puck";
import type {
  TeachariumComponentConfig,
  TeachariumWidgetApi,
} from "@teacharium/widget";

export interface HelloCardProps {
  api: TeachariumWidgetApi;
  title: string;
  message: string;
  accent: "blue" | "green" | "orange";
}

const HelloCard: PuckComponent<HelloCardProps> = ({
  api,
  title,
  message,
  accent,
}) => {
  // Resolve {{variable}} placeholders against the lesson's variables.
  const [resolvedMessage] = api.hooks.useStringExpressions([message]);

  // Widget state survives step navigation and lesson resume (unlike useState).
  const [waves, setWaves] = api.hooks.useWidgetState<number>("waves", 0);

  // Don't react to clicks while an author is editing, or when a learner
  // reviews completed work.
  const interactive = !api.isEditing && !api.isReviewMode;

  return (
    <div className={`hello-card hello-card--${accent}`}>
      <h3 className="hello-card__title">{title}</h3>
      <p className="hello-card__message">{resolvedMessage}</p>
      <button
        type="button"
        className="hello-card__button"
        disabled={!interactive}
        onClick={() => setWaves((count) => count + 1)}
      >
        Wave back ({waves})
      </button>
    </div>
  );
};

export const HelloCardConfig: TeachariumComponentConfig<HelloCardProps> = {
  usagePrompt: "A friendly card with a title and a message.",
  render: HelloCard,
  fields: {
    title: { type: "text", label: "Title" },
    message: { type: "stringExpression", label: "Message" },
    accent: {
      type: "select",
      label: "Accent",
      options: [
        { label: "Blue", value: "blue" },
        { label: "Green", value: "green" },
        { label: "Orange", value: "orange" },
      ],
    },
  },
  defaultProps: {
    title: "Hello!",
    message: "Welcome to the lesson.",
    accent: "blue",
  },
};
