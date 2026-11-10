import { useEffect, useState } from "react";
import type { PuckComponent } from "@measured/puck";
import type {
  TeachariumComponentConfig,
  TeachariumWidgetApi,
} from "@teacharium/widget";

export interface ReadingTimerProps {
  api: TeachariumWidgetApi;
  seconds: number;
  showCountdown: "yes" | "no";
}

const ReadingTimer: PuckComponent<ReadingTimerProps> = ({
  api,
  seconds,
  showCountdown,
}) => {
  const emit = api.hooks.useLessonEventEmitter();
  // Persisted, so going back to a finished step doesn't lock it again.
  const [done, setDone] = api.hooks.useWidgetState("done", false);
  const [remaining, setRemaining] = useState(seconds);

  // Logic components don't run while editing or in review.
  const active = !api.isEditing && !api.isReviewMode;

  useEffect(() => {
    if (!active || done) return;
    // Player events take their arguments in `params`.
    emit({ type: "setNextButtonStatus", params: { status: "disabled" } });

    const started = Date.now();
    const timer = window.setInterval(() => {
      const left = Math.max(0, seconds - Math.floor((Date.now() - started) / 1000));
      setRemaining(left);
      if (left === 0) {
        window.clearInterval(timer);
        setDone(true);
        emit({ type: "setNextButtonStatus", params: { status: "enabled" } });
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, [active, done, seconds, emit, setDone]);

  if (api.isEditing) {
    return (
      <div className="example-timer example-timer--editing">
        Reading timer: Next unlocks after {seconds}s
      </div>
    );
  }
  // Puck components must return an element, not null.
  if (!active || done || showCountdown === "no") return <></>;
  return (
    <div className="example-timer" role="status">
      Next unlocks in {remaining}s
    </div>
  );
};

export const ReadingTimerConfig: TeachariumComponentConfig<ReadingTimerProps> = {
  usagePrompt: "Keeps the Next button disabled for a number of seconds.",
  render: ReadingTimer,
  fields: {
    seconds: { type: "number", label: "Seconds", min: 1 },
    showCountdown: {
      type: "radio",
      label: "Show countdown",
      options: [
        { label: "Yes", value: "yes" },
        { label: "No", value: "no" },
      ],
    },
  },
  defaultProps: { seconds: 10, showCountdown: "yes" },
};
