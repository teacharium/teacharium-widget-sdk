export {
  teachariumWidget,
  WIDGET_EXTERNALS,
  type TeachariumVitePlugin,
  type TeachariumWidgetOptions,
} from "./vite-plugin.js";
export {
  BUNDLE_CSS,
  BUNDLE_JS,
  BUNDLE_MANIFEST,
  PROJECT_FILE,
  bundlePaths,
  loadProject,
  type LoadedWidgetProject,
  type WidgetProject,
} from "./project.js";
export {
  buildProject,
  verifyBuild,
  BuildError,
  type BuildOptions,
  type BuildResult,
} from "./build.js";
export { captureManifest, type CaptureResult } from "./capture/index.js";
export {
  bareImports,
  checkBundle,
  checkManifest,
  MAX_CSS_BYTES,
  MAX_JS_BYTES,
} from "./checks/contract.js";
