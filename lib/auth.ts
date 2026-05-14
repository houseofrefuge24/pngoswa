import { createHash, randomBytes } from "node:crypto"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { findAdminUserByEmail } from "@/lib/auth/admin-access"
import {
  getDatabaseUnavailableMessage,
  isDatabaseConnectionError,
  prisma,
} from "@/lib/db"
import { createEmailPreview, sendTransactionalEmail } from "@/lib/email"

type PortalScope = "ADMIN" | "MEMBER"

type RequestMagicLinkInput = {
  email: string
  scope: PortalScope
  applicationId?: string
  userId?: string
  recipientName?: string
}

type PortalSession = {
  user: {
    id: string
    email: string
    name: string | null
    role: "ADMIN" | "MEMBER"
  }
  sessionId: string
}

type ResolvePortalUserResult =
  | {
      ok: true
      user: {
        id: string
        email: string
        name: string | null
        role: "ADMIN" | "MEMBER"
      }
      applicationId?: string
    }
  | {
      ok: false
      message: string
    }

const MAGIC_LINK_TTL_MINUTES = 30
const SESSION_TTL_DAYS = 7

const portalConfig: Record<
  PortalScope,
  { cookieName: string; loginPath: string; redirectPath: string }
> = {
  ADMIN: {
    cookieName: "pngoswa_admin_session",
    loginPath: "/admin/login",
    redirectPath: "/admin/dashboard",
  },
  MEMBER: {
    cookieName: "pngoswa_member_session",
    loginPath: "/member/login",
    redirectPath: "/member/profile",
  },
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex")
}

function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(
    /\/$/,
    ""
  )
}

export function isDevelopmentAuthBypassEnabled() {
  return (
    process.env.DEV_AUTH_BYPASS === "true" ||
    process.env.NODE_ENV !== "production"
  )
}

function createMagicLinkEmail(params: {
  recipientName?: string
  link: string
  scope: PortalScope
}) {
  const greeting = params.recipientName
    ? `Hello ${params.recipientName},`
    : "Hello,"
  const portalLabel =
    params.scope === "ADMIN" ? "admin dashboard" : "member profile"
  const subject =
    params.scope === "ADMIN"
      ? "Your PNGOSWA admin access link"
      : "Your PNGOSWA member access link"
  const text = `${greeting}

Use the secure link below to open your PNGOSWA ${portalLabel}:
${params.link}

This link will expire in ${MAGIC_LINK_TTL_MINUTES} minutes. If you did not request this email, you can ignore it.`
  const html = `
    <div style="font-family: Georgia, serif; line-height: 1.7; color: #183153;">
      <p>${greeting}</p>
      <p>Use the secure button below to open your PNGOSWA ${portalLabel}.</p>
      <p style="margin: 24px 0;">
        <a href="${params.link}" style="display: inline-block; padding: 12px 18px; border-radius: 12px; background: #c41e3a; color: #ffffff; text-decoration: none; font-weight: 700;">
          Open ${params.scope === "ADMIN" ? "Admin Dashboard" : "Member Profile"}
        </a>
      </p>
      <p style="font-size: 14px; color: #51627f;">This link expires in ${MAGIC_LINK_TTL_MINUTES} minutes.</p>
      <p style="font-size: 14px; color: #51627f;">If you did not request this email, you can safely ignore it.</p>
    </div>
  `

  return { subject, text, html }
}

async function resolvePortalUser(
  emailInput: string,
  scope: PortalScope
): Promise<ResolvePortalUserResult> {
  const email = normalizeEmail(emailInput)

  if (!email) {
    return {
      ok: false,
      message: "Please enter an email address.",
    }
  }

  try {
    const user =
      scope === "ADMIN"
        ? await findAdminUserByEmail(email)
        : await prisma.user.findUnique({
            where: { email },
          })

    if (!user) {
      return {
        ok: false,
        message:
          scope === "ADMIN"
            ? "This email is not authorized for admin access."
            : "No membership record was found for this email yet.",
      }
    }

    const application =
      scope === "MEMBER"
        ? await prisma.membershipApplication.findFirst({
            where: {
              userId: user.id,
            },
            orderBy: {
              createdAt: "desc",
            },
          })
        : null

    if (scope === "MEMBER" && !application) {
      return {
        ok: false,
        message: "No membership application is linked to this email yet.",
      }
    }

    return {
      ok: true,
      user,
      applicationId: application?.id,
    }
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      return {
        ok: false,
        message: getDatabaseUnavailableMessage(),
      }
    }

    throw error
  }
}

async function createPortalSessionRecord(scope: PortalScope, userId: string) {
  const rawSessionToken = randomBytes(32).toString("hex")
  const sessionTokenHash = hashToken(rawSessionToken)
  const expiresAt = new Date(
    Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000
  )

  await prisma.authSession.create({
    data: {
      sessionTokenHash,
      scope,
      expiresAt,
      userId,
    },
  })

  return {
    rawSessionToken,
    expiresAt,
  }
}

export function getPortalLoginPath(scope: PortalScope) {
  return portalConfig[scope].loginPath
}

export async function requestMagicLink(input: RequestMagicLinkInput) {
  try {
    const email = normalizeEmail(input.email)
    const config = portalConfig[input.scope]
    const resolved = await resolvePortalUser(email, input.scope)

    if (!resolved.ok) {
      return {
        ok: false as const,
        message: resolved.message,
      }
    }

    const user = resolved.user

    const rawToken = randomBytes(32).toString("hex")
    const tokenHash = hashToken(rawToken)
    const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MINUTES * 60 * 1000)
    const link = `${getSiteUrl()}/auth/verify?token=${rawToken}&scope=${input.scope.toLowerCase()}`
    const emailContent = createMagicLinkEmail({
      recipientName: input.recipientName ?? user.name ?? undefined,
      link,
      scope: input.scope,
    })
    const emailResult = await sendTransactionalEmail({
      to: email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    })

    await prisma.magicLinkToken.create({
      data: {
        email,
        tokenHash,
        scope: input.scope,
        redirectPath: config.redirectPath,
        expiresAt,
        userId: user.id,
        applicationId: input.applicationId ?? resolved.applicationId,
      },
    })

    await prisma.communicationLog.create({
      data: {
        applicationId: input.applicationId ?? resolved.applicationId,
        userId: user.id,
        kind: "MAGIC_LINK",
        status: emailResult.ok ? "SENT" : "FAILED",
        recipientEmail: email,
        subject: emailContent.subject,
        previewText: createEmailPreview(emailContent.text),
        errorMessage: emailResult.ok ? null : emailResult.error,
        sentAt: emailResult.ok ? new Date() : null,
      },
    })

    return {
      ok: true as const,
      emailSent: emailResult.ok,
      message: emailResult.ok
        ? "A secure sign-in link has been sent to your email."
        : "Your access link was created, but email delivery is not configured yet.",
      debugUrl:
        !emailResult.ok && process.env.NODE_ENV !== "production"
          ? link
          : undefined,
    }
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      return {
        ok: false as const,
        message: getDatabaseUnavailableMessage(),
      }
    }

    throw error
  }
}

export async function signInForDevelopment(
  scope: PortalScope,
  emailInput: string
): Promise<
  { ok: true; redirectPath: string } | { ok: false; message: string }
> {
  try {
    const resolved = await resolvePortalUser(emailInput, scope)

    if (!resolved.ok) {
      return resolved
    }

    const session = await createPortalSessionRecord(scope, resolved.user.id)
    await setPortalSessionCookie(
      scope,
      session.rawSessionToken,
      session.expiresAt
    )

    return {
      ok: true,
      redirectPath: portalConfig[scope].redirectPath,
    }
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      return {
        ok: false,
        message: getDatabaseUnavailableMessage(),
      }
    }

    throw error
  }
}

export async function consumeMagicLink(rawToken: string, scope: PortalScope) {
  const tokenHash = hashToken(rawToken)
  const magicLink = await prisma.magicLinkToken.findFirst({
    where: {
      tokenHash,
      scope,
      usedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
    include: {
      user: true,
    },
  })

  if (!magicLink || !magicLink.user) {
    return null
  }
  const session = await createPortalSessionRecord(scope, magicLink.user.id)

  await prisma.$transaction([
    prisma.magicLinkToken.update({
      where: { id: magicLink.id },
      data: {
        usedAt: new Date(),
      },
    }),
  ])

  return {
    redirectPath: magicLink.redirectPath,
    rawSessionToken: session.rawSessionToken,
    expiresAt: session.expiresAt,
  }
}

export async function setPortalSessionCookie(
  scope: PortalScope,
  rawSessionToken: string,
  expiresAt: Date
) {
  const cookieStore = await cookies()

  cookieStore.set(portalConfig[scope].cookieName, rawSessionToken, {
    expires: expiresAt,
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  })
}

export async function getCurrentPortalSession(
  scope: PortalScope
): Promise<PortalSession | null> {
  const cookieStore = await cookies()
  const rawSessionToken = cookieStore.get(portalConfig[scope].cookieName)?.value

  if (!rawSessionToken) {
    return null
  }

  try {
    const session = await prisma.authSession.findFirst({
      where: {
        sessionTokenHash: hashToken(rawSessionToken),
        scope,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: true,
      },
    })

    if (!session) {
      return null
    }

    if (scope === "ADMIN" && session.user.role !== "ADMIN") {
      return null
    }

    return {
      sessionId: session.id,
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: session.user.role,
      },
    }
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      console.error(
        "Failed to load portal session because the database is unavailable."
      )
      return null
    }

    throw error
  }
}

export async function requirePortalSession(scope: PortalScope) {
  const session = await getCurrentPortalSession(scope)

  if (!session) {
    redirect(portalConfig[scope].loginPath)
  }

  return session
}

export async function logoutPortalSession(scope: PortalScope) {
  const cookieStore = await cookies()
  const rawSessionToken = cookieStore.get(portalConfig[scope].cookieName)?.value

  if (rawSessionToken) {
    try {
      await prisma.authSession.deleteMany({
        where: {
          sessionTokenHash: hashToken(rawSessionToken),
          scope,
        },
      })
    } catch (error) {
      if (!isDatabaseConnectionError(error)) {
        throw error
      }
    }
  }

  cookieStore.delete(portalConfig[scope].cookieName)
}
