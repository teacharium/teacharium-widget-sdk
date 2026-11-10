import React from "react";
import * as ReactDOM from "react-dom";
import { createRoot } from "react-dom/client";

import "@teacharium/player/styles";
import "./styles.css";

import { App } from "./App";

// Widget bundles get React through the import map shims, which read these.
declare global {
  interface Window {
    React: typeof React;
    ReactDOM: typeof ReactDOM;
  }
}
window.React = React;
window.ReactDOM = ReactDOM;

createRoot(document.getElementById("root")!).render(<App />);
