"use client"

import { useActionState } from "react"

export type MagicLinkFormState = {
  error?: string
  success?: string
  debugUrl?: string
}

type MagicLinkRequestFormProps = {
  action: (
    state: MagicLinkFormState,
    formData: FormData
  ) => Promise<MagicLinkFormState>
  description: string
  pendingLabel: string
  submitLabel: string
}

const initialState: MagicLinkFormState = {}

export function MagicLinkRequestForm({
  action,
  description,
  pendingLabel,
  submitLabel,
}: MagicLinkRequestFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState)

  return (
    <form action={formAction} className="auth-form">
      <p className="auth-copy">{description}</p>
      <label className="form-label" htmlFor="portal-email">
        Email address
      </label>
      <input
        id="portal-email"
        name="email"
        type="email"
        required
        className="form-input"
        placeholder="you@email.com"
      />
      {state.error ? (
        <div className="form-feedback form-feedback-error">
          <p>{state.error}</p>
        </div>
      ) : null}
      {state.success ? (
        <div className="form-feedback form-feedback-success">
          <p>{state.success}</p>
          {state.debugUrl ? (
            <p>
              Development access link: <a href={state.debugUrl}>{state.debugUrl}</a>
            </p>
          ) : null}
        </div>
      ) : null}
      <button type="submit" className="btn btn-cta btn-lg submit-btn" disabled={pending}>
        {pending ? pendingLabel : submitLabel}
      </button>
    </form>
  )
}
