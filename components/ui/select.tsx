import { forwardRef, type SelectHTMLAttributes } from "react"

import { cn } from "@/lib/utils"

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  invalid?: boolean
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select({ className, invalid, ...props }, ref) {
    return (
      <select
        ref={ref}
        className={cn(
          "form-input ui-input",
          invalid && "ui-input-invalid",
          className
        )}
        aria-invalid={invalid || undefined}
        {...props}
      />
    )
  }
)
