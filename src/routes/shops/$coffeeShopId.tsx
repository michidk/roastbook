import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router"
import { useEffect, useState, type Dispatch, type SetStateAction } from "react"
import { ArrowLeft, ExternalLink, Heart, MapPinned, Pencil, Plus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { InputField, TextareaField } from "@/components/form/form-field"
import { FormSection } from "@/components/form/form-shell"
import { StarRating } from "@/components/ui/star-rating"
import { CoffeeShopMap } from "@/components/coffee-shops/coffee-shop-map"
import { CoffeeShopOsmSearch, type CoffeeShopSearchResult } from "@/components/coffee-shops/coffee-shop-osm-search"
import { getCoffeeShop, deleteCoffeeShop, updateCoffeeShop } from "@/lib/server/coffee-shops"
import { toNullableRating, toRatingInput } from "@/lib/rating"
import { DeleteConfirmation } from "@/components/DeleteConfirmation"
import { RouteError } from "@/components/route-error"
import { DetailPending } from "@/components/route-pending"
import { applyCoffeeShopSearchResult, createCoffeeShopFormValues } from "@/components/coffee-shops/coffee-shop-form-values"

export const Route = createFileRoute("/shops/$coffeeShopId")({
  loader: ({ params }) => getCoffeeShop({ data: Number(params.coffeeShopId) }),
  component: CoffeeShopDetailPage,
  pendingComponent: DetailPending,
  errorComponent: ({ error }) => <RouteError error={error} backTo="/shops" backLabel="Back to coffee shops" />,
})

type CoffeeShop = NonNullable<Awaited<ReturnType<typeof getCoffeeShop>>>

function createEditValues(coffeeShop?: CoffeeShop | null) {
  return {
    ...createCoffeeShopFormValues(coffeeShop),
    rating: toRatingInput(coffeeShop?.rating ?? null),
  }
}

type EditValues = ReturnType<typeof createEditValues>

function CoffeeShopDetailPage() {
  const coffeeShop = Route.useLoaderData()
  const navigate = useNavigate()
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState(() => createEditValues(coffeeShop))

  useEffect(() => setFormData(createEditValues(coffeeShop)), [coffeeShop])

  if (!coffeeShop) {
    return <div className="py-12 text-center"><h2 className="text-xl font-semibold">Coffee shop not found</h2><Button asChild className="mt-4"><Link to="/visits">Back to visits</Link></Button></div>
  }

  const handleSave = async () => {
    if (!formData.name.trim()) return toast.error("Coffee shop name is required")
    setIsSaving(true)
    try {
      await updateCoffeeShop({ data: {
        id: coffeeShop.id,
        name: formData.name,
        address: formData.address || undefined,
        city: formData.city || undefined,
        country: formData.country || undefined,
        latitude: formData.latitude || undefined,
        longitude: formData.longitude || undefined,
        website: formData.website || undefined,
        notes: formData.notes || undefined,
        rating: toNullableRating(formData.rating),
      } })
      await router.invalidate()
      setIsEditing(false)
      toast.success("Coffee shop updated")
    } catch {
      toast.error("Could not save this coffee shop")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <CoffeeShopDetailHeader
        coffeeShop={coffeeShop}
        formData={formData}
        isEditing={isEditing}
        isSaving={isSaving}
        onToggleFavorite={async () => { await updateCoffeeShop({ data: { id: coffeeShop.id, isFavorite: !coffeeShop.isFavorite } }); await router.invalidate() }}
        onStartEdit={() => setIsEditing(true)}
        onCancel={() => { setFormData(createEditValues(coffeeShop)); setIsEditing(false) }}
        onSave={handleSave}
        onDelete={async () => { await deleteCoffeeShop({ data: coffeeShop.id }); await navigate({ to: "/shops" }) }}
      />
      {isEditing ? (
        <CoffeeShopEditContent formData={formData} setFormData={setFormData} />
      ) : (
        <CoffeeShopReadOnlyContent coffeeShop={coffeeShop} />
      )}
      <CoffeeShopActivity coffeeShop={coffeeShop} />
    </div>
  )
}

function CoffeeShopDetailHeader({ coffeeShop, formData, isEditing, isSaving, onToggleFavorite, onStartEdit, onCancel, onSave, onDelete }: {
  coffeeShop: CoffeeShop
  formData: EditValues
  isEditing: boolean
  isSaving: boolean
  onToggleFavorite: () => void
  onStartEdit: () => void
  onCancel: () => void
  onSave: () => void
  onDelete: () => void
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 items-center gap-3">
        <Button variant="ghost" size="icon" asChild><Link to="/visits" aria-label="Back to visits"><ArrowLeft /></Link></Button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><h1 className="min-w-0 break-words text-2xl font-bold">{coffeeShop.name}</h1>{coffeeShop.rating ? <StarRating value={coffeeShop.rating} readOnly sizeClassName="size-4" /> : null}</div>
          {(coffeeShop.city || coffeeShop.country) && <p className="text-muted-foreground">{[coffeeShop.city, coffeeShop.country].filter(Boolean).join(", ")}</p>}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:ml-auto sm:justify-end">
        <Button variant="outline" size="sm" type="button" aria-label={coffeeShop.isFavorite ? "Remove from favorites" : "Add to favorites"} className={isEditing ? "min-w-11" : undefined} onClick={onToggleFavorite}>
          <Heart className={coffeeShop.isFavorite ? "fill-current text-destructive" : undefined} />
          <span className={isEditing ? "hidden sm:inline" : undefined}>{coffeeShop.isFavorite ? "Favorited" : "Favorite"}</span>
        </Button>
        {isEditing ? <><Button variant="outline" onClick={onCancel} disabled={isSaving}>Cancel</Button><Button onClick={onSave} disabled={isSaving || !formData.name.trim()}>{isSaving ? "Saving..." : "Save"}</Button></> : <Button variant="outline" onClick={onStartEdit}><Pencil />Edit</Button>}
        <DeleteConfirmation title="Delete this coffee shop?" description="This will not delete your cafe visits at this location. This action cannot be undone." onConfirm={onDelete} />
      </div>
    </div>
  )
}

function CoffeeShopEditContent({ formData, setFormData }: {
  formData: EditValues
  setFormData: Dispatch<SetStateAction<EditValues>>
}) {
  const set = <Key extends keyof EditValues>(key: Key, value: EditValues[Key]) => setFormData((current) => ({ ...current, [key]: value }))
  const applyResult = (result: CoffeeShopSearchResult) => setFormData((current) => applyCoffeeShopSearchResult(current, result))

  return <>
    <FormSection title="Basic Info">
      <CoffeeShopOsmSearch onApply={applyResult} initialQuery={formData.name} />
      <InputField id="name" label="Name" placeholder="e.g., Blue Bottle Coffee" value={formData.name} onChange={(value) => set("name", value)} required />
      <div className="space-y-2"><span className="text-sm font-medium">Rating</span><StarRating value={formData.rating} onChange={(rating) => set("rating", formData.rating === rating ? 0 : rating)} ariaLabel="Coffee shop rating" /></div>
      <InputField id="address" label="Address" placeholder="Street address" value={formData.address} onChange={(value) => set("address", value)} />
      <div className="grid gap-4 sm:grid-cols-2">
        <InputField id="city" label="City" placeholder="e.g., San Francisco" value={formData.city} onChange={(value) => set("city", value)} />
        <InputField id="country" label="Country" placeholder="e.g., USA" value={formData.country} onChange={(value) => set("country", value)} />
      </div>
    </FormSection>
    <FormSection title="Coordinates" description="Add coordinates to pin this coffee shop on the map. You can leave these blank and add them later.">
      <div className="grid gap-4 sm:grid-cols-2">
        <InputField id="latitude" label="Latitude" inputMode="decimal" placeholder="e.g., 37.7764" value={formData.latitude} onChange={(value) => set("latitude", value)} />
        <InputField id="longitude" label="Longitude" inputMode="decimal" placeholder="e.g., -122.4231" value={formData.longitude} onChange={(value) => set("longitude", value)} />
      </div>
    </FormSection>
    <FormSection title="Online"><InputField id="website" label="Website" type="url" placeholder="https://..." value={formData.website} onChange={(value) => set("website", value)} /></FormSection>
    <FormSection title="Notes"><TextareaField id="notes" label="" placeholder="Any notes about this coffee shop" value={formData.notes} onChange={(value) => set("notes", value)} rows={3} /></FormSection>
  </>
}

function CoffeeShopReadOnlyContent({ coffeeShop }: { coffeeShop: CoffeeShop }) {
  const hasCoordinates = coffeeShop.latitude !== null && coffeeShop.longitude !== null

  return <>
    <section aria-labelledby="location-heading" className="space-y-3">
      <h2 id="location-heading" className="font-display text-lg font-bold tracking-tight">Location</h2>
      {hasCoordinates && <CoffeeShopMap coffeeShops={[coffeeShop]} visits={coffeeShop.cafeVisits} />}
      <Card><CardContent className="space-y-4"><div className="space-y-2">
        {coffeeShop.address && <p className="font-medium">{coffeeShop.address}</p>}
        <p className="text-muted-foreground">{[coffeeShop.city, coffeeShop.country].filter(Boolean).join(", ") || "No location info"}</p>
        <p className="text-sm text-muted-foreground">{hasCoordinates ? `${coffeeShop.latitude}, ${coffeeShop.longitude}` : "Add coordinates to see this coffee shop on the map."}</p>
      </div></CardContent></Card>
    </section>
    {coffeeShop.notes && <Card><CardHeader><CardTitle>Notes</CardTitle></CardHeader><CardContent><p className="whitespace-pre-wrap">{coffeeShop.notes}</p></CardContent></Card>}
  </>
}

function CoffeeShopActivity({ coffeeShop }: { coffeeShop: CoffeeShop }) {
  const hasCoordinates = coffeeShop.latitude !== null && coffeeShop.longitude !== null
  const openStreetMapUrl = hasCoordinates
    ? `https://www.openstreetmap.org/?mlat=${coffeeShop.latitude}&mlon=${coffeeShop.longitude}#map=18/${coffeeShop.latitude}/${coffeeShop.longitude}`
    : null

  return <>
    <Card>
      <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {openStreetMapUrl && <Button variant="outline" size="sm" asChild><a href={openStreetMapUrl} target="_blank" rel="noopener noreferrer"><MapPinned />Open in OpenStreetMap</a></Button>}
        {coffeeShop.website && <Button variant="outline" size="sm" asChild><a href={coffeeShop.website} target="_blank" rel="noopener noreferrer"><ExternalLink />Open website</a></Button>}
        <Button size="sm" asChild><Link to="/visits/new" search={{ coffeeShopId: String(coffeeShop.id) }}><Plus />Log a visit</Link></Button>
      </CardContent>
    </Card>
    {coffeeShop.cafeVisits.length > 0 && <Card><CardHeader><CardTitle>Recent Visits</CardTitle></CardHeader><CardContent><div className="space-y-2">{coffeeShop.cafeVisits.slice(0, 5).map((visit) => <Link key={visit.id} to="/visits/$visitId" params={{ visitId: String(visit.id) }} className="flex min-h-11 items-center rounded p-2 hover:bg-muted"><div className="flex w-full justify-between"><span className="font-medium">{visit.drinkName || "Coffee"}</span><span className="text-sm text-muted-foreground">{new Date(visit.visitedAt).toLocaleDateString()}</span></div></Link>)}</div></CardContent></Card>}
  </>
}
