import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router"
import { useEffect, useState, useMemo } from "react"
import { ArrowLeft, Trash2, Archive, ArchiveRestore, Pencil, Plus, Search, ImageIcon, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress"
import { getBean, deleteBean, updateBean, extractBeanInfo, researchBeanInfo, checkVisionEnabled, checkResearchEnabled } from "@/lib/server/beans"
import { getShotsByBean } from "@/lib/server/shots"
import { getRoasters } from "@/lib/server/roasters"
import { ShotsTable } from "@/components/ShotsTable"
import { ShotParameterCharts } from "@/components/shot-parameter-charts"
import { DeleteConfirmation } from "@/components/DeleteConfirmation"
import { EntityImageGallery } from "@/components/entity-image-gallery"
import { InputField, SelectField, TextareaField } from "@/components/FormField"
import { BeanInfoDiffModal, type BeanFormData } from "@/components/BeanInfoDiffModal"
import { toast } from "sonner"
import { RouteError } from "@/components/route-error"
import { DetailPending } from "@/components/route-pending"
import { ROAST_LEVELS, PROCESS_METHODS, type RoastLevel } from "@/lib/constants"
import type { ExtractedBeanInfo } from "@/lib/ai"

export const Route = createFileRoute("/beans/$beanId")({
  loader: async ({ params }) => {
    const beanId = Number(params.beanId)
    const [bean, shots, roasters, visionEnabled, researchEnabled] = await Promise.all([
      getBean({ data: beanId }),
      getShotsByBean({ data: beanId }),
      getRoasters(),
      checkVisionEnabled(),
      checkResearchEnabled(),
    ])
    return { bean, shots, roasters, visionEnabled: visionEnabled.enabled, researchEnabled: researchEnabled.enabled }
  },
  component: BeanDetailPage,
  pendingComponent: DetailPending,
  errorComponent: ({ error }) => (
    <RouteError error={error} backTo="/beans" backLabel="Back to beans" />
  ),
})

function formatRoastDate(value: string | Date | null | undefined) {
  if (!value) return ""

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""

  return date.toISOString().slice(0, 10)
}

function getInitialFormData(bean: NonNullable<ReturnType<typeof Route.useLoaderData>["bean"]>) {
  return {
    name: bean.name ?? "",
    roasterId: bean.roasterId ? String(bean.roasterId) : "",
    weight: bean.weight ?? "",
    price: bean.price ?? "",
    priceCurrency: bean.priceCurrency ?? "EUR",
    shopUrl: bean.shopUrl ?? "",
    origin: bean.origin ?? "",
    region: bean.region ?? "",
    farm: bean.farm ?? "",
    variety: bean.variety ?? "",
    process: bean.process ?? "",
    roastLevel: (bean.roastLevel ?? "") as RoastLevel | "",
    roastDate: formatRoastDate(bean.roastDate),
    notes: bean.notes ?? "",
  }
}

function BeanDetailPage() {
  const { bean, shots, roasters, visionEnabled, researchEnabled } = Route.useLoaderData()
  const navigate = useNavigate()
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isResearching, setIsResearching] = useState(false)
  const [isExtracting, setIsExtracting] = useState(false)
  const [diffModalOpen, setDiffModalOpen] = useState(false)
  const [suggestedData, setSuggestedData] = useState<ExtractedBeanInfo | null>(null)
  const [aiSource, setAiSource] = useState<"image" | "web">("web")

  const roasterOptions = roasters.map((r) => ({ value: String(r.id), label: r.name }))
  const currentRoaster = bean?.roasterRef ?? null

  const weightStats = useMemo(() => {
    if (!bean?.weight) return null
    const initialWeight = parseFloat(bean.weight)
    if (Number.isNaN(initialWeight) || initialWeight <= 0) return null

    const usedWeight = shots.reduce((sum, shot) => {
      const dose = shot.doseGrams ? parseFloat(shot.doseGrams) : 0
      return sum + dose
    }, 0)

    const remainingWeight = Math.max(0, initialWeight - usedWeight)
    const percentRemaining = Math.round((remainingWeight / initialWeight) * 100)

    return { initialWeight, usedWeight, remainingWeight, percentRemaining }
  }, [bean?.weight, shots])

  const [formData, setFormData] = useState(() =>
    bean
      ? getInitialFormData(bean)
      : {
          name: "",
          roasterId: "",
          weight: "",
          price: "",
          priceCurrency: "EUR",
          shopUrl: "",
          origin: "",
          region: "",
          farm: "",
          variety: "",
          process: "",
          roastLevel: "" as RoastLevel | "",
          roastDate: "",
          notes: "",
        }
  )

  useEffect(() => {
    if (!bean) return
    setFormData(getInitialFormData(bean))
  }, [bean])

  if (!bean) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold">Bean not found</h2>
        <Button asChild className="mt-4">
          <Link to="/beans">Back to beans</Link>
        </Button>
      </div>
    )
  }

  const handleDelete = async () => {
    await deleteBean({ data: bean.id })
    navigate({ to: "/beans" })
  }

  const handleToggleArchive = async () => {
    await updateBean({ data: { id: bean.id, isArchived: !bean.isArchived } })
    router.invalidate()
  }

  const handleCancelEdit = () => {
    setFormData(getInitialFormData(bean))
    setIsEditing(false)
  }

  const handleSave = async () => {
    if (!formData.name.trim()) return

    setIsSaving(true)

    try {
      await updateBean({
        data: {
          id: bean.id,
          name: formData.name,
          roasterId: formData.roasterId ? Number(formData.roasterId) : null,
          weight: formData.weight || null,
          price: formData.price || null,
          priceCurrency: formData.priceCurrency || null,
          shopUrl: formData.shopUrl || null,
          origin: formData.origin,
          region: formData.region,
          farm: formData.farm,
          variety: formData.variety,
          process: formData.process,
          roastLevel: formData.roastLevel || null,
          roastDate: formData.roastDate ? new Date(formData.roastDate) : null,
          notes: formData.notes,
        },
      })
      setIsEditing(false)
      await router.invalidate()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update bean"
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleResearchOnline = async () => {
    if (!formData.name.trim()) {
      toast.error("Enter a bean name first")
      return
    }

    setIsResearching(true)
    try {
      const roasterName = formData.roasterId
        ? roasters.find((r) => String(r.id) === formData.roasterId)?.name
        : undefined
      const result = await researchBeanInfo({
        data: { beanName: formData.name, roasterName },
      })

      if (Object.keys(result).length === 0) {
        toast.error("No information found")
        return
      }

      setSuggestedData(result)
      setAiSource("web")
      setDiffModalOpen(true)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Research failed"
      toast.error(message)
    } finally {
      setIsResearching(false)
    }
  }

  const handleExtractFromImage = async () => {
    if (!bean?.images.length) {
      toast.error("No images to extract from")
      return
    }

    const thumbnailImage = bean.images.find((img) => img.isThumbnail) || bean.images[0]
    const baseUrl = import.meta.env.VITE_STORAGE_URL || "/uploads"
    const imageUrl = `${baseUrl}/${thumbnailImage.storagePath}`

    setIsExtracting(true)
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          const dataUrl = reader.result as string
          resolve(dataUrl.split(",")[1])
        }
        reader.readAsDataURL(blob)
      })

      const result = await extractBeanInfo({
        data: { imageBase64: base64, mimeType: blob.type },
      })

      if (Object.keys(result).length === 0) {
        toast.error("Couldn't extract any information")
        return
      }

      setSuggestedData(result)
      setAiSource("image")
      setDiffModalOpen(true)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Extraction failed"
      toast.error(message)
    } finally {
      setIsExtracting(false)
    }
  }

  const handleApplyDiff = (updates: Partial<BeanFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }))
    toast.success(`Applied ${Object.keys(updates).length} changes`)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start gap-4">
        <Button variant="outline" size="icon" asChild className="shrink-0">
          <Link to="/beans">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
              {isEditing ? formData.name || bean.name : bean.name}
            </h1>
            {bean.isArchived && (
              <Badge variant="secondary">Archived</Badge>
            )}
          </div>
          {isEditing ? (
            formData.roasterId && roasters.find((r) => String(r.id) === formData.roasterId) && (
              <p className="mt-1 text-sm text-muted-foreground">
                by{" "}
                <span className="font-bold text-primary">
                  {roasters.find((r) => String(r.id) === formData.roasterId)?.name}
                </span>
              </p>
            )
          ) : currentRoaster ? (
            <p className="mt-1 text-sm text-muted-foreground">
              by{" "}
              <Link
                to="/roasters/$roasterId"
                params={{ roasterId: String(currentRoaster.id) }}
                className="font-bold text-primary hover:underline"
              >
                {currentRoaster.name}
              </Link>
            </p>
          ) : bean.roaster ? (
            <p className="mt-1 text-sm text-muted-foreground">
              by <span className="font-bold text-primary">{bean.roaster}</span>
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleToggleArchive}>
            {bean.isArchived ? (
              <>
                <ArchiveRestore className="h-4 w-4" />
                Unarchive
              </>
            ) : (
              <>
                <Archive className="h-4 w-4" />
                Archive
              </>
            )}
          </Button>
          {isEditing ? (
            <>
              <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isSaving || !formData.name.trim()}>
                {isSaving ? "Saving…" : "Save"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
              <Button size="sm" asChild>
                <Link to="/shots/new" search={{ beanId: bean.id }}>
                  <Plus className="h-4 w-4" />
                  Log a shot
                </Link>
              </Button>
            </>
          )}
          <DeleteConfirmation
            title="Delete this bean?"
            description="This will also remove it from any shot records. This action cannot be undone."
            onConfirm={handleDelete}
            trigger={
              <Button variant="ghost" size="icon-sm" aria-label="Delete bean">
                <Trash2 className="h-4 w-4" />
              </Button>
            }
          />
        </div>
      </div>

      {isEditing ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          <div className="space-y-6">
           <Card>
             <CardHeader>
               <CardTitle>Basic Info</CardTitle>
             </CardHeader>
             <CardContent className="space-y-4">
               <div className="grid gap-4 sm:grid-cols-2">
                 <InputField
                   id="name"
                   label="Name"
                   placeholder="e.g., Ethiopia Yirgacheffe"
                   value={formData.name}
                   onChange={(value) =>
                     setFormData({ ...formData, name: value })
                   }
                   required
                 />

                 <SelectField
                    id="roasterId"
                    label="Roaster"
                    placeholder="Select roaster"
                    value={formData.roasterId}
                    onChange={(value) =>
                      setFormData({ ...formData, roasterId: value ?? "" })
                    }
                    options={roasterOptions}
                  />

                 <InputField
                   id="weight"
                   label="Bag Weight (g)"
                   type="number"
                   placeholder="e.g., 250"
                   value={formData.weight}
                   onChange={(value) =>
                     setFormData({ ...formData, weight: value })
                   }
                 />
                 <div className="flex gap-2">
                   <div className="flex-1">
                     <InputField
                       id="price"
                       label="Price"
                       type="number"
                       step="0.01"
                       placeholder="e.g., 15.00"
                       value={formData.price}
                       onChange={(value) =>
                         setFormData({ ...formData, price: value })
                       }
                     />
                   </div>
                   <div className="w-24">
                     <InputField
                       id="priceCurrency"
                       label="Currency"
                       placeholder="EUR"
                       value={formData.priceCurrency}
                       onChange={(value) =>
                         setFormData({ ...formData, priceCurrency: value })
                       }
                     />
                   </div>
                 </div>
                 <InputField
                   id="shopUrl"
                   label="Shop URL"
                   type="url"
                   placeholder="https://..."
                   value={formData.shopUrl}
                   onChange={(value) =>
                     setFormData({ ...formData, shopUrl: value })
                   }
                 />
               </div>
             </CardContent>
           </Card>

           <Card>
             <CardHeader>
               <CardTitle>Origin</CardTitle>
             </CardHeader>
             <CardContent className="space-y-4">
               <div className="grid gap-4 sm:grid-cols-2">
                 <InputField
                   id="origin"
                   label="Country"
                   placeholder="e.g., Ethiopia"
                   value={formData.origin}
                   onChange={(value) =>
                     setFormData({ ...formData, origin: value })
                   }
                 />

                 <InputField
                   id="region"
                   label="Region"
                   placeholder="e.g., Yirgacheffe"
                   value={formData.region}
                   onChange={(value) =>
                     setFormData({ ...formData, region: value })
                   }
                 />

                 <InputField
                   id="farm"
                   label="Farm/Producer"
                   placeholder="e.g., Konga Cooperative"
                   value={formData.farm}
                   onChange={(value) =>
                     setFormData({ ...formData, farm: value })
                   }
                 />

                 <InputField
                   id="variety"
                   label="Variety"
                   placeholder="e.g., Heirloom"
                   value={formData.variety}
                   onChange={(value) =>
                     setFormData({ ...formData, variety: value })
                   }
                 />
               </div>
             </CardContent>
           </Card>

           <Card>
             <CardHeader>
               <CardTitle>Processing</CardTitle>
             </CardHeader>
             <CardContent className="space-y-4">
               <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                 <SelectField
                   id="process"
                   label="Process"
                   placeholder="Select process"
                   value={formData.process}
                   onChange={(value) =>
                     setFormData({ ...formData, process: value ?? "" })
                   }
                   options={PROCESS_METHODS}
                 />

                 <SelectField
                   id="roastLevel"
                   label="Roast Level"
                   placeholder="Select level"
                   value={formData.roastLevel}
                   onChange={(value) =>
                     setFormData({
                       ...formData,
                       roastLevel: (value ?? "") as RoastLevel | "",
                     })
                   }
                   options={ROAST_LEVELS}
                 />

                 <InputField
                   id="roastDate"
                   label="Roast Date"
                   type="date"
                   value={formData.roastDate}
                   onChange={(value) =>
                     setFormData({ ...formData, roastDate: value })
                   }
                 />
               </div>
             </CardContent>
           </Card>

            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <TextareaField
                  id="notes"
                  label=""
                  placeholder="Tasting notes, brewing tips, or other observations"
                  value={formData.notes}
                  onChange={(value) =>
                    setFormData({ ...formData, notes: value })
                  }
                  rows={4}
                />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {bean.images.length > 0 && (
              <EntityImageGallery
                entityType="beans"
                entityId={bean.id}
                images={bean.images}
                baseUrl={import.meta.env.VITE_STORAGE_URL || "/uploads"}
                onImagesChange={() => router.invalidate()}
              />
            )}

            {(visionEnabled || researchEnabled) && (
              <Card>
                <CardHeader>
                  <CardTitle>AI Tools</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-2">
                    {visionEnabled && bean.images.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExtractFromImage}
                        disabled={isExtracting || isResearching}
                        className="w-full justify-start"
                      >
                        {isExtracting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <ImageIcon className="h-4 w-4" />
                        )}
                        Fill from image
                      </Button>
                    )}
                    {researchEnabled && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleResearchOnline}
                        disabled={isResearching || isExtracting || !formData.name.trim()}
                        className="w-full justify-start"
                      >
                        {isResearching ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Search className="h-4 w-4" />
                        )}
                        Research online
                      </Button>
                    )}
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Use AI to find or extract bean information. Review suggestions before applying.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          <div className="space-y-6">
          {weightStats && (
            <Card>
              <CardHeader>
                <CardTitle>Remaining Weight</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Progress value={weightStats.percentRemaining}>
                  <ProgressLabel>
                    {weightStats.remainingWeight.toFixed(0)}g remaining
                  </ProgressLabel>
                  <ProgressValue>
                    {(formattedValue) =>
                      `${formattedValue ?? `${weightStats.percentRemaining}`}% of ${weightStats.initialWeight.toFixed(0)}g`
                    }
                  </ProgressValue>
                </Progress>
                <p className="text-sm text-muted-foreground">
                  {weightStats.usedWeight.toFixed(1)}g used across {shots.length} shot{shots.length !== 1 ? "s" : ""}
                </p>
              </CardContent>
            </Card>
          )}

          {(bean.price || bean.shopUrl) && (
            <Card>
              <CardHeader>
                <CardTitle>Purchase Info</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {bean.price && (
                    <div>
                      <p className="text-sm text-muted-foreground">Price</p>
                      <p className="font-medium">
                        {bean.price} {bean.priceCurrency || "EUR"}
                      </p>
                    </div>
                  )}
                  {bean.shopUrl && (
                    <div>
                      <p className="text-sm text-muted-foreground">Shop</p>
                      <a
                        href={bean.shopUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-primary hover:underline"
                      >
                        Visit shop →
                      </a>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Origin</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Country</p>
                  <p className="font-medium">{bean.origin || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Region</p>
                  <p className="font-medium">{bean.region || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Farm/Producer</p>
                  <p className="font-medium">{bean.farm || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Variety</p>
                  <p className="font-medium">{bean.variety || "-"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Processing</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Process</p>
                  <p className="font-medium">{bean.process || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Roast Level</p>
                  <p className="font-medium capitalize">
                    {bean.roastLevel?.replace("_", " ") || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Roast Date</p>
                  <p className="font-medium">
                    {bean.roastDate
                      ? new Date(bean.roastDate).toLocaleDateString()
                      : "-"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {bean.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{bean.notes}</p>
              </CardContent>
            </Card>
          )}
          </div>

          {bean.images.length > 0 && (
            <div className="space-y-6">
              <EntityImageGallery
                entityType="beans"
                entityId={bean.id}
                images={bean.images}
                baseUrl={import.meta.env.VITE_STORAGE_URL || "/uploads"}
                onImagesChange={() => router.invalidate()}
                readOnly
              />
            </div>
          )}
        </div>
      )}

      <ShotParameterCharts shots={shots} />

      <Card>
        <CardHeader>
          <CardTitle>Shot History</CardTitle>
        </CardHeader>
        <CardContent>
          <ShotsTable shots={shots} hideBean />
        </CardContent>
      </Card>

      {suggestedData && (
        <BeanInfoDiffModal
          open={diffModalOpen}
          onOpenChange={setDiffModalOpen}
          currentData={formData}
          suggestedData={suggestedData}
          onApply={handleApplyDiff}
          source={aiSource}
        />
      )}
    </div>
  )
}
