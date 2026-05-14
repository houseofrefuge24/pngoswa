import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type FieldProps = {
  label: ReactNode
  htmlFor?: string
  required?: boolean
  hint?: ReactNode
  error?: string
  children: ReactNode
  className?: string
}

export function Field({
  label,
  htmlFor,
  required,
  hint,
  error,
  children,
  className,
}: FieldProps) {
  return (
    <div className={cn("form-group", className)}>
      <label htmlFor={htmlFor} className="form-label">
        {label} {required ? <span className="req">*</span> : null}
      </label>
      {hint ? <div className="form-hint">{hint}</div> : null}
      {children}
      {error ? (
        <p role="alert" className="form-error">
          {error}
        </p>
      ) : null}
    </div>
  )
}
