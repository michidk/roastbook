export interface ErrorDisplayState {
  title: string
  message: string
  hint?: string
}

const DB_UNAVAILABLE_PREFIX = "Database unavailable:"
const DB_NOT_CONFIGURED_PREFIX = "Database not configured:"
const DB_NOT_INITIALIZED_PREFIX = "Database not initialized:"

const DEFAULT_ERROR_STATE: ErrorDisplayState = {
  title: "Failed to load",
  message: "Something went wrong while loading this page.",
}

export function getErrorDisplayState(error: Error): ErrorDisplayState {
  const rawMessage = error.message || ""
  const lowerMessage = rawMessage.toLowerCase()

  if (rawMessage.startsWith(DB_UNAVAILABLE_PREFIX)) {
    return {
      title: "Database unavailable",
      message: rawMessage.replace(`${DB_UNAVAILABLE_PREFIX} `, ""),
      hint: "Start the local Postgres service or container, then retry the page.",
    }
  }

  if (rawMessage.startsWith(DB_NOT_CONFIGURED_PREFIX)) {
    return {
      title: "Database not configured",
      message: rawMessage.replace(`${DB_NOT_CONFIGURED_PREFIX} `, ""),
      hint: "Add DATABASE_URL to your environment before starting the dev server.",
    }
  }

  if (rawMessage.startsWith(DB_NOT_INITIALIZED_PREFIX)) {
    return {
      title: "Database not initialized",
      message: rawMessage.replace(`${DB_NOT_INITIALIZED_PREFIX} `, ""),
      hint: "Run the Drizzle migrations, then retry the page.",
    }
  }

  if (
    lowerMessage.includes("connection refused") ||
    lowerMessage.includes("econnrefused") ||
    lowerMessage.includes("connect econnrefused")
  ) {
    return {
      title: "Database unavailable",
      message:
        "Roastbook couldn't reach PostgreSQL at the configured DATABASE_URL.",
      hint: "Start the local Postgres service or container, then retry the page.",
    }
  }

  if (lowerMessage.includes("database_url environment variable is required")) {
    return {
      title: "Database not configured",
      message: "Roastbook is missing its DATABASE_URL configuration.",
      hint: "Add DATABASE_URL to your environment before starting the dev server.",
    }
  }

  if (
    lowerMessage.includes("failed query") &&
    (lowerMessage.includes("relation \"shots\" does not exist") ||
      lowerMessage.includes("relation \"beans\" does not exist") ||
      lowerMessage.includes("relation \"gear\" does not exist") ||
      lowerMessage.includes("relation \"cafe_visits\" does not exist") ||
      lowerMessage.includes("relation \"places\" does not exist"))
  ) {
    return {
      title: "Database not initialized",
      message: "Roastbook connected to PostgreSQL, but the app tables have not been created yet.",
      hint: "Run the Drizzle migrations, then retry the page.",
    }
  }

  return {
    ...DEFAULT_ERROR_STATE,
    message: rawMessage || DEFAULT_ERROR_STATE.message,
  }
}

function getRawErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === "string") {
    return error
  }

  return ""
}

export function toDisplayableError(error: unknown): Error {
  const rawMessage = getRawErrorMessage(error)
  const lowerMessage = rawMessage.toLowerCase()

  if (
    lowerMessage.includes("connection refused") ||
    lowerMessage.includes("econnrefused") ||
    lowerMessage.includes("connect econnrefused")
  ) {
    return new Error(
      `${DB_UNAVAILABLE_PREFIX} Roastbook couldn't reach PostgreSQL at the configured DATABASE_URL.`
    )
  }

  if (lowerMessage.includes("database_url environment variable is required")) {
    return new Error(
      `${DB_NOT_CONFIGURED_PREFIX} Roastbook is missing its DATABASE_URL configuration.`
    )
  }

  if (
    lowerMessage.includes("relation \"shots\" does not exist") ||
    lowerMessage.includes("relation \"beans\" does not exist") ||
    lowerMessage.includes("relation \"gear\" does not exist") ||
    lowerMessage.includes("relation \"cafe_visits\" does not exist") ||
    lowerMessage.includes("relation \"places\" does not exist")
  ) {
    return new Error(
      `${DB_NOT_INITIALIZED_PREFIX} Roastbook connected to PostgreSQL, but the app tables have not been created yet.`
    )
  }

  return error instanceof Error ? error : new Error("Unknown error")
}
