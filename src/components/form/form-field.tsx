import type { ReactNode } from "react"
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
import { cn, normalizeUrl } from "@/lib/utils"
import { CURRENCIES } from "@/lib/constants"

interface FormFieldBaseProps {
  label: string
  id: string
  required?: boolean
  className?: string
  disabled?: boolean
  error?: string
}

function FieldShell({
  label,
  id,
  required,
  className,
  error,
  children,
}: FormFieldBaseProps & { children: ReactNode }) {
  return (
    <div className={cn("space-y-2", className)}>
      {label ? (
        <Label htmlFor={id}>
          {label}
          {required && " *"}
        </Label>
      ) : null}
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}

function describedBy(id: string, error?: string) {
  return error ? `${id}-error` : undefined
}

interface InputFieldProps extends FormFieldBaseProps {
  type?: "text" | "number" | "date" | "url" | "email"
  inputMode?: "text" | "decimal" | "numeric"
  placeholder?: string
  value: string
  onChange: (value: string) => void
  min?: string | number
  max?: string | number
  step?: string | number
  autoFocus?: boolean
}

export function InputField({
  label,
  id,
  required,
  className,
  disabled,
  error,
  type = "text",
  inputMode,
  placeholder,
  value,
  onChange,
  min,
  max,
  step,
  autoFocus,
}: InputFieldProps) {
  return (
    <FieldShell
      label={label}
      id={id}
      required={required}
      className={className}
      error={error}
    >
      <Input
        id={id}
        type={type}
        inputMode={inputMode}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={
          type === "url"
            ? (e) => {
                const normalized = normalizeUrl(e.target.value)
                if (normalized !== e.target.value) onChange(normalized)
              }
            : undefined
        }
        required={required}
        disabled={disabled}
        min={min}
        max={max}
        step={step}
        autoFocus={autoFocus}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy(id, error)}
      />
    </FieldShell>
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
  error,
  placeholder,
  value,
  onChange,
  rows = 4,
}: TextareaFieldProps) {
  return (
    <FieldShell
      label={label}
      id={id}
      required={required}
      className={className}
      error={error}
    >
      <Textarea
        id={id}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={disabled}
        rows={rows}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy(id, error)}
      />
    </FieldShell>
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
  error,
  placeholder,
  value,
  onChange,
  options,
}: SelectFieldProps) {
  const selectedOption = options.find((option) => option.value === value)

  return (
    <FieldShell
      label={label}
      id={id}
      required={required}
      className={className}
      error={error}
    >
      <Select
        value={value || null}
        onValueChange={(v) => onChange(v ?? "")}
        disabled={disabled}
      >
        <SelectTrigger
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy(id, error)}
        >
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
    </FieldShell>
  )
}

type CurrencyFieldProps = Omit<SelectFieldProps, "options" | "label"> & {
  label?: string
}

export function CurrencyField({
  label = "Currency",
  ...props
}: CurrencyFieldProps) {
  return <SelectField {...props} label={label} options={CURRENCIES} />
}
