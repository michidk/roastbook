import type { StyleSpecification } from "maplibre-gl"

export const VISITS_BASEMAP_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    openStreetMap: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [
    {
      id: "openStreetMap",
      type: "raster",
      source: "openStreetMap",
      paint: {
        "raster-saturation": -0.55,
        "raster-contrast": -0.08,
      },
    },
  ],
}
