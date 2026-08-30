import { MapControlContainer } from '@/components/map/map-control-container'

function AttributionLinks() {
  return (
    <>
      ©{' '}
      <a
        className="underline underline-offset-2 hover:text-foreground"
        href="https://www.openstreetmap.org/copyright"
        target="_blank"
        rel="noopener noreferrer"
      >
        OpenStreetMap contributors
      </a>
      {' · '}
      <a
        className="underline underline-offset-2 hover:text-foreground"
        href="https://openfreemap.org"
        target="_blank"
        rel="noopener noreferrer"
      >
        OpenFreeMap
      </a>
      {' · © '}
      <a
        className="underline underline-offset-2 hover:text-foreground"
        href="https://openmaptiles.org"
        target="_blank"
        rel="noopener noreferrer"
      >
        OpenMapTiles
      </a>
      .
    </>
  )
}

export function VisitsMapAttribution({
  fullscreen = false,
}: {
  readonly fullscreen?: boolean
}) {
  if (fullscreen) {
    return (
      <MapControlContainer className="roastbook-map-fullscreen-attribution absolute right-2 bottom-2 z-20 max-w-[calc(100%_-_1rem)] rounded-md bg-card/90 px-2 py-1 text-right text-[10px] text-muted-foreground shadow-control backdrop-blur-sm">
        <AttributionLinks />
      </MapControlContainer>
    )
  }

  return (
    <p className="border-t border-border bg-card px-4 py-3 text-xs text-muted-foreground">
      <AttributionLinks />
    </p>
  )
}
