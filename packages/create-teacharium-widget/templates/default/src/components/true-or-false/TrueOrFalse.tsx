import type { PuckComponent } from "@measured/puck";
import type {
  TeachariumComponentConfig,
  TeachariumWidgetApi,
} from "@teacharium/widget";

export interface TrueOrFalseProps {
  api: TeachariumWidgetApi;
  statement: string;
  answer: boolean;
  maxScore: number;
}

const TrueOrFalse: PuckComponent<TrueOrFalseProps> = ({
  api,
  statement,
  answer,
  maxScore,
}) => {
  // Register as a scored item. The player's "Check Answer" button, scoring,
  // SCORM/LTI results and review mode all read this item's status.
  const { updateAttempted, updateCorrect, updateAnswer, updateScore } =
    api.hooks.useIsItem({ options: { type: "scored", maxScore } });

  const [choice, setChoice] = api.hooks.useWidgetState<boolean | null>(
    "choice",
    null,
  );
  const disabled = api.isEditing || api.isReviewMode;

  const choose = (value: boolean) => {
    setChoice(value);
    const correct = value === answer;
    updateAttempted(true);
    updateCorrect(correct);
    updateScore(correct ? maxScore : 0);
    updateAnswer({
      humanReadable: value ? "True" : "False",
      machineReadable: value ? "true" : "false",
    });
  };

  return (
    <fieldset className="true-or-false" disabled={disabled}>
      <legend className="true-or-false__statement">{statement}</legend>
      {[true, false].map((value) => (
        <button
          key={String(value)}
          type="button"
          className={
            choice === value
              ? "true-or-false__option true-or-false__option--selected"
              : "true-or-false__option"
          }
          aria-pressed={choice === value}
          onClick={() => choose(value)}
        >
          {value ? "True" : "False"}
        </button>
      ))}
    </fieldset>
  );
};

export const TrueOrFalseConfig: TeachariumComponentConfig<TrueOrFalseProps> = {
  usagePrompt: "A single statement the learner marks as true or false.",
  render: TrueOrFalse,
  fields: {
    statement: { type: "textarea", label: "Statement" },
    answer: {
      type: "radio",
      label: "Correct answer",
      options: [
        { label: "True", value: true },
        { label: "False", value: false },
      ],
    },
    maxScore: { type: "number", label: "Points", min: 0 },
  },
  defaultProps: {
    statement: "The Earth orbits the Sun.",
    answer: true,
    maxScore: 1,
  },
};
