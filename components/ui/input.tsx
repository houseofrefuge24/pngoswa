import { forwardRef, type InputHTMLAttributes } from "react"

import { cn } from "@/lib/utils"

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, ...props },
  ref
) {
  return (
    <input
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
})
