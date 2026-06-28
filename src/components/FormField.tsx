import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface FormFieldBaseProps {
  label: string
  id: string
  required?: boolean
  className?: string
  disabled?: boolean
}

interface InputFieldProps extends FormFieldBaseProps {
  type?: "text" | "number" | "date" | "url" | "email"
  placeholder?: string
  value: string
  onChange: (value: string) => void
  min?: string | number
  step?: string | number
}

export function InputField({
  label,
  id,
  required,
  className,
  disabled,
  type = "text",
  placeholder,
  value,
  onChange,
  min,
  step,
}: InputFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>
        {label}
        {required && " *"}
      </Label>
      <Input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={disabled}
        min={min}
        step={step}
      />
    </div>
  )
}

interface TextareaFieldProps extends FormFieldBaseProps {
  placeholder?: string
  value: string
  onChange: (value: string) => void
  rows?: number
}

export function TextareaField({
  label,
  id,
  required,
  className,
  disabled,
  placeholder,
  value,
  onChange,
  rows = 4,
}: TextareaFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>
        {label}
        {required && " *"}
      </Label>
      <Textarea
        id={id}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={disabled}
        rows={rows}
      />
    </div>
  )
}

interface SelectOption {
  value: string
  label: string
}

interface SelectFieldProps extends FormFieldBaseProps {
  placeholder?: string
  value: string
  onChange: (value: string) => void
  options: readonly SelectOption[] | SelectOption[]
}

export function SelectField({
  label,
  id,
  required,
  className,
  disabled,
  placeholder,
  value,
  onChange,
  options,
}: SelectFieldProps) {
  const selectedOption = options.find((option) => option.value === value)

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>
        {label}
        {required && " *"}
      </Label>
      <Select value={value} onValueChange={(v) => onChange(v ?? "")} disabled={disabled}>
        <SelectTrigger id={id}>
          <SelectValue placeholder={placeholder}>
            {selectedOption?.label}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
