import { type SyntheticEvent, useState } from 'react'

type FormSubmissionOptions = {
  readonly canSubmit?: () => boolean
  readonly submit: () => Promise<void>
  readonly onError: (error: unknown) => void
}

export function useFormSubmission({
  canSubmit,
  submit,
  onError,
}: FormSubmissionOptions) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (canSubmit && !canSubmit()) return

    setIsSubmitting(true)
    try {
      await submit()
    } catch (error) {
      onError(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return { isSubmitting, handleSubmit }
}
