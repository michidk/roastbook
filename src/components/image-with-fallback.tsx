import {
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react"
import { ImageOff } from "lucide-react"
import { cn } from "@/lib/utils"

type ImageWithFallbackProps = ComponentProps<"img"> & {
  readonly fallback?: ReactNode
  readonly fallbackLabel?: string
}

export function ImageWithFallback({
  alt,
  className,
  fallback,
  fallbackLabel = "Image unavailable",
  height,
  loading,
  onError,
  src,
  style,
  width,
  ...imageProps
}: ImageWithFallbackProps) {
  const source = typeof src === "string" ? src : undefined
  const [failedSource, setFailedSource] = useState<string | null>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const intrinsicAspectRatio =
    typeof width === "number" && typeof height === "number"
      ? `${width} / ${height}`
      : undefined
  const placeholderStyle = {
    ...style,
    aspectRatio: style?.aspectRatio ?? intrinsicAspectRatio,
  }

  useLayoutEffect(() => {
    const image = imageRef.current
    if (image?.complete && image.naturalWidth === 0) {
      setFailedSource(source ?? null)
    }
  }, [source])

  if (!source || failedSource === source) {
    return (
      <div
        role={alt ? "img" : undefined}
        aria-label={alt ? `${alt}. ${fallbackLabel}` : undefined}
        style={placeholderStyle}
        className={cn(
          "flex items-center justify-center bg-secondary text-muted-foreground",
          className,
        )}
      >
        {fallback ?? <ImageOff aria-hidden className="size-5" />}
        {alt ? <span className="sr-only">{fallbackLabel}</span> : null}
      </div>
    )
  }

  return (
    <img
      ref={imageRef}
      {...imageProps}
      src={source}
      alt={alt}
      width={width}
      height={height}
      loading={loading}
      style={style}
      className={className}
      onError={(event) => {
        onError?.(event)
        setFailedSource(source)
      }}
    />
  )
}
