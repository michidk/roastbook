import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router"
import { useState, type Dispatch, type FormEvent, type SetStateAction } from "react"
import { Archive, ArchiveRestore, ArrowLeft, ExternalLink, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { InputField, SelectField, TextareaField } from "@/components/form/form-field"
import { FormSection } from "@/components/form/form-shell"
import { getGearById, deleteGear, updateGear } from "@/lib/server/gear"
import { getShotsByGear } from "@/lib/server/shots"
import { ShotsTable } from "@/components/ShotsTable"
import { EntityImageGallery } from "@/components/entity-image-gallery"
import { DeleteConfirmation } from "@/components/DeleteConfirmation"
import { RouteError } from "@/components/route-error"
import { DetailPending } from "@/components/route-pending"
import { GEAR_TYPES, GEAR_TYPE_LABELS, type GearType } from "@/lib/constants"
import { EMPTY_GEAR_SUBTYPE_VALUES, GearSubtypeFields } from "@/components/gear/gear-subtype-fields"

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
  errorComponent: ({ error }) => <RouteError error={error} backTo="/gear" backLabel="Back to gear" />,
})

type Gear = NonNullable<Awaited<ReturnType<typeof getGearById>>>

function formatDateForInput(date: Date | string | null | undefined) {
  if (!date) return ""
  const parsedDate = new Date(date)
  return Number.isNaN(parsedDate.getTime()) ? "" : parsedDate.toISOString().split("T")[0]
}

function createGearFormData(gear?: Gear | null) {
  return {
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
    supportsPreinfusion: gear?.machineSettings?.supportsPreinfusion == null ? "" : String(gear.machineSettings.supportsPreinfusion),
    defaultPreinfusionEnabled: gear?.machineSettings?.defaultPreinfusionEnabled == null ? "" : String(gear.machineSettings.defaultPreinfusionEnabled),
    defaultPreinfusionTimeSeconds: gear?.machineSettings?.defaultPreinfusionTimeSeconds ?? "",
    defaultPreinfusionPressureBar: gear?.machineSettings?.defaultPreinfusionPressureBar ?? "",
    defaultFlowLimitMlPerSecond: gear?.machineSettings?.defaultFlowLimitMlPerSecond ?? "",
    temperatureOffsetCelsius: gear?.machineSettings?.temperatureOffsetCelsius ?? "",
    volumetricShotVolumeMl: gear?.machineSettings?.volumetricShotVolumeMl ?? "",
    autoStopMode: gear?.machineSettings?.autoStopMode ?? "",
    steamTemperatureCelsius: gear?.machineSettings?.steamTemperatureCelsius ?? "",
    steamPressureBar: gear?.machineSettings?.steamPressureBar ?? "",
    nominalDoseGrams: gear?.basketDetails?.nominalDoseGrams ?? "",
  }
}

type GearFormData = ReturnType<typeof createGearFormData>

function GearDetailPage() {
  const { gear, shots } = Route.useLoaderData()
  const navigate = useNavigate()
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState(() => createGearFormData(gear))

  if (!gear) {
    return <div className="py-12 text-center"><h2 className="text-xl font-semibold">Gear not found</h2><Button asChild className="mt-4"><Link to="/gear">Back to gear</Link></Button></div>
  }

  const resetForm = () => setFormData(createGearFormData(gear))
  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!formData.name.trim() || !formData.type) return
    setIsSaving(true)
    try {
      const validAutoStopModes = ["manual", "weight", "time", "volume"] as const
      const autoStopMode = validAutoStopModes.find((mode) => mode === formData.autoStopMode) ?? null
      await updateGear({ data: {
        id: gear.id,
        name: formData.name.trim(),
        brand: formData.brand.trim(),
        model: formData.model.trim(),
        type: formData.type,
        purchaseDate: formData.purchaseDate ? new Date(formData.purchaseDate) : null,
        purchasePrice: formData.purchasePrice.trim() || null,
        priceCurrency: formData.priceCurrency.trim() || null,
        manualUrl: formData.manualUrl.trim() || null,
        productUrl: formData.productUrl.trim() || null,
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
          autoStopMode,
          steamTemperatureCelsius: formData.steamTemperatureCelsius || null,
          steamPressureBar: formData.steamPressureBar || null,
        } : null,
        basketDetails: formData.type === "basket" ? { nominalDoseGrams: formData.nominalDoseGrams || null } : null,
      } })
      setIsEditing(false)
      await router.invalidate()
    } catch {
      toast.error("Could not save this gear")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <GearDetailHeader
        gear={gear}
        formData={formData}
        isEditing={isEditing}
        isSaving={isSaving}
        onToggleArchive={async () => { await updateGear({ data: { id: gear.id, isArchived: !gear.isArchived } }); await router.invalidate() }}
        onStartEdit={() => { resetForm(); setIsEditing(true) }}
        onCancel={() => { resetForm(); setIsEditing(false) }}
        onDelete={async () => { await deleteGear({ data: gear.id }); await navigate({ to: "/gear" }) }}
      />
      {gear.images.length > 0 && !isEditing && <EntityImageGallery entityType="gear" entityId={gear.id} images={gear.images} onImagesChange={() => router.invalidate()} />}
      {isEditing ? (
        <GearEditForm gear={gear} formData={formData} setFormData={setFormData} onSubmit={handleSave} />
      ) : (
        <GearReadOnlyContent gear={gear} shots={shots} />
      )}
    </div>
  )
}

function GearDetailHeader({ gear, formData, isEditing, isSaving, onToggleArchive, onStartEdit, onCancel, onDelete }: {
  gear: Gear
  formData: GearFormData
  isEditing: boolean
  isSaving: boolean
  onToggleArchive: () => void
  onStartEdit: () => void
  onCancel: () => void
  onDelete: () => void
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 items-center gap-3">
        <Button variant="ghost" size="icon" asChild><Link to="/gear" aria-label="Back to gear"><ArrowLeft /></Link></Button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><h1 className="min-w-0 break-words text-2xl font-bold">{gear.name}</h1>{gear.isArchived && <Badge variant="secondary">Archived</Badge>}</div>
          <Badge variant="outline">{GEAR_TYPE_LABELS[gear.type]}</Badge>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:ml-auto sm:justify-end">
        <Button variant="outline" size="sm" type="button" onClick={onToggleArchive}>
          {gear.isArchived ? <><ArchiveRestore />Unarchive</> : <><Archive />Archive</>}
        </Button>
        {isEditing ? (
          <><Button variant="outline" type="button" onClick={onCancel} disabled={isSaving}>Cancel</Button><Button type="submit" form="gear-edit-form" disabled={isSaving || !formData.name.trim() || !formData.type}>{isSaving ? "Saving..." : "Save"}</Button></>
        ) : (
          <><Button variant="outline" size="sm" type="button" onClick={onStartEdit}><Pencil />Edit</Button><DeleteConfirmation title="Delete this gear?" description="This will remove it from your shot records. This action cannot be undone." onConfirm={onDelete} trigger={<Button variant="ghost" size="icon" type="button" className="text-destructive hover:bg-destructive/10 hover:text-destructive" aria-label="Delete gear"><Trash2 /></Button>} /></>
        )}
      </div>
    </div>
  )
}

function GearEditForm({ gear, formData, setFormData, onSubmit }: {
  gear: Gear
  formData: GearFormData
  setFormData: Dispatch<SetStateAction<GearFormData>>
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  const set = <Key extends keyof GearFormData>(key: Key, value: GearFormData[Key]) => setFormData((current) => ({ ...current, [key]: value }))
  return (
    <form id="gear-edit-form" onSubmit={onSubmit} className="space-y-6">
      <Card><CardHeader><CardTitle>Equipment Info</CardTitle></CardHeader><CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <InputField id="name" label="Name" placeholder="e.g., My Grinder" value={formData.name} onChange={(value) => set("name", value)} required />
          <SelectField id="type" label="Type" placeholder="Select type" value={formData.type} onChange={(value) => set("type", (value ?? "") as GearType | "")} options={GEAR_TYPES} required />
          <InputField id="brand" label="Brand" placeholder="e.g., Niche" value={formData.brand} onChange={(value) => set("brand", value)} />
          <InputField id="model" label="Model" placeholder="e.g., Zero" value={formData.model} onChange={(value) => set("model", value)} />
        </div>
        <TextareaField id="notes" label="Notes" placeholder="Any additional info about this equipment" value={formData.notes} onChange={(value) => set("notes", value)} rows={3} />
      </CardContent></Card>
      <GearSubtypeFields type={formData.type} values={formData} onChange={set} />
      <Card><CardHeader><CardTitle>Purchase Info</CardTitle></CardHeader><CardContent><div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        <InputField id="purchaseDate" label="Purchase Date" type="date" value={formData.purchaseDate} onChange={(value) => set("purchaseDate", value)} />
        <InputField id="purchasePrice" label="Price" type="number" placeholder="e.g., 599.00" value={formData.purchasePrice} onChange={(value) => set("purchasePrice", value)} step="0.01" min="0" />
        <InputField id="priceCurrency" label="Currency" placeholder="EUR" value={formData.priceCurrency} onChange={(value) => set("priceCurrency", value)} />
      </div></CardContent></Card>
      {gear.machineSettings && <MachineSettingsCard gear={gear} />}
      {gear.basketDetails && <Card><CardHeader><CardTitle>Basket details</CardTitle></CardHeader><CardContent><p><span className="text-sm text-muted-foreground">Nominal dose</span><br /><strong>{gear.basketDetails.nominalDoseGrams ? `${gear.basketDetails.nominalDoseGrams} g` : "Not set"}</strong></p></CardContent></Card>}
      <FormSection title="Links">
        <InputField id="productUrl" label="Product Page" type="url" placeholder="https://..." value={formData.productUrl} onChange={(value) => set("productUrl", value)} />
        <InputField id="manualUrl" label="Manual / Documentation" type="url" placeholder="https://..." value={formData.manualUrl} onChange={(value) => set("manualUrl", value)} />
      </FormSection>
    </form>
  )
}

function MachineSettingsCard({ gear }: { gear: Gear }) {
  if (!gear.machineSettings) return null
  const settings = gear.machineSettings
  const rows = [
    ["Brew pressure / OPV", settings.brewPressureOpvBar ? `${settings.brewPressureOpvBar} bar` : "Not set"],
    ["Supports pre-infusion", settings.supportsPreinfusion === null ? "Unknown" : settings.supportsPreinfusion ? "Yes" : "No"],
    ["Default pre-infusion", settings.defaultPreinfusionEnabled === null ? "Unknown" : settings.defaultPreinfusionEnabled ? "Enabled" : "Disabled"],
    ["Auto-stop", settings.autoStopMode ?? "Not set"],
    ["Default flow limit", settings.defaultFlowLimitMlPerSecond ? `${settings.defaultFlowLimitMlPerSecond} mL/s` : "Not set"],
    ["Volumetric shot", settings.volumetricShotVolumeMl ? `${settings.volumetricShotVolumeMl} mL` : "Not set"],
  ]
  return <Card><CardHeader><CardTitle>Machine settings</CardTitle></CardHeader><CardContent><dl className="grid gap-4 sm:grid-cols-2">{rows.map(([label, value]) => <div key={label}><dt className="text-sm text-muted-foreground">{label}</dt><dd className="font-medium">{value}</dd></div>)}</dl></CardContent></Card>
}

function GearReadOnlyContent({ gear, shots }: { gear: Gear; shots: Awaited<ReturnType<typeof getShotsByGear>> }) {
  return <>
    <Card><CardHeader><CardTitle>Details</CardTitle></CardHeader><CardContent className="grid grid-cols-2 gap-4"><div><p className="text-sm text-muted-foreground">Brand</p><p className="font-medium">{gear.brand || "-"}</p></div><div><p className="text-sm text-muted-foreground">Model</p><p className="font-medium">{gear.model || "-"}</p></div></CardContent></Card>
    {(gear.purchaseDate || gear.purchasePrice) && <Card><CardHeader><CardTitle>Purchase Info</CardTitle></CardHeader><CardContent className="grid grid-cols-2 gap-4">{gear.purchaseDate && <div><p className="text-sm text-muted-foreground">Purchase Date</p><p className="font-medium">{new Date(gear.purchaseDate).toLocaleDateString()}</p></div>}{gear.purchasePrice && <div><p className="text-sm text-muted-foreground">Price</p><p className="font-medium">{gear.purchasePrice} {gear.priceCurrency || "EUR"}</p></div>}</CardContent></Card>}
    {(gear.productUrl || gear.manualUrl) && <Card><CardHeader><CardTitle>Links</CardTitle></CardHeader><CardContent className="space-y-2">{[[gear.productUrl, "Product Page"], [gear.manualUrl, "Manual / Documentation"]].map(([url, label]) => url && <a key={label} href={url} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center gap-2 rounded text-sm text-primary hover:underline"><ExternalLink />{label}</a>)}</CardContent></Card>}
    {gear.notes && <Card><CardHeader><CardTitle>Notes</CardTitle></CardHeader><CardContent><p className="whitespace-pre-wrap">{gear.notes}</p></CardContent></Card>}
    <Card><CardHeader><CardTitle>Shot History</CardTitle></CardHeader><CardContent><ShotsTable shots={shots} /></CardContent></Card>
  </>
}
