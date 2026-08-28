import { Loader2, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { AiActionHelp } from '@/components/ai-action-help'
import type { RoasterFormValues } from '@/components/roasters/roaster-form-values'
import { RoasterInfoDiffModal } from '@/components/roasters/roaster-info-diff-modal'
import { Button } from '@/components/ui/button'
import type { ExtractedRoasterInfo } from '@/lib/ai'
import { getErrorMessage } from '@/lib/error-message'
import {
  checkRoasterResearchEnabled,
  researchRoasterInfo,
} from '@/lib/server/roasters'

export function RoasterResearchAction({
  currentData,
  disabled = false,
  onApply,
}: {
  readonly currentData: RoasterFormValues
  readonly disabled?: boolean
  readonly onApply: (updates: Partial<RoasterFormValues>) => void
}) {
  const [enabled, setEnabled] = useState(false)
  const [isResearching, setIsResearching] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [suggestedData, setSuggestedData] =
    useState<ExtractedRoasterInfo | null>(null)

  useEffect(() => {
    let active = true
    void checkRoasterResearchEnabled()
      .then((result) => {
        if (active) setEnabled(result.enabled)
      })
      .catch(() => {
        if (active) setEnabled(false)
      })
    return () => {
      active = false
    }
  }, [])

  if (!enabled) return null

  const handleResearch = async () => {
    const name = currentData.name.trim()
    if (!name) {
      toast.error('Enter a roaster name first')
      return
    }

    setIsResearching(true)
    try {
      const result = await researchRoasterInfo({
        data: {
          name,
          knownContext: {
            location: currentData.location,
            country: currentData.country,
            website: currentData.website,
            instagramHandle: currentData.instagramHandle,
            notes: currentData.notes,
          },
        },
      })
      if (Object.keys(result).length === 0) {
        toast.error('No roaster details found')
        return
      }
      setSuggestedData(result)
      setModalOpen(true)
    } catch (error) {
      toast.error(getErrorMessage(error, 'Research failed'))
    } finally {
      setIsResearching(false)
    }
  }

  return (
    <>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleResearch}
          disabled={disabled || isResearching || !currentData.name.trim()}
          aria-busy={isResearching}
          className="h-11 sm:h-11 [@media(hover:hover)]:h-8"
        >
          {isResearching ? <Loader2 className="animate-spin" /> : <Search />}
          {isResearching ? 'Researching…' : 'Research online'}
        </Button>
        <AiActionHelp>
          Finds and verifies official roaster details online. Uses the name plus
          any entered location, country, website, Instagram handle, and notes.
        </AiActionHelp>
      </div>

      {suggestedData ? (
        <RoasterInfoDiffModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          currentData={currentData}
          suggestedData={suggestedData}
          onApply={onApply}
        />
      ) : null}
    </>
  )
}
