export function focusFirstInvalidControl(form: HTMLFormElement): void {
  requestAnimationFrame(() => {
    const control = form.querySelector<HTMLElement>('[aria-invalid="true"]')
    if (!control) return
    control.focus()
    control.scrollIntoView({ block: 'center' })
  })
}
