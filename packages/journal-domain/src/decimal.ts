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
