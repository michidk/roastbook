import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router"
import { useState } from "react"
import { ArrowLeft, Trash2, Archive, ArchiveRestore, ExternalLink, Pencil } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { InputField, SelectField, TextareaField } from "@/components/form/form-field"
import { getGearById, deleteGear, updateGear } from "@/lib/server/gear"
import { getShotsByGear } from "@/lib/server/shots"
import { ShotsTable } from "@/components/ShotsTable"
import { EntityImageGallery } from "@/components/entity-image-gallery"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/dialog"
import { RouteError } from "@/components/route-error"
import { DetailPending } from "@/components/route-pending"
import { GEAR_TYPES, GEAR_TYPE_LABELS, type GearType } from "@/lib/constants"
import { FormSection } from "@/components/form/form-shell"
import {
  EMPTY_GEAR_SUBTYPE_VALUES,
  GearSubtypeFields,
} from "@/components/gear/gear-subtype-fields"

export const Route = createFileRoute("/gear/$gearId")({
  loader: async ({ params }) => {
    const gearId = Number(params.gearId)
    const [gear, shots] = await Promise.all([
      getGearById({ data: gearId }),
      getShotsByGear({ data: gearId }),
    ])
    return { gear, shots }
  },
  component: GearDetailPage,
  pendingComponent: DetailPending,
  errorComponent: ({ error }) => (
    <RouteError error={error} backTo="/gear" backLabel="Back to gear" />
  ),
})

function formatDateForInput(date: Date | string | null | undefined) {
  if (!date) return ""

  const parsedDate = new Date(date)

  if (Number.isNaN(parsedDate.getTime())) {
    return ""
  }

  return parsedDate.toISOString().split("T")[0]
}

function GearDetailPage() {
  const { gear, shots } = Route.useLoaderData()
  const navigate = useNavigate()
  const router = useRouter()

  const createFormData = () => ({
    name: gear?.name ?? "",
    brand: gear?.brand ?? "",
    model: gear?.model ?? "",
    type: (gear?.type ?? "") as GearType | "",
    purchaseDate: formatDateForInput(gear?.purchaseDate),
    purchasePrice: gear?.purchasePrice ?? "",
    priceCurrency: gear?.priceCurrency ?? "EUR",
    manualUrl: gear?.manualUrl ?? "",
    productUrl: gear?.productUrl ?? "",
    notes: gear?.notes ?? "",
    ...EMPTY_GEAR_SUBTYPE_VALUES,
    brewPressureOpvBar: gear?.machineSettings?.brewPressureOpvBar ?? "",
    supportsPreinfusion: gear?.machineSettings?.supportsPreinfusion === null || gear?.machineSettings?.supportsPreinfusion === undefined ? "" : String(gear.machineSettings.supportsPreinfusion),
    defaultPreinfusionEnabled: gear?.machineSettings?.defaultPreinfusionEnabled === null || gear?.machineSettings?.defaultPreinfusionEnabled === undefined ? "" : String(gear.machineSettings.defaultPreinfusionEnabled),
    defaultPreinfusionTimeSeconds: gear?.machineSettings?.defaultPreinfusionTimeSeconds ?? "",
    defaultPreinfusionPressureBar: gear?.machineSettings?.defaultPreinfusionPressureBar ?? "",
    defaultFlowLimitMlPerSecond: gear?.machineSettings?.defaultFlowLimitMlPerSecond ?? "",
    temperatureOffsetCelsius: gear?.machineSettings?.temperatureOffsetCelsius ?? "",
    volumetricShotVolumeMl: gear?.machineSettings?.volumetricShotVolumeMl ?? "",
    autoStopMode: gear?.machineSettings?.autoStopMode ?? "",
    steamTemperatureCelsius: gear?.machineSettings?.steamTemperatureCelsius ?? "",
    steamPressureBar: gear?.machineSettings?.steamPressureBar ?? "",
    nominalDoseGrams: gear?.basketDetails?.nominalDoseGrams ?? "",
  })

  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState(createFormData)

  if (!gear) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold">Gear not found</h2>
        <Button asChild className="mt-4">
          <Link to="/gear">Back to gear</Link>
        </Button>
      </div>
    )
  }

  const handleDelete = async () => {
    await deleteGear({ data: gear.id })
    navigate({ to: "/gear" })
  }

  const handleToggleArchive = async () => {
    await updateGear({ data: { id: gear.id, isArchived: !gear.isArchived } })
    router.invalidate()
  }

  const handleEditStart = () => {
    setFormData(createFormData())
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setFormData(createFormData())
    setIsEditing(false)
  }

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!formData.name.trim() || !formData.type) {
      return
    }

    setIsSaving(true)

    try {
      await updateGear({
        data: {
          id: gear.id,
          name: formData.name.trim(),
          brand: formData.brand.trim(),
          model: formData.model.trim(),
          type: formData.type,
          purchaseDate: formData.purchaseDate
            ? new Date(formData.purchaseDate)
            : null,
          purchasePrice: formData.purchasePrice.trim()
            ? formData.purchasePrice.trim()
            : null,
          priceCurrency: formData.priceCurrency.trim()
            ? formData.priceCurrency.trim()
            : null,
          manualUrl: formData.manualUrl.trim()
            ? formData.manualUrl.trim()
            : null,
          productUrl: formData.productUrl.trim()
            ? formData.productUrl.trim()
            : null,
          notes: formData.notes,
          machineSettings: formData.type === "espresso_machine" ? {
            brewPressureOpvBar: formData.brewPressureOpvBar || null,
            supportsPreinfusion: formData.supportsPreinfusion === "" ? null : formData.supportsPreinfusion === "true",
            defaultPreinfusionEnabled: formData.defaultPreinfusionEnabled === "" ? null : formData.defaultPreinfusionEnabled === "true",
            defaultPreinfusionTimeSeconds: formData.defaultPreinfusionTimeSeconds || null,
            defaultPreinfusionPressureBar: formData.defaultPreinfusionPressureBar || null,
            defaultFlowLimitMlPerSecond: formData.defaultFlowLimitMlPerSecond || null,
            temperatureOffsetCelsius: formData.temperatureOffsetCelsius || null,
            volumetricShotVolumeMl: formData.volumetricShotVolumeMl || null,
            autoStopMode: formData.autoStopMode === "manual" || formData.autoStopMode === "weight" || formData.autoStopMode === "time" || formData.autoStopMode === "volume" ? formData.autoStopMode : null,
            steamTemperatureCelsius: formData.steamTemperatureCelsius || null,
            steamPressureBar: formData.steamPressureBar || null,
          } : null,
          basketDetails: formData.type === "basket" ? { nominalDoseGrams: formData.nominalDoseGrams || null } : null,
        },
      })

      setIsEditing(false)
      await router.invalidate()
    } catch {
      toast.error("Could not save this gear")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/gear" aria-label="Back to gear">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="min-w-0 break-words text-2xl font-bold">{gear.name}</h1>
              {gear.isArchived && (
                <Badge variant="secondary">Archived</Badge>
              )}
            </div>
            <Badge variant="outline">{GEAR_TYPE_LABELS[gear.type]}</Badge>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:ml-auto sm:justify-end">
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={handleToggleArchive}
          >
            {gear.isArchived ? (
              <>
                <ArchiveRestore className="h-4 w-4 mr-2" />
                Unarchive
              </>
            ) : (
              <>
                <Archive className="h-4 w-4 mr-2" />
                Archive
              </>
            )}
          </Button>
          {isEditing ? (
            <>
              <Button
                variant="outline"
                type="button"
                onClick={handleCancelEdit}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="gear-edit-form"
                disabled={isSaving || !formData.name.trim() || !formData.type}
              >
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" type="button" onClick={handleEditStart}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Delete gear"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this gear?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will remove it from your shot records. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </div>

      {gear.images.length > 0 && !isEditing && (
        <EntityImageGallery
          entityType="gear"
          entityId={gear.id}
          images={gear.images}
          
          onImagesChange={() => router.invalidate()}
        />
      )}

      {isEditing ? (
        <form id="gear-edit-form" onSubmit={handleSave} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Equipment Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <InputField
                  id="name"
                  label="Name"
                  placeholder="e.g., My Grinder"
                  value={formData.name}
                  onChange={(value) => setFormData({ ...formData, name: value })}
                  required
                />
                <SelectField
                  id="type"
                  label="Type"
                  placeholder="Select type"
                  value={formData.type}
                  onChange={(value) => setFormData({ ...formData, type: (value ?? "") as GearType | "" })}
                  options={GEAR_TYPES}
                  required
                />
                <InputField
                  id="brand"
                  label="Brand"
                  placeholder="e.g., Niche"
                  value={formData.brand}
                  onChange={(value) => setFormData({ ...formData, brand: value })}
                />
                <InputField
                  id="model"
                  label="Model"
                  placeholder="e.g., Zero"
                  value={formData.model}
                  onChange={(value) => setFormData({ ...formData, model: value })}
                />
              </div>
              <TextareaField
                id="notes"
                label="Notes"
                placeholder="Any additional info about this equipment"
                value={formData.notes}
                onChange={(value) => setFormData({ ...formData, notes: value })}
                rows={3}
              />
            </CardContent>
          </Card>
          <GearSubtypeFields
            type={formData.type}
            values={formData}
            onChange={(key, value) => setFormData((current) => ({ ...current, [key]: value }))}
          />

          <Card>
            <CardHeader>
              <CardTitle>Purchase Info</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                <InputField
                  id="purchaseDate"
                  label="Purchase Date"
                  type="date"
                  value={formData.purchaseDate}
                  onChange={(value) => setFormData({ ...formData, purchaseDate: value })}
                />
                <InputField
                  id="purchasePrice"
                  label="Price"
                  type="number"
                  placeholder="e.g., 599.00"
                  value={formData.purchasePrice}
                  onChange={(value) => setFormData({ ...formData, purchasePrice: value })}
                  step="0.01"
                  min="0"
                />
                <InputField
                  id="priceCurrency"
                  label="Currency"
                  placeholder="EUR"
                  value={formData.priceCurrency}
                  onChange={(value) => setFormData({ ...formData, priceCurrency: value })}
                />
              </div>
            </CardContent>
          </Card>

          {gear.machineSettings ? (
            <Card>
              <CardHeader><CardTitle>Machine settings</CardTitle></CardHeader>
              <CardContent><dl className="grid gap-4 sm:grid-cols-2">
                {[
                  ["Brew pressure / OPV", gear.machineSettings.brewPressureOpvBar ? `${gear.machineSettings.brewPressureOpvBar} bar` : "Not set"],
                  ["Supports pre-infusion", gear.machineSettings.supportsPreinfusion === null ? "Unknown" : gear.machineSettings.supportsPreinfusion ? "Yes" : "No"],
                  ["Default pre-infusion", gear.machineSettings.defaultPreinfusionEnabled === null ? "Unknown" : gear.machineSettings.defaultPreinfusionEnabled ? "Enabled" : "Disabled"],
                  ["Auto-stop", gear.machineSettings.autoStopMode ?? "Not set"],
                  ["Default flow limit", gear.machineSettings.defaultFlowLimitMlPerSecond ? `${gear.machineSettings.defaultFlowLimitMlPerSecond} mL/s` : "Not set"],
                  ["Volumetric shot", gear.machineSettings.volumetricShotVolumeMl ? `${gear.machineSettings.volumetricShotVolumeMl} mL` : "Not set"],
                ].map(([label, value]) => <div key={label}><dt className="text-sm text-muted-foreground">{label}</dt><dd className="font-medium">{value}</dd></div>)}
              </dl></CardContent>
            </Card>
          ) : null}
          {gear.basketDetails ? (
            <Card><CardHeader><CardTitle>Basket details</CardTitle></CardHeader><CardContent><p><span className="text-sm text-muted-foreground">Nominal dose</span><br /><strong>{gear.basketDetails.nominalDoseGrams ? `${gear.basketDetails.nominalDoseGrams} g` : "Not set"}</strong></p></CardContent></Card>
          ) : null}

          <FormSection title="Links">
              <InputField
                id="productUrl"
                label="Product Page"
                type="url"
                placeholder="https://..."
                value={formData.productUrl}
                onChange={(value) => setFormData({ ...formData, productUrl: value })}
              />
              <InputField
                id="manualUrl"
                label="Manual / Documentation"
                type="url"
                placeholder="https://..."
                value={formData.manualUrl}
                onChange={(value) => setFormData({ ...formData, manualUrl: value })}
              />
          </FormSection>
        </form>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Brand</p>
                  <p className="font-medium">{gear.brand || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Model</p>
                  <p className="font-medium">{gear.model || "-"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {(gear.purchaseDate || gear.purchasePrice) && (
            <Card>
              <CardHeader>
                <CardTitle>Purchase Info</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {gear.purchaseDate && (
                    <div>
                      <p className="text-sm text-muted-foreground">Purchase Date</p>
                      <p className="font-medium">
                        {new Date(gear.purchaseDate).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  {gear.purchasePrice && (
                    <div>
                      <p className="text-sm text-muted-foreground">Price</p>
                      <p className="font-medium">
                        {gear.purchasePrice} {gear.priceCurrency || "EUR"}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {(gear.productUrl || gear.manualUrl) && (
            <Card>
              <CardHeader>
                <CardTitle>Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {gear.productUrl && (
                  <a
                    href={gear.productUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-h-11 items-center gap-2 rounded text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Product Page
                  </a>
                )}
                {gear.manualUrl && (
                  <a
                    href={gear.manualUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-h-11 items-center gap-2 rounded text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Manual / Documentation
                  </a>
                )}
              </CardContent>
            </Card>
          )}

          {gear.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{gear.notes}</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Shot History</CardTitle>
            </CardHeader>
            <CardContent>
              <ShotsTable shots={shots} hideGear />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
