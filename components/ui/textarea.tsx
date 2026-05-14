import { forwardRef, type TextareaHTMLAttributes } from "react"

import { cn } from "@/lib/utils"

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  invalid?: boolean
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ className, invalid, ...props }, ref) {
    return (
      <textarea
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
