import { Bug, ExternalLink, Github, Info, Scale } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const projectUrl = 'https://github.com/michidk/roastbook'

function AboutLink({
  href,
  icon: Icon,
  title,
  description,
}: {
  readonly href: string
  readonly icon: typeof Github
  readonly title: string
  readonly description: string
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="group flex min-h-18 items-center gap-4 rounded-xl border border-border bg-card p-3 outline-none transition-colors hover:bg-secondary focus-visible:ring-3 focus-visible:ring-ring/50 sm:p-4"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-link">
        <Icon className="size-5" aria-hidden={true} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display font-bold text-foreground">
          {title}
        </span>
        <span className="block text-sm text-muted-foreground">
          {description}
        </span>
      </span>
      <ExternalLink
        className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-link"
        aria-hidden={true}
      />
    </a>
  )
}

export function AboutSettings() {
  return (
    <Card role="group" aria-labelledby="about-roastbook">
      <CardHeader className="border-b border-border">
        <div className="flex items-center gap-2.5">
          <Info className="size-5 text-link" aria-hidden={true} />
          <CardTitle id="about-roastbook">About Roastbook</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <p className="leading-relaxed">
            Roastbook is a self-hosted coffee journal for brews, beans, recipes,
            café visits, roasters, brewing methods, and gear.
          </p>
          <p className="text-sm text-muted-foreground">
            Made for coffee people who want to own their data. Open source and
            available under the MIT License.
          </p>
        </div>

        <div className="grid gap-3">
          <AboutLink
            href={projectUrl}
            icon={Github}
            title="View on GitHub"
            description="Explore the source, documentation, and releases"
          />
          <AboutLink
            href={`${projectUrl}/issues/new`}
            icon={Bug}
            title="Report a bug"
            description="Found something that is not working? Let us know"
          />
          <AboutLink
            href={`${projectUrl}/blob/main/LICENSE`}
            icon={Scale}
            title="MIT License"
            description="Read the license for using and contributing"
          />
        </div>
      </CardContent>
    </Card>
  )
}
