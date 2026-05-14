"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import {
  isDevelopmentAuthBypassEnabled,
  logoutPortalSession,
  requestMagicLink,
  requirePortalSession,
  signInForDevelopment,
} from "@/lib/auth"
import { prisma } from "@/lib/db"
import { createEmailPreview, sendTransactionalEmail } from "@/lib/email"

import type { MagicLinkFormState } from "@/components/portal/magic-link-request-form"

export async function requestAdminMagicLink(
  _state: MagicLinkFormState,
  formData: FormData
): Promise<MagicLinkFormState> {
  const email = String(formData.get("email") ?? "")

  if (isDevelopmentAuthBypassEnabled()) {
    const result = await signInForDevelopment("ADMIN", email)

    if (!result.ok) {
      return {
        error: result.message,
      }
    }

    redirect(result.redirectPath)
  }

  const result = await requestMagicLink({
    email,
    scope: "ADMIN",
  })

  if (!result.ok) {
    return {
      error: result.message,
    }
  }

  return {
    success: result.message,
    debugUrl: result.debugUrl,
  }
}

export async function logoutAdmin() {
  await logoutPortalSession("ADMIN")
  redirect("/admin/login")
}

export async function reviewMembershipAction(formData: FormData) {
  const session = await requirePortalSession("ADMIN")
  const applicationId = String(formData.get("applicationId") ?? "")
  const action = String(formData.get("action") ?? "")
  const subject = String(formData.get("subject") ?? "").trim()
  const message = String(formData.get("message") ?? "").trim()

  if (!applicationId) {
    redirect("/admin/dashboard")
  }

  const application = await prisma.membershipApplication.findUnique({
    where: { id: applicationId },
    include: {
      user: true,
    },
  })

  if (!application) {
    redirect("/admin/dashboard")
  }

  let updates:
    | {
        status: "APPROVED"
        approvedAt: Date
        rejectedAt: null
        followUpMessage: null
      }
    | {
        status: "REJECTED"
        rejectedAt: Date
        approvedAt: null
      }
    | {
        status: "FOLLOW_UP"
        followUpMessage: string
        lastFollowUpSentAt: Date
      }
  let reviewType: "FOLLOW_UP" | "APPROVED" | "REJECTED"
  let emailSubject = subject
  let emailBody = message
  let communicationKind: "FOLLOW_UP" | "STATUS_UPDATE"

  if (action === "approve") {
    reviewType = "APPROVED"
    communicationKind = "STATUS_UPDATE"
    updates = {
      status: "APPROVED",
      approvedAt: new Date(),
      rejectedAt: null,
      followUpMessage: null,
    }
    emailSubject ||= "Your PNGOSWA membership has been approved"
    emailBody ||= `Hello ${application.firstName},

Your PNGOSWA membership application (${application.applicationNumber}) has been approved.

You can use your member portal to review your current status anytime.

Welcome to PNGOSWA.`
  } else if (action === "reject") {
    reviewType = "REJECTED"
    communicationKind = "STATUS_UPDATE"
    updates = {
      status: "REJECTED",
      rejectedAt: new Date(),
      approvedAt: null,
    }
    emailSubject ||= "Update on your PNGOSWA membership application"
    emailBody ||= `Hello ${application.firstName},

Your PNGOSWA membership application (${application.applicationNumber}) was not approved at this time.

Please contact PNGOSWA if you need clarification on the decision.`
  } else {
    reviewType = "FOLLOW_UP"
    communicationKind = "FOLLOW_UP"
    updates = {
      status: "FOLLOW_UP",
      followUpMessage: message,
      lastFollowUpSentAt: new Date(),
    }
    emailSubject ||= "Additional information needed for your PNGOSWA application"
    emailBody ||= `Hello ${application.firstName},

PNGOSWA reviewed your membership application (${application.applicationNumber}) and needs additional information before we can proceed.

Please review the member portal and reply with the requested documents or clarifications.`
  }

  const emailHtml = `
    <div style="font-family: Georgia, serif; line-height: 1.7; color: #183153;">
      <p>Hello ${application.firstName},</p>
      ${emailBody
        .split("\n\n")
        .map((paragraph) => `<p>${paragraph.replace(/\n/g, "<br />")}</p>`)
        .join("")}
    </div>
  `

  const emailResult = await sendTransactionalEmail({
    to: application.email,
    subject: emailSubject,
    html: emailHtml,
    text: emailBody,
  })

  await prisma.$transaction([
    prisma.membershipApplication.update({
      where: { id: application.id },
      data: updates,
    }),
    prisma.membershipReviewAction.create({
      data: {
        applicationId: application.id,
        reviewerId: session.user.id,
        type: reviewType,
        subject: emailSubject,
        message,
      },
    }),
    prisma.communicationLog.create({
      data: {
        applicationId: application.id,
        userId: application.userId,
        kind: communicationKind,
        status: emailResult.ok ? "SENT" : "FAILED",
        recipientEmail: application.email,
        subject: emailSubject,
        previewText: createEmailPreview(emailBody),
        errorMessage: emailResult.ok ? null : emailResult.error,
        sentAt: emailResult.ok ? new Date() : null,
      },
    }),
  ])

  revalidatePath("/admin/dashboard")
  revalidatePath(`/admin/dashboard/applications/${application.id}`)
  revalidatePath("/member/profile")
  redirect(`/admin/dashboard/applications/${application.id}?updated=${action}`)
}
