// Drizzle's PGlite session reads these type ids. Importing them from PGlite
// would bundle its database engine into the page; the engine runs in the worker.
export const types = {
  DATE: 1082,
  TIMESTAMP: 1114,
  TIMESTAMPTZ: 1184,
  INTERVAL: 1186,
} as const

export class PGlite {
  constructor() {
    throw new Error('The journal database runs in its worker')
  }
}
