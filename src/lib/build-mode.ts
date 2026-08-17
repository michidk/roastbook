declare const __ROASTBOOK_DEMO_MODE__: boolean

export const DEMO_MODE =
  typeof __ROASTBOOK_DEMO_MODE__ === 'boolean' ? __ROASTBOOK_DEMO_MODE__ : false
