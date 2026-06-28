import { Link, useNavigate } from "@tanstack/react-router"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { thumbnailUrl } from "@/lib/image-url"

type Shot = {
  id: number
  createdAt: Date
  doseGrams: string | null
  yieldGrams: string | null
  brewTimeSeconds: number | null
  rating: number | null
  bean: {
    id: number
    name: string
    images?: Array<{
      storagePath: string
      isThumbnail: boolean | null
    }>
  } | null
  recipe: {
    name: string
  } | null
}

interface ShotsTableProps {
  shots: Shot[]
  hideBean?: boolean
  hideGear?: boolean
}

export function ShotsTable({ shots, hideBean, hideGear }: ShotsTableProps) {
  const navigate = useNavigate()

  if (shots.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">No shots recorded yet.</p>
    )
  }

  const baseUrl = import.meta.env.VITE_STORAGE_URL || "/uploads"

  const getBeanThumbnail = (bean: Shot["bean"]) => {
    if (!bean?.images?.length) return null
    const thumbnail = bean.images.find((img) => img.isThumbnail) || bean.images[0]
    if (!thumbnail?.storagePath) return null
    return thumbnailUrl(baseUrl, thumbnail.storagePath)
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          {!hideBean && <TableHead>Bean</TableHead>}
          <TableHead className="text-right">Dose</TableHead>
          <TableHead className="text-right">Yield</TableHead>
          <TableHead className="text-right">Time</TableHead>
          {!hideGear && <TableHead>Recipe</TableHead>}
          <TableHead className="text-right">Rating</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {shots.map((shot) => {
          const beanThumb = getBeanThumbnail(shot.bean)
          return (
            <TableRow
              key={shot.id}
              className="cursor-pointer"
              onClick={() => navigate({ to: "/shots/$shotId", params: { shotId: String(shot.id) } })}
            >
              <TableCell>
                {new Date(shot.createdAt).toLocaleDateString()}
              </TableCell>
              {!hideBean && (
                <TableCell>
                  {shot.bean ? (
                    <Link
                      to="/beans/$beanId"
                      params={{ beanId: String(shot.bean.id) }}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-2 hover:underline"
                    >
                      {beanThumb && (
                        <img
                          src={beanThumb}
                          alt=""
                          className="h-8 w-8 rounded object-cover"
                        />
                      )}
                      <span>{shot.bean.name}</span>
                    </Link>
                  ) : (
                    "-"
                  )}
                </TableCell>
              )}
              <TableCell className="text-right">
                {shot.doseGrams ? `${shot.doseGrams}g` : "-"}
              </TableCell>
              <TableCell className="text-right">
                {shot.yieldGrams ? `${shot.yieldGrams}g` : "-"}
              </TableCell>
              <TableCell className="text-right">
                {shot.brewTimeSeconds ? `${shot.brewTimeSeconds}s` : "-"}
              </TableCell>
              {!hideGear && (
                <TableCell>{shot.recipe?.name || "-"}</TableCell>
              )}
              <TableCell className="text-right">
                {shot.rating ? (
                  <Badge variant="secondary">{shot.rating}/5</Badge>
                ) : (
                  "-"
                )}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
