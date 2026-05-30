// Ambient declarations for @cypress/grep (5.x).
//
// The package ships only an "exports" map and no "main"/"types" field, which
// TypeScript's classic "node" moduleResolution (used by this project on TS 4.9)
// cannot resolve. Cypress's own bundler resolves it correctly at runtime; these
// declarations just satisfy the type-checker and editor.
//
// Drop this file if moduleResolution is ever moved to "bundler"/"node16".
declare module "@cypress/grep" {
  /** Call once in the support file to enable --env grep / grepTags filtering. */
  export function register(): void;
}

declare module "@cypress/grep/plugin" {
  /** Wire into setupNodeEvents to allow grep to pre-filter spec files. Returns the config. */
  export function plugin<T>(config: T): T;
}
