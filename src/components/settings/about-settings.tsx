import { Bug, CodeXml, Scale } from 'lucide-react'
import { PanelSection } from '@/components/section-layout'
import { AboutLink } from '@/components/settings/about-link'

const projectUrl = 'https://github.com/michidk/roastbook'

export function AboutSettings() {
  return (
    <PanelSection
      title="About Roastbook"
      description="An open-source coffee journal you run on your own server."
    >
      <p className="leading-relaxed">
        Log brews, beans, recipes, roasters, café visits and gear in one place.
        Your journal stays in your database, and you can export it at any time.
      </p>

      <div className="grid gap-3">
        <AboutLink
          href={projectUrl}
          icon={CodeXml}
          title="Source code"
          description="Documentation, releases and the changelog on GitHub"
        />
        <AboutLink
          href={`${projectUrl}/issues/new`}
          icon={Bug}
          title="Report a bug or request a feature"
          description="Open an issue on GitHub"
        />
        <AboutLink
          href={`${projectUrl}/blob/main/LICENSE`}
          icon={Scale}
          title="MIT License"
          description="Free to use, modify and share"
        />
      </div>
    </PanelSection>
  )
}
