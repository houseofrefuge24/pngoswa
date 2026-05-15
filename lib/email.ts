import { getSiteUrl } from "@/lib/site-url"

type MembershipReviewEmailKind = "approve" | "follow-up" | "reject"
type MagicLinkEmailScope = "ADMIN" | "MEMBER"

type MembershipReviewEmailInput = {
  kind: MembershipReviewEmailKind
  memberName: string
  applicationNumber: string
  memberPortalUrl: string
  reviewerMessage?: string
}

export type TransactionalEmailInput = {
  to: string
  subject: string
  html: string
  text: string
}

export type TransactionalEmailResult =
  | { ok: true }
  | { ok: false; error: string }

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function paragraphizeText(content: string) {
  return content
    .trim()
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
}

function paragraphizeHtml(content: string) {
  return paragraphizeText(content)
    .map(
      (paragraph) =>
        `<p style="margin: 0 0 16px;">${escapeHtml(paragraph).replace(/\n/g, "<br />")}</p>`
    )
    .join("")
}

function getDefaultFromEmail() {
  return (
    process.env.RESEND_FROM_EMAIL ?? "PNGOSWA <philngosocialworker@gmail.com>"
  )
}

function getReplyToEmail() {
  return process.env.RESEND_REPLY_TO_EMAIL ?? "philngosocialworker@gmail.com"
}

function getMemberPortalUrl() {
  return `${getSiteUrl()}/member/login`
}

function wrapEmailTemplate(params: {
  preheader: string
  title: string
  eyebrow: string
  intro: string
  bodyHtml: string
  ctaLabel?: string
  ctaHref?: string
  note?: string
}) {
  return `
    <div style="margin:0;padding:24px;background:#edf3fb;font-family:Georgia,serif;color:#183153;">
      <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
        ${escapeHtml(params.preheader)}
      </div>
      <div style="max-width:680px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 18px 44px rgba(14,45,94,0.12);">
        <div style="padding:32px 36px;background:linear-gradient(135deg,#0e2d5e,#1b4f8a);color:#ffffff;">
          <div style="font-size:12px;letter-spacing:0.12em;text-transform:uppercase;font-weight:700;opacity:0.82;margin-bottom:14px;">
            ${escapeHtml(params.eyebrow)}
          </div>
          <h1 style="margin:0 0 12px;font-size:30px;line-height:1.15;color:#ffffff;">
            ${escapeHtml(params.title)}
          </h1>
          <p style="margin:0;font-size:16px;line-height:1.7;color:rgba(255,255,255,0.84);">
            ${escapeHtml(params.intro)}
          </p>
        </div>
        <div style="padding:32px 36px;">
          <div style="font-size:16px;line-height:1.8;color:#183153;">
            ${params.bodyHtml}
          </div>
          ${
            params.ctaLabel && params.ctaHref
              ? `
                <div style="margin-top:28px;">
                  <a
                    href="${params.ctaHref}"
                    style="display:inline-block;padding:14px 20px;border-radius:14px;background:#c41e3a;color:#ffffff;text-decoration:none;font-weight:700;"
                  >
                    ${escapeHtml(params.ctaLabel)}
                  </a>
                </div>
              `
              : ""
          }
          ${
            params.note
              ? `
                <div style="margin-top:28px;padding:18px 20px;border-radius:16px;background:#f6f9ff;border:1px solid #dde7f4;color:#445777;font-size:14px;line-height:1.7;">
                  ${escapeHtml(params.note)}
                </div>
              `
              : ""
          }
        </div>
      </div>
    </div>
  `
}

export function createMembershipReviewEmail(input: MembershipReviewEmailInput) {
  const reviewerMessage = input.reviewerMessage?.trim()
  const messageBlockText = reviewerMessage
    ? `Reviewer note:\n${reviewerMessage}\n`
    : ""
  const messageBlockHtml = reviewerMessage
    ? `
        <div style="margin: 20px 0; padding: 18px 20px; border-radius: 16px; background: #fef6f7; border: 1px solid rgba(196,30,58,0.14);">
          <strong style="display:block;margin-bottom:8px;color:#9c1830;">Reviewer note</strong>
          <div style="color:#183153;">${paragraphizeHtml(reviewerMessage)}</div>
        </div>
      `
    : ""

  if (input.kind === "approve") {
    const subject = "Your PNGOSWA membership application has been approved"
    const text = `Hello ${input.memberName},

We are pleased to let you know that your PNGOSWA membership application (${input.applicationNumber}) has been approved.

${messageBlockText}You may now use the member portal to review your current membership details and future updates:
${input.memberPortalUrl}

Welcome to the Philippine NGO Social Workers Association.

Regards,
PNGOSWA`

    const html = wrapEmailTemplate({
      preheader: "Your PNGOSWA membership application has been approved.",
      eyebrow: "PNGOSWA Membership",
      title: "Membership Approved",
      intro: `Application ${input.applicationNumber} has been approved.`,
      bodyHtml: `
        <p style="margin: 0 0 16px;">Hello ${escapeHtml(input.memberName)},</p>
        <p style="margin: 0 0 16px;">
          We are pleased to let you know that your PNGOSWA membership application
          <strong>${escapeHtml(input.applicationNumber)}</strong> has been approved.
        </p>
        ${messageBlockHtml}
        <p style="margin: 0 0 16px;">
          You may now use the member portal to review your current membership details
          and future updates.
        </p>
        <p style="margin: 0;">Welcome to the Philippine NGO Social Workers Association.</p>
      `,
      ctaLabel: "Open Member Portal",
      ctaHref: input.memberPortalUrl,
      note: "If you have questions about your approval, you can reply directly to this email.",
    })

    return { subject, text, html }
  }

  if (input.kind === "reject") {
    const subject = "Update on your PNGOSWA membership application"
    const text = `Hello ${input.memberName},

Thank you for applying for PNGOSWA membership. After review, we are unable to approve application ${input.applicationNumber} at this time.

${messageBlockText}If you need clarification, you may reply to this email for guidance on the next steps.

Regards,
PNGOSWA`

    const html = wrapEmailTemplate({
      preheader: "There is an update on your PNGOSWA membership application.",
      eyebrow: "PNGOSWA Membership",
      title: "Application Update",
      intro: `Application ${input.applicationNumber} was reviewed and could not be approved at this time.`,
      bodyHtml: `
        <p style="margin: 0 0 16px;">Hello ${escapeHtml(input.memberName)},</p>
        <p style="margin: 0 0 16px;">
          Thank you for applying for PNGOSWA membership. After review, we are unable
          to approve application <strong>${escapeHtml(input.applicationNumber)}</strong> at this time.
        </p>
        ${messageBlockHtml}
        <p style="margin: 0;">
          If you need clarification, you may reply to this email for guidance on the next steps.
        </p>
      `,
      note: "We appreciate your interest in PNGOSWA and your service in the social work sector.",
    })

    return { subject, text, html }
  }

  const subject = "Additional information needed for your PNGOSWA application"
  const defaultFollowUpMessage =
    "PNGOSWA reviewed your application and needs additional information before we can proceed with the next step."
  const followUpMessage = reviewerMessage || defaultFollowUpMessage
  const text = `Hello ${input.memberName},

We reviewed your PNGOSWA membership application (${input.applicationNumber}) and need additional information before we can continue processing it.

Reviewer note:
${followUpMessage}

Please sign in to the member portal to review your application status:
${input.memberPortalUrl}

Regards,
PNGOSWA`

  const html = wrapEmailTemplate({
    preheader:
      "PNGOSWA needs additional information for your membership application.",
    eyebrow: "PNGOSWA Membership",
    title: "Additional Information Needed",
    intro: `Application ${input.applicationNumber} needs a follow-up before review can continue.`,
    bodyHtml: `
      <p style="margin: 0 0 16px;">Hello ${escapeHtml(input.memberName)},</p>
      <p style="margin: 0 0 16px;">
        We reviewed your PNGOSWA membership application
        <strong>${escapeHtml(input.applicationNumber)}</strong> and need additional
        information before we can continue processing it.
      </p>
      <div style="margin: 20px 0; padding: 18px 20px; border-radius: 16px; background: #fff9ef; border: 1px solid rgba(232,123,26,0.18);">
        <strong style="display:block;margin-bottom:8px;color:#8a4c12;">Reviewer note</strong>
        <div style="color:#183153;">${paragraphizeHtml(followUpMessage)}</div>
      </div>
      <p style="margin: 0;">
        Please sign in to the member portal to review your application status.
      </p>
    `,
    ctaLabel: "Review Member Portal",
    ctaHref: input.memberPortalUrl,
    note: "Reply directly to this email if you need help clarifying the requested follow-up.",
  })

  return { subject, text, html }
}

export function createMagicLinkEmail(input: {
  recipientName?: string
  link: string
  scope: MagicLinkEmailScope
  expiresInMinutes: number
}) {
  const greeting = input.recipientName
    ? `Hello ${input.recipientName},`
    : "Hello,"
  const portalLabel =
    input.scope === "ADMIN" ? "admin dashboard" : "member profile"
  const buttonLabel =
    input.scope === "ADMIN" ? "Open Admin Dashboard" : "Open Member Profile"
  const subject =
    input.scope === "ADMIN"
      ? "Your PNGOSWA admin access link"
      : "Your PNGOSWA member access link"
  const text = `${greeting}

Use the secure link below to open your PNGOSWA ${portalLabel}:
${input.link}

This link expires in ${input.expiresInMinutes} minutes.

If you did not request this email, you can safely ignore it.

Regards,
PNGOSWA`

  const html = wrapEmailTemplate({
    preheader: `Your secure PNGOSWA ${portalLabel} link is ready.`,
    eyebrow:
      input.scope === "ADMIN"
        ? "PNGOSWA Admin Access"
        : "PNGOSWA Member Access",
    title:
      input.scope === "ADMIN" ? "Admin Sign-In Link" : "Member Sign-In Link",
    intro: `Use the secure link below to open your PNGOSWA ${portalLabel}.`,
    bodyHtml: `
      <p style="margin: 0 0 16px;">${escapeHtml(greeting)}</p>
      <p style="margin: 0 0 16px;">
        Use the secure link below to open your PNGOSWA ${escapeHtml(portalLabel)}.
      </p>
      <p style="margin: 0;">
        This link expires in ${input.expiresInMinutes} minutes.
      </p>
    `,
    ctaLabel: buttonLabel,
    ctaHref: input.link,
    note: "If you did not request this email, you can safely ignore it.",
  })

  return { subject, text, html }
}

export async function sendTransactionalEmail(
  input: TransactionalEmailInput
): Promise<TransactionalEmailResult> {
  const apiKey = process.env.RESEND_API_KEY
  const from = getDefaultFromEmail()
  const replyTo = getReplyToEmail()

  if (!apiKey) {
    return {
      ok: false,
      error: "Email delivery is not configured. Set RESEND_API_KEY.",
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
      reply_to: replyTo,
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

export function getDefaultMemberPortalUrl() {
  return getMemberPortalUrl()
}
