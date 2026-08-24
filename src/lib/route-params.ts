import { notFound } from '@tanstack/react-router'

/**
 * Parses a numeric id path parameter. Non-numeric values such as
 * `/beans/abc` throw the router's not-found instead of sending NaN to a
 * server function.
 */
export function parseIdParam(value: string): number {
  const id = Number(value)
  if (!Number.isInteger(id) || id < 1) {
    throw notFound()
  }
  return id
}
