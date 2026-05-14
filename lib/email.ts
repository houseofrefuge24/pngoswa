export type TransactionalEmailInput = {
  to: string
  subject: string
  html: string
  text: string
}

export type TransactionalEmailResult =
  | { ok: true }
  | { ok: false; error: string }

export async function sendTransactionalEmail(
  input: TransactionalEmailInput
): Promise<TransactionalEmailResult> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL

  if (!apiKey || !from) {
    return {
      ok: false,
      error:
        "Email delivery is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL.",
    }
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()

    return {
      ok: false,
      error: `Email provider returned ${response.status}: ${errorBody}`,
    }
  }

  return { ok: true }
}

export function createEmailPreview(text: string) {
  return text.replace(/\s+/g, " ").trim().slice(0, 160)
}
