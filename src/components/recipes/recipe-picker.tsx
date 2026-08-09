import { EntityPicker } from "@/components/form/entity-picker"
import { RecipeForm } from "@/components/recipes/recipe-form"

interface RecipeOption {
  id: number
  name: string
}

interface RecipePickerProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  recipes: readonly RecipeOption[]
}

export function RecipePicker({
  id,
  label,
  value,
  onChange,
  recipes,
}: RecipePickerProps) {
  return (
    <EntityPicker
      id={id}
      label={label}
      value={value}
      onChange={onChange}
      items={recipes}
      getKey={(recipe) => recipe.id}
      getLabel={(recipe) => recipe.name}
      placeholder="Select recipe"
      searchPlaceholder="Search recipes…"
      emptyMessage="No matching recipes."
      createLabel={(query) => `Add “${query}” as a new recipe`}
      noMatchHint={(query) => `No recipe named “${query}” yet`}
      dialogTitle="Add recipe"
      dialogDescription="Create a recipe without leaving this shot."
      renderCreateForm={({ initialName, onCreated, onCancel }) => (
        <RecipeForm
          initialName={initialName}
          onCreated={(recipe) =>
            onCreated({ id: recipe.id, name: recipe.name })
          }
          onCancel={onCancel}
        />
      )}
    />
  )
}
