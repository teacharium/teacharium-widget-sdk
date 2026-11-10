import { useCallback, useEffect, useMemo, useState } from "react";
import { TeachariumPlayer, TextConfig } from "@teacharium/player";
import { getWidgets } from "@teacharium/widget";
import type {
  WidgetManifest,
  WidgetVersionManifest,
} from "@teacharium/widget/manifest";

import { loadBundle, subscribeToBuilds, type DevStatus } from "./bundle";
import { EventLog, Inspector, type LoggedEvent } from "./Inspector";
import { buildPreviewLesson, DEFAULT_LAYOUT } from "./lesson";
import { PropsPanel } from "./PropsPanel";

const ADDITIONAL_COMPONENTS = { Text: TextConfig };
const MAX_EVENTS = 200;

/** Offline media: library ids can't resolve, so pass plain URLs through. */
const passThrough = (value: string | undefined) => ({
  data: value && /^(https?:|data:|blob:|\/)/.test(value) ? value : null,
});
const MEDIA_RESOLVERS = {
  useMediaUrl: passThrough,
  useVoiceoverUrl: () => ({ data: null }),
  useVideoUrls: () => ({
    hlsStreamUrl: null,
    mp4Url: null,
    thumbnailUrl: null,
  }),
};

function readSelection(): string | null {
  return new URLSearchParams(location.search).get("component");
}

export function App() {
  const [status, setStatus] = useState<DevStatus | null>(null);
  const [manifest, setManifest] = useState<WidgetVersionManifest | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(readSelection);
  const [propsByComponent, setPropsByComponent] = useState<
    Record<string, Record<string, unknown>>
  >({});
  const [mode, setMode] = useState<"player" | "review">("player");
  const [events, setEvents] = useState<LoggedEvent[]>([]);
  const [runKey, setRunKey] = useState(0);

  useEffect(() => subscribeToBuilds(setStatus), []);

  // Reload the bundle after every successful build.
  const version = status?.version ?? 0;
  useEffect(() => {
    if (version === 0) return;
    let cancelled = false;
    loadBundle(version)
      .then((next) => {
        if (cancelled) return;
        setManifest(next);
        setLoadError(null);
        setRunKey((key) => key + 1);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : String(error));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [version]);

  const components = manifest?.components ?? [];
  const component: WidgetManifest | undefined =
    components.find((c) => c.name === selected) ?? components[0];

  const props = useMemo(
    () =>
      component
        ? (propsByComponent[component.name] ??
          structuredClone(component.defaultProps ?? {}))
        : {},
    [component, propsByComponent],
  );

  const select = useCallback((name: string) => {
    setSelected(name);
    setEvents([]);
    history.replaceState(null, "", `?component=${encodeURIComponent(name)}`);
  }, []);

  const lesson = useMemo(
    () =>
      component
        ? buildPreviewLesson(component.name, props, DEFAULT_LAYOUT)
        : null,
    [component, props],
  );

  const onEvent = useCallback((event: { type: string }) => {
    const { type, ...data } = event;
    setEvents((previous) =>
      [{ at: Date.now(), type, data }, ...previous].slice(0, MAX_EVENTS),
    );
  }, []);

  return (
    <div className="h-app">
      <header className="h-header">
        <strong>Teacharium widget preview</strong>
        {status?.error ? (
          <span className="h-badge h-badge-error">Build failed</span>
        ) : status ? (
          <span className="h-badge">Build {status.version}</span>
        ) : (
          <span className="h-badge">Connecting…</span>
        )}
        <span className="h-spacer" />
        <label className="h-inline">
          Mode
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as "player" | "review")}
          >
            <option value="player">Player</option>
            <option value="review">Review</option>
          </select>
        </label>
        <button type="button" onClick={() => setRunKey((key) => key + 1)}>
          Restart
        </button>
      </header>

      {status?.error && <pre className="h-error">{status.error}</pre>}
      {loadError && !status?.error && (
        <pre className="h-error">{loadError}</pre>
      )}

      <div className="h-body">
        <aside className="h-sidebar">
          <h3>Components</h3>
          <ul className="h-components">
            {components.map((c) => (
              <li key={c.name}>
                <button
                  type="button"
                  className={
                    c.name === component?.name ? "h-active" : undefined
                  }
                  onClick={() => select(c.name)}
                >
                  {c.name}
                  {c.category && (
                    <span className="h-muted"> · {c.category}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
          {component && (
            <>
              <div className="h-row">
                <h3>Props</h3>
                <button
                  type="button"
                  className="h-link"
                  onClick={() =>
                    setPropsByComponent((all) => {
                      const next = { ...all };
                      delete next[component.name];
                      return next;
                    })
                  }
                >
                  Reset
                </button>
              </div>
              <PropsPanel
                fields={component.fields}
                props={props}
                onChange={(next) =>
                  setPropsByComponent((all) => ({
                    ...all,
                    [component.name]: next,
                  }))
                }
              />
            </>
          )}
        </aside>

        <main className="h-stage">
          {lesson && component ? (
            <TeachariumPlayer
              key={`${runKey}:${component.name}:${mode}:${JSON.stringify(props)}`}
              lesson={lesson}
              widgets={getWidgets()}
              additionalComponents={ADDITIONAL_COMPONENTS}
              mediaResolvers={MEDIA_RESOLVERS}
              mode={mode}
              showStartButton={false}
              onEvent={onEvent}
              sideContent={<Inspector />}
            />
          ) : (
            <p className="h-hint h-center">
              {status?.error || loadError
                ? "Fix the error above to see your components."
                : "Waiting for the first build…"}
            </p>
          )}
        </main>

        <aside className="h-sidebar h-sidebar-right">
          <EventLog events={events} onClear={() => setEvents([])} />
        </aside>
      </div>
    </div>
  );
}
