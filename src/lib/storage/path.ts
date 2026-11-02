export function generateStoragePath(
  type: 'beans' | 'gear' | 'coffee-shops' | 'shots' | 'cafe-visits',
  id: number,
  filename: string,
): string {
  const ext = filename.split('.').pop() || 'jpg'
  return `${type}/${id}/${Date.now()}-${crypto.randomUUID()}.${ext}`
}
