/**
 * Loading the widget bundle under preview, and live-reload events from
 * `teacharium dev`.
 */
import type { WidgetVersionManifest } from "@teacharium/widget/manifest";

export interface DevStatus {
  /** Increments on every successful build. */
  version: number;
  error: string | null;
}

let cssLink: HTMLLinkElement | null = null;

/**
 * Load (or reload) the bundle: clear the registry, re-import the module under
 * a fresh URL so it evaluates again, and swap the stylesheet.
 */
export async function loadBundle(version: number): Promise<WidgetVersionManifest> {
  const manifestResponse = await fetch(`/bundle/manifest.json?v=${version}`);
  if (!manifestResponse.ok) {
    throw new Error("No build yet. Waiting for the first successful build…");
  }
  const manifest = (await manifestResponse.json()) as WidgetVersionManifest;

  window.TeachariumComponents = {};
  await import(/* @vite-ignore */ `/bundle/widget.js?v=${version}`);

  const nextCss = document.createElement("link");
  nextCss.rel = "stylesheet";
  nextCss.href = `/bundle/widget.css?v=${version}`;
  nextCss.onerror = () => nextCss.remove(); // CSS is optional
  document.head.appendChild(nextCss);
  cssLink?.remove();
  cssLink = nextCss;

  return manifest;
}

/** Subscribe to build results from the dev server. */
export function subscribeToBuilds(onStatus: (status: DevStatus) => void) {
  const source = new EventSource("/__teacharium/events");
  source.addEventListener("status", (event) => {
    onStatus(JSON.parse((event as MessageEvent).data) as DevStatus);
  });
  return () => source.close();
}
