import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { PageHelp } from '@/components/page-help'
import { PanelSection } from '@/components/section-layout'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useDateFormatter } from '@/hooks/use-date-formatter'
import { OPEN_PRIVACY_SETTINGS, TERMS_URL } from '../legal'
import { getAccountPreferences, setNewsletterOptIn } from '../preferences'

type Preferences = Awaited<ReturnType<typeof getAccountPreferences>>

export function AccountSettingsExtensions() {
  const [preferences, setPreferences] = useState<Preferences>()
  const [busy, setBusy] = useState(false)
  const date = useDateFormatter()
  useEffect(() => {
    void getAccountPreferences()
      .then(setPreferences)
      .catch(() => undefined)
  }, [])

  async function changeNewsletter(optIn: boolean) {
    if (!preferences) return
    setBusy(true)
    try {
      await setNewsletterOptIn({ data: optIn })
      setPreferences({ ...preferences, newsletter: optIn })
      toast.success(optIn ? 'Subscribed to the newsletter' : 'Unsubscribed')
    } catch {
      toast.error('Could not update the newsletter setting')
    } finally {
      setBusy(false)
    }
  }

  return (
    <PanelSection
      title="Communication and privacy"
      description="Choose what you hear from us and what we may measure."
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-1">
          <div className="space-y-1">
            <Label htmlFor="newsletter-opt-in">Newsletter</Label>
            <p className="text-sm text-muted-foreground">
              Occasional news about features and coffee guides.
            </p>
          </div>
          <PageHelp ariaLabel="About the newsletter">
            Now and then we write about new features and coffee guides. No
            spam, and you can unsubscribe here at any time.
          </PageHelp>
        </div>
        <Switch
          id="newsletter-opt-in"
          checked={preferences?.newsletter ?? false}
          disabled={!preferences || busy}
          onCheckedChange={(checked) => void changeNewsletter(checked)}
        />
      </div>
      <div className="flex flex-wrap items-start justify-between gap-4 border-t border-border pt-4">
        <div className="flex items-start gap-1">
          <div className="space-y-1">
            <p className="text-sm font-medium">Analytics</p>
            <p className="text-sm text-muted-foreground">
              Usage analytics, error reports and masked session replays.
            </p>
          </div>
          <PageHelp ariaLabel="About analytics">
            Analytics help us improve Roastbook and fix problems faster. Your
            journal content stays hidden. You can allow or stop it at any time.
          </PageHelp>
        </div>
        <Button
          variant="outline"
          onClick={() => window.dispatchEvent(new Event(OPEN_PRIVACY_SETTINGS))}
        >
          Privacy settings
        </Button>
      </div>
      {preferences?.termsAcceptedAt ? (
        <p className="border-t border-border pt-4 text-sm text-muted-foreground">
          You accepted the{' '}
          <a
            href={TERMS_URL}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-link underline underline-offset-2"
          >
            Terms of Service
          </a>{' '}
          (version {preferences.termsVersion}) on{' '}
          {date(preferences.termsAcceptedAt)}.
        </p>
      ) : null}
    </PanelSection>
  )
}
