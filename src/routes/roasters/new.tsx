import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FormPageHeader } from "@/components/form/form-shell"
import { RoasterForm } from "@/components/roasters/roaster-form"

export const Route = createFileRoute("/roasters/new")({
  component: NewRoasterPage,
})

function NewRoasterPage() {
  const navigate = useNavigate()

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <FormPageHeader
        title="Add Roaster"
        leading={
          <Button variant="ghost" size="icon" asChild>
            <Link to="/roasters">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
        }
      />
      <RoasterForm
        onCreated={(roaster) =>
          navigate({
            to: "/roasters/$roasterId",
            params: { roasterId: String(roaster.id) },
          })
        }
        onCancel={() => navigate({ to: "/roasters" })}
      />
    </div>
  )
}
