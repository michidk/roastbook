import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react"
import { ImageOff } from "lucide-react"
import { cn } from "@/lib/utils"

type ResilientImageProps = ComponentProps<"img"> & {
  readonly fallback?: ReactNode
  readonly fallbackLabel?: string
}

type LoadedUpload = {
  readonly source: string
  readonly url: string
}

export function ResilientImage({
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
}: ResilientImageProps) {
  const source = typeof src === "string" ? src : undefined
  const [failedSource, setFailedSource] = useState<string | null>(null)
  const [loadedUpload, setLoadedUpload] = useState<LoadedUpload | null>(null)
  const [eligibleUploadSource, setEligibleUploadSource] = useState<string | null>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const placeholderRef = useRef<HTMLDivElement>(null)
  const isUpload = source?.startsWith("/api/uploads?") ?? false
  const shouldLoadUpload = loading !== "lazy" || eligibleUploadSource === source
  const renderedSource = isUpload
    ? loadedUpload && loadedUpload.source === source
      ? loadedUpload.url
      : undefined
    : source
  const intrinsicAspectRatio =
    typeof width === "number" && typeof height === "number"
      ? `${width} / ${height}`
      : undefined
  const placeholderStyle = {
    ...style,
    aspectRatio: style?.aspectRatio ?? intrinsicAspectRatio,
  }

  useEffect(() => {
    const placeholder = placeholderRef.current
    if (!source || !isUpload || loading !== "lazy" || shouldLoadUpload || !placeholder) {
      return
    }
    if (typeof IntersectionObserver === "undefined") {
      setEligibleUploadSource(source)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setEligibleUploadSource(source)
          observer.disconnect()
        }
      },
      { rootMargin: "300px" },
    )
    observer.observe(placeholder)
    return () => observer.disconnect()
  }, [isUpload, loading, shouldLoadUpload, source])

  useEffect(() => {
    if (!source || !isUpload || !shouldLoadUpload) return

    const controller = new AbortController()
    let objectUrl: string | null = null

    const loadUpload = async () => {
      try {
        const response = await fetch(source, { signal: controller.signal })
        if (!response.ok) {
          setFailedSource(source)
          return
        }

        const blob = await response.blob()
        if (controller.signal.aborted) return

        objectUrl = URL.createObjectURL(blob)
        setLoadedUpload({ source, url: objectUrl })
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return
        setFailedSource(source)
      }
    }

    void loadUpload()

    return () => {
      controller.abort()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [isUpload, shouldLoadUpload, source])

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

  if (!renderedSource) {
    return (
      <div
        ref={placeholderRef}
        role={alt ? "img" : undefined}
        aria-label={alt || undefined}
        aria-busy="true"
        style={placeholderStyle}
        className={cn("bg-secondary", className)}
      />
    )
  }

  return (
    <img
      ref={imageRef}
      {...imageProps}
      src={renderedSource}
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
