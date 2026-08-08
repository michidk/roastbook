import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { FormPageHeader } from "@/components/form/form-shell"
import { GearForm } from "@/components/gear/gear-form"

export const Route = createFileRoute("/gear/new")({
  component: NewGearPage,
})

function NewGearPage() {
  const navigate = useNavigate()

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <FormPageHeader
        title="Add Gear"
        description="Add new equipment to your setup"
      />
      <GearForm
        onCreated={(item) =>
          navigate({ to: "/gear/$gearId", params: { gearId: String(item.id) } })
        }
        onCancel={() => navigate({ to: "/gear" })}
      />
    </div>
  )
}
