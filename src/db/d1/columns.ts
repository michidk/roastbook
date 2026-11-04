import { type AnyColumn, sql } from 'drizzle-orm'
import { check, customType, integer } from 'drizzle-orm/sqlite-core'
import { z } from 'zod'

export function boolean<TName extends string>(name: TName) {
  return integer(name, { mode: 'boolean' })
}

export function timestamp<TName extends string>(
  name: TName,
  _options?: { withTimezone: boolean },
) {
  return integer(name, { mode: 'timestamp_ms' })
}

const decimalInput = /^([+-]?)(\d+)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/

export function normalizeDecimal(
  value: string,
  precision: number,
  scale: number,
): string {
  if (value.length > 256) throw new Error('Invalid decimal value')
  const match = decimalInput.exec(value.trim())
  if (!match) throw new Error('Invalid decimal value')
  const negative = match[1] === '-'
  const digits = match[2] ?? ''
  const fraction = match[3] ?? ''
  const exponent = Number(match[4] ?? '0')
  if (!Number.isSafeInteger(exponent) || Math.abs(exponent) > 128)
    throw new Error('Invalid decimal exponent')
  let coefficient = BigInt(`${digits}${fraction}`)
  const shift = scale - fraction.length + exponent
  if (shift >= 0) coefficient *= 10n ** BigInt(shift)
  else {
    const divisor = 10n ** BigInt(-shift)
    const remainder = coefficient % divisor
    coefficient /= divisor
    if (remainder * 2n >= divisor) coefficient += 1n
  }
  if (coefficient >= 10n ** BigInt(precision))
    throw new Error('Decimal precision exceeded')
  const sign = negative && coefficient !== 0n ? '-' : ''
  const padded = coefficient.toString().padStart(scale + 1, '0')
  return scale === 0
    ? `${sign}${padded}`
    : `${sign}${padded.slice(0, -scale)}.${padded.slice(-scale)}`
}

// TEXT avoids SQLite NUMERIC affinity converting money to binary floating point.
export function decimal<TName extends string>(
  name: TName,
  { precision, scale }: { precision: number; scale: number },
) {
  return customType<{ data: string; driverData: string }>({
    dataType: () => 'text',
    toDriver: (value) => normalizeDecimal(value, precision, scale),
    fromDriver: (value) => normalizeDecimal(value, precision, scale),
  })(name)
}

export function decimalConstraint(
  name: string,
  column: AnyColumn,
  precision: number,
  scale: number,
) {
  const magnitude = sql`case when substr(${column}, 1, 1) = '-' then substr(${column}, 2) else ${column} end`
  const digits = sql`replace(${magnitude}, '.', '')`
  return check(
    name,
    sql`${column} is null or (
      typeof(${column}) = 'text'
      and ${magnitude} not glob '*[^0-9.]*'
      and ${magnitude} glob '[0-9]*'
      and length(${digits}) between 1 and ${precision}
      and length(${magnitude}) - length(${digits}) = ${scale === 0 ? 0 : 1}
      and (${scale} = 0 or (
        instr(${magnitude}, '.') > 1
        and length(substr(${magnitude}, instr(${magnitude}, '.') + 1)) = ${scale}
      ))
    )`.inlineParams(),
  )
}

const stringArraySchema = z.array(z.string())
export const stringArray = customType<{ data: string[]; driverData: string }>({
  dataType: () => 'text',
  toDriver: (value) =>
    JSON.stringify(
      stringArraySchema.parse(
        typeof value === 'string' ? JSON.parse(value) : value,
      ),
    ),
  fromDriver: (value) => stringArraySchema.parse(JSON.parse(value)),
})

export const jsonb = customType<{ data: unknown; driverData: string }>({
  dataType: () => 'text',
  toDriver: (value) => JSON.stringify(z.json().parse(value)),
  fromDriver: (value) => z.json().parse(JSON.parse(value)),
})

// Better Auth's SQLite adapter serializes JSON before passing it to Drizzle.
// Keep this separate so journal JSON strings remain strings.
export const authJson = customType<{ data: unknown; driverData: string }>({
  dataType: () => 'text',
  toDriver: (value) =>
    JSON.stringify(
      z.json().parse(typeof value === 'string' ? JSON.parse(value) : value),
    ),
  fromDriver: (value) => z.json().parse(JSON.parse(value)),
})

export function enumConstraint(
  name: string,
  column: AnyColumn,
  values: readonly string[],
) {
  return check(
    name,
    sql`${column} in (${sql.join(
      values.map((value) => sql`${value}`),
      sql`, `,
    )})`.inlineParams(),
  )
}

export function enumArrayConstraint(
  name: string,
  column: AnyColumn,
  values: readonly string[],
) {
  let remaining = sql`json(${column})`
  for (const value of values)
    remaining = sql`replace(${remaining}, ${JSON.stringify(value)}, '')`
  return check(
    name,
    sql`${column} is null or (
      json_valid(${column}) and json_type(${column}) = 'array'
      and replace(${remaining}, ',', '') = '[]'
    )`.inlineParams(),
  )
}
