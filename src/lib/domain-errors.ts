export type DomainErrorCode = 'conflict' | 'not_found' | 'validation'

export class DomainError extends Error {
  readonly code: DomainErrorCode

  constructor(code: DomainErrorCode, message: string) {
    super(message)
    this.name = 'DomainError'
    this.code = code
  }
}

export function notFound(entity: string): DomainError {
  return new DomainError('not_found', `${entity} not found`)
}

export function expectReturnedRow<T>(
  row: T | null | undefined,
  entity: string,
): T {
  if (row == null) throw notFound(entity)
  return row
}
