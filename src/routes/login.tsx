import { createFileRoute } from '@tanstack/react-router'
import { Coffee, LockKeyhole } from 'lucide-react'
import { LoginForm } from '@/components/auth/login-form'

export const Route = createFileRoute('/login')({ component: LoginPage })

function LoginPage() {
  return (
    <main
      id="main-content"
      className="mx-auto flex min-h-svh w-full max-w-6xl flex-col px-4 py-6 sm:px-8 sm:py-10 lg:px-12"
    >
      <div className="flex items-center justify-center gap-2.5 lg:justify-start">
        <img
          src="/navbar-logo.png"
          alt=""
          width={40}
          height={40}
          className="size-10 object-contain"
        />
        <span className="font-display text-2xl font-extrabold tracking-tight">
          Roastbook
        </span>
      </div>
      <div className="grid flex-1 items-center gap-10 py-8 lg:grid-cols-[1fr_1.05fr] lg:gap-20 lg:py-14">
        <section
          className="hidden space-y-8 lg:block"
          aria-labelledby="journal-heading"
        >
          <div className="flex size-16 items-center justify-center rounded-2xl border border-border bg-secondary text-coffee">
            <Coffee aria-hidden className="size-8" strokeWidth={1.5} />
          </div>
          <div className="space-y-5">
            <h2
              id="journal-heading"
              className="font-display text-6xl leading-[1.05] font-extrabold tracking-tight"
            >
              Good coffee.
              <br />
              Worth remembering.
            </h2>
            <p className="max-w-sm text-lg leading-relaxed text-muted-foreground">
              Keep your coffees, recipes, and tasting notes in one place. Find
              what made that cup worth brewing again.
            </p>
          </div>
        </section>
        <div className="mx-auto w-full max-w-md lg:max-w-none">
          <LoginForm />
          <p className="mt-5 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <LockKeyhole aria-hidden className="size-4" />
            Your journal is private to you.
          </p>
        </div>
      </div>
    </main>
  )
}
