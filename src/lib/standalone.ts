export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    Reflect.get(navigator, 'standalone') === true
  )
}
