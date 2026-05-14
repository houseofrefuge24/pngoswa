import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react"

import { cn } from "@/lib/utils"

type ChoiceCardProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  type: "radio" | "checkbox"
  title: ReactNode
  description?: ReactNode
  selected?: boolean
  invalid?: boolean
}

export const ChoiceCard = forwardRef<HTMLInputElement, ChoiceCardProps>(
  function ChoiceCard(
    { className, title, description, selected, invalid, type, ...props },
    ref
  ) {
    return (
      <label
        className={cn(
          "option-card ui-choice-card",
          selected && "selected",
          invalid && "ui-choice-card-invalid",
          className
        )}
      >
        <input ref={ref} type={type} className="option-input" {...props} />
        <span>
          <strong>{title}</strong>
          {description ? (
            <span className="option-desc">{description}</span>
          ) : null}
        </span>
      </label>
    )
  }
)
