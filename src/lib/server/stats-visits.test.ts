import { describe, expect, it } from "vitest"
import { buildVisitsThisMonthQuery } from "./stats-visits"

describe("visit statistics queries", () => {
  it("encodes the monthly boundary as a PostgreSQL timestamp parameter", () => {
    // Given
    const startOfMonth = new Date("2026-08-01T00:00:00.000Z")

    // When
    const query = buildVisitsThisMonthQuery(startOfMonth).toSQL()

    // Then
    expect(query.params).toEqual([startOfMonth.toISOString()])
  })
})
