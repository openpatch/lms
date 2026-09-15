/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SERVER_HOST?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** The commit this bundle was built from — see `buildStamp` in vite.config.ts.
 *  `sha` is empty when the build had no git to ask. */
declare const __APP_VERSION__: { sha: string; date: string }
