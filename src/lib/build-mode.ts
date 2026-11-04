declare const __ROASTBOOK_DEMO_MODE__: boolean

export const DEMO_MODE =
  typeof __ROASTBOOK_DEMO_MODE__ === 'boolean' ? __ROASTBOOK_DEMO_MODE__ : false

export const DEMO_MODE_READ_ONLY_MESSAGE =
  'The demo cannot write to the server. Journal changes are saved only in your browser.'

export const PREFERENCES_STORAGE_KEY = DEMO_MODE
  ? 'roastbook-demo-preferences'
  : 'roastbook-settings'
