import {
  getOpenStreetMapUrl,
  getSubtitle,
  type MappableCoffeeShop,
} from "./coffee-shop-map-utils"

export function createCoffeeShopMarkerElement(coffeeShop: MappableCoffeeShop): HTMLButtonElement {
  const marker = document.createElement("button")
  marker.type = "button"
  marker.setAttribute("aria-label", `Show ${coffeeShop.name} on map`)
  marker.className =
    "group flex size-11 items-center justify-center rounded-full bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

  const dot = document.createElement("span")
  dot.className =
    "size-5 rounded-full border-2 border-background bg-primary shadow-md transition-[box-shadow,background-color] group-hover:bg-primary/95"
  marker.appendChild(dot)
  return marker
}

export function createCoffeeShopPopupContent(coffeeShop: MappableCoffeeShop): HTMLDivElement {
  const popup = document.createElement("div")
  popup.className =
    "w-[200px] space-y-2 rounded-xl border border-border bg-popover p-2.5 text-popover-foreground shadow-lg"

  const header = document.createElement("div")
  header.className = "space-y-1"
  const title = document.createElement("p")
  title.className = "font-semibold leading-tight"
  title.textContent = coffeeShop.name
  const subtitle = document.createElement("p")
  subtitle.className = "text-sm leading-snug text-muted-foreground"
  const subtitleText = getSubtitle(coffeeShop)
  subtitle.textContent = subtitleText
  header.append(title, subtitle)
  popup.append(header)

  const meta = document.createElement("div")
  meta.className = "flex flex-wrap gap-2"
  const location = document.createElement("span")
  location.className =
    "rounded-full bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground"
  const locationText =
    [coffeeShop.city, coffeeShop.country].filter(Boolean).join(", ") || "Saved coffee shop"
  location.textContent = locationText
  const coordinates = document.createElement("span")
  coordinates.className =
    "rounded-full bg-accent px-2 py-1 text-xs font-medium text-accent-foreground"
  coordinates.textContent = `${coffeeShop.latitude.toFixed(4)}, ${coffeeShop.longitude.toFixed(4)}`
  if (locationText !== subtitleText) meta.append(location)
  meta.append(coordinates)
  popup.append(meta)

  const links = document.createElement("div")
  links.className = "flex flex-wrap gap-2"
  links.append(createPopupLink(getOpenStreetMapUrl(coffeeShop), "OpenStreetMap"))
  if (coffeeShop.website) links.append(createPopupLink(coffeeShop.website, "Website"))
  popup.append(links)
  return popup
}

function createPopupLink(href: string, label: string): HTMLAnchorElement {
  const link = document.createElement("a")
  link.href = href
  link.target = "_blank"
  link.rel = "noopener noreferrer"
  link.className =
    "inline-flex min-h-11 items-center rounded-md border border-border px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted sm:min-h-0 sm:px-2.5 sm:py-1.5"
  link.textContent = label
  return link
}
