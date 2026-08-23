/**
 * The collection toolbar carries its result count inside the search
 * placeholder so a phone spends no vertical space on a count line. The
 * descriptive search label stays separate, so assistive technology still hears
 * what the field searches.
 */
export function collectionSearchPlaceholder(
  placeholder: string,
  resultLabel?: string,
): string {
  const label = resultLabel?.trim()
  return label ? `Search ${label}…` : placeholder
}

/** Counts the filter values a reader has actually chosen. */
export function activeFilterCount(
  values: readonly (string | number | null | undefined)[],
): number {
  return values.filter(
    (value) => value !== undefined && value !== null && value !== '',
  ).length
}
