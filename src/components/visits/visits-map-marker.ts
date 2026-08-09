import { getMapMarkerVariant, type VisitsMapPlace } from "./visits-map-utils"

const SVG_NAMESPACE = "http://www.w3.org/2000/svg"

export function createVisitsMapMarkerElement(
  place: VisitsMapPlace,
  onSelect: (placeId: string, focusInspector: boolean) => void,
): HTMLButtonElement {
  const variant = getMapMarkerVariant(place)
  const marker = document.createElement("button")
  marker.type = "button"
  marker.className = "roastbook-visits-map-marker"
  marker.dataset.variant = variant
  marker.dataset.selected = "false"
  const location = place.address ?? place.city
  marker.setAttribute(
    "aria-label",
    `${variant === "favorite" ? "Favorite café" : variant === "saved" ? "Saved café" : "Discovered café"}: ${place.name}${location ? `, ${location}` : ""}`,
  )

  const pin = document.createElement("span")
  pin.className = "roastbook-visits-map-marker-pin"
  pin.append(createCoffeeCupIcon())
  marker.append(pin)

  if (variant === "favorite") {
    const favorite = document.createElement("span")
    favorite.className = "roastbook-visits-map-marker-favorite"
    favorite.setAttribute("aria-hidden", "true")
    favorite.append(createHeartIcon())
    marker.append(favorite)
  }

  marker.addEventListener("click", (event) => {
    event.stopPropagation()
    onSelect(place.id, event.detail === 0)
  })
  return marker
}

function createCoffeeCupIcon(): SVGSVGElement {
  const svg = document.createElementNS(SVG_NAMESPACE, "svg")
  svg.setAttribute("viewBox", "0 0 24 24")
  svg.setAttribute("aria-hidden", "true")
  svg.setAttribute("fill", "none")
  svg.setAttribute("stroke", "currentColor")
  svg.setAttribute("stroke-width", "2")
  svg.setAttribute("stroke-linecap", "round")
  svg.setAttribute("stroke-linejoin", "round")

  const cup = document.createElementNS(SVG_NAMESPACE, "path")
  cup.setAttribute("d", "M4 8h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8Z")
  const handle = document.createElementNS(SVG_NAMESPACE, "path")
  handle.setAttribute("d", "M16 10h1.5a2.5 2.5 0 0 1 0 5H16")
  const steam = document.createElementNS(SVG_NAMESPACE, "path")
  steam.setAttribute("d", "M8 5c0-1 1-1 1-2m3 2c0-1 1-1 1-2")
  svg.append(cup, handle, steam)
  return svg
}

function createHeartIcon(): SVGSVGElement {
  const svg = document.createElementNS(SVG_NAMESPACE, "svg")
  svg.setAttribute("viewBox", "0 0 24 24")
  svg.setAttribute("aria-hidden", "true")
  svg.setAttribute("fill", "currentColor")
  const path = document.createElementNS(SVG_NAMESPACE, "path")
  path.setAttribute(
    "d",
    "M12 21s-7-4.35-9.33-8.55C.77 9.03 2.2 5 6.1 5A5.3 5.3 0 0 1 12 8.1 5.3 5.3 0 0 1 17.9 5c3.9 0 5.33 4.03 3.43 7.45C19 16.65 12 21 12 21Z",
  )
  svg.append(path)
  return svg
}
