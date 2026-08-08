import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const URL_SCHEME_PATTERN = /^[a-z][a-z0-9+.-]*:\/\//i

/**
 * Normalizes user-entered URLs by prepending "https://" when no scheme is
 * present (e.g. "www.example.com" -> "https://www.example.com"). Without
 * this, a scheme-less value fails native `<input type="url">` validation
 * silently (no error toast, no server request) and would otherwise render
 * as a broken relative link if saved as-is.
 */
export function normalizeUrl(value: string): string {
  const trimmed = value.trim()
  if (!trimmed || URL_SCHEME_PATTERN.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

/**
 * Normalizes a string for case/whitespace-insensitive comparison, e.g. to
 * detect duplicate roaster names like "Bluebird Coffee Roastery" vs
 * "bluebird  coffee roastery ". Lowercases, trims, and collapses runs of
 * internal whitespace to a single space.
 */
export function normalizeForComparison(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ")
}

/**
 * Formats a date using an explicit day/month/year representation instead of
 * the locale-dependent, ambiguous output of `toLocaleDateString()` called
 * with no arguments (which can render as MM/DD/YYYY or DD/MM/YYYY depending
 * on the runtime locale, e.g. "8/9/2026").
 */
export function formatDate(value: Date | string | number): string {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}
