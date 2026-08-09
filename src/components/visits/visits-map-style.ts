import type { StyleSpecification } from "maplibre-gl"

export const VISITS_BASEMAP_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    minimalBasemap: {
      type: "raster",
      tiles: ["https://a.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png"],
      tileSize: 256,
      maxzoom: 20,
      attribution: "© OpenStreetMap contributors, © CARTO",
    },
  },
  layers: [
    {
      id: "minimalBasemap",
      type: "raster",
      source: "minimalBasemap",
      paint: {
        "raster-saturation": -0.3,
        "raster-contrast": -0.04,
      },
    },
  ],
}
