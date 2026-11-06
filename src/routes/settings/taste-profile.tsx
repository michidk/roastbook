import { createFileRoute } from '@tanstack/react-router'
import { Loader2, Sparkles, Tags } from 'lucide-react'
import { useEffect, useState } from 'react'
import { PanelSection } from '@/components/section-layout'
import { BeanTagSettings } from '@/components/settings/bean-tag-settings'
import {
  TasteProfileFieldToggle,
  TasteProfileSettings,
} from '@/components/settings/taste-profile-settings'
import { TasteTagSettings } from '@/components/settings/taste-tag-settings'
import { useAppSettings } from '@/hooks/use-app-settings'
import { useSettingMutation } from '@/hooks/use-setting-mutation'
import { getBeanTags } from '@/journal/bean-tags'
import { updateTasteProfileFields } from '@/journal/settings'
import { getTasteTags } from '@/journal/taste-tags'
import {
  enabledTasteProfileFields,
  type TasteProfileConfig,
  type TasteProfileField,
} from '@/lib/taste-profile'

export const Route = createFileRoute('/settings/taste-profile')({
  loader: async () => {
    const [tasteTags, beanTags] = await Promise.all([
      getTasteTags(),
      getBeanTags(),
    ])
    return { tasteTags, beanTags }
  },
  component: TasteProfileSection,
})

function TasteProfileSection() {
  const { tasteTags, beanTags } = Route.useLoaderData()
  const savedTasteProfile = useAppSettings().tasteProfile
  const [tasteProfile, setTasteProfile] = useState(savedTasteProfile)

  useEffect(() => setTasteProfile(savedTasteProfile), [savedTasteProfile])

  const tasteProfileMutation = useSettingMutation<TasteProfileConfig>({
    savedValue: savedTasteProfile,
    applyValue: setTasteProfile,
    mutate: (nextTasteProfile) =>
      updateTasteProfileFields({
        data: enabledTasteProfileFields(nextTasteProfile),
      }),
    selectValue: (updated) => updated.tasteProfile,
    errorMessage: 'Could not save the taste profile fields',
  })
  const toggleTasteProfileField = (
    field: TasteProfileField,
    enabled: boolean,
  ) => void tasteProfileMutation.save({ ...tasteProfile, [field]: enabled })

  return (
    <>
      <PanelSection
        title="Bean tags"
        description="Organize your coffee database. Rename or delete the defaults, or add your own tags."
      >
        <BeanTagSettings tags={beanTags} />
      </PanelSection>
      <PanelSection
        title="Taste profile"
        description="Choose which tasting inputs Roastbook captures for brews and café visits. A disabled input is hidden everywhere, including on entries that already recorded it."
        action={
          tasteProfileMutation.isSaving ? (
            <Loader2 className="size-5 animate-spin text-link" />
          ) : (
            <Sparkles className="size-5 text-link" aria-hidden="true" />
          )
        }
      >
        <TasteProfileSettings
          config={tasteProfile}
          disabled={tasteProfileMutation.isSaving}
          onToggle={toggleTasteProfileField}
        />
      </PanelSection>

      <PanelSection
        title="Taste tags"
        description="Choose whether rating a brew or café visit offers taste tags, then manage the list. Removing a tag also removes it from existing entries."
        action={
          tasteProfileMutation.isSaving ? (
            <Loader2 className="size-5 animate-spin text-link" />
          ) : (
            <Tags className="size-5 text-link" aria-hidden="true" />
          )
        }
      >
        <TasteProfileFieldToggle
          field="flavorTags"
          config={tasteProfile}
          disabled={tasteProfileMutation.isSaving}
          onToggle={toggleTasteProfileField}
        />

        {tasteProfile.flavorTags ? <TasteTagSettings tags={tasteTags} /> : null}
      </PanelSection>
    </>
  )
}
