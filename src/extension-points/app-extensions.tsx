// Default: nothing. An extension can mount client-side integrations here, such
// as a consent banner, once per page for the signed-in user (or none).
export function AppExtensions(_props: { userId: string | null }) {
  return null
}
