import { createHash, randomBytes } from "node:crypto"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { findAdminUserByEmail } from "@/lib/auth/admin-access"
import {
  getDatabaseUnavailableMessage,
  isDatabaseConnectionError,
  prisma,
} from "@/lib/db"
import {
  createEmailPreview,
  createMagicLinkEmail,
  sendTransactionalEmail,
} from "@/lib/email"
import { getSiteUrl } from "@/lib/site-url"

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

const portalConfig: Record<
  PortalScope,
  {
    cookieName: string
    loginPath: string
    redirectPath: string
    genericSuccessMessage: string
    sessionTtlMs: number
  }
> = {
  ADMIN: {
    cookieName: "pngoswa_admin_session",
    loginPath: "/admin/login",
    redirectPath: "/admin/dashboard",
    genericSuccessMessage:
      "If this email is authorized, a secure admin sign-in link will arrive shortly.",
    sessionTtlMs: 12 * 60 * 60 * 1000,
  },
  MEMBER: {
    cookieName: "pngoswa_member_session",
    loginPath: "/member/login",
    redirectPath: "/member/profile",
    genericSuccessMessage:
      "If this email is registered, a secure member sign-in link will arrive shortly.",
    sessionTtlMs: 3 * 24 * 60 * 60 * 1000,
  },
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex")
}

function getPortalCookieDomain() {
  if (process.env.NODE_ENV !== "production") {
    return undefined
  }

  try {
    const hostname = new URL(getSiteUrl()).hostname.toLowerCase()

    if (hostname === "pngoswa.org" || hostname.endsWith(".pngoswa.org")) {
      return ".pngoswa.org"
    }
  } catch {
    return undefined
  }

  return undefined
}

function buildPortalCookieOptions(expiresAt: Date) {
  const domain = getPortalCookieDomain()

  return {
    ...(domain ? { domain } : {}),
    expires: expiresAt,
    httpOnly: true,
    path: "/",
    sameSite: "strict" as const,
    secure: process.env.NODE_ENV === "production",
  }
}

function buildExpiredPortalCookieOptions() {
  const domain = getPortalCookieDomain()

  return {
    ...(domain ? { domain } : {}),
    expires: new Date(0),
    httpOnly: true,
    path: "/",
    sameSite: "strict" as const,
    secure: process.env.NODE_ENV === "production",
  }
}

async function clearPortalSessionCookie(scope: PortalScope) {
  const cookieStore = await cookies()
  const expiredOptions = buildExpiredPortalCookieOptions()

  cookieStore.set(portalConfig[scope].cookieName, "", {
    ...expiredOptions,
  })

  cookieStore.delete(portalConfig[scope].cookieName)
}

export function isDevelopmentAuthBypassEnabled() {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.DEV_AUTH_BYPASS === "true"
  )
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
  const expiresAt = new Date(Date.now() + portalConfig[scope].sessionTtlMs)

  await prisma.authSession.deleteMany({
    where: {
      ...(scope === "ADMIN"
        ? {
            userId,
            scope,
          }
        : {
            expiresAt: {
              lte: new Date(),
            },
          }),
    },
  })

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
      if (resolved.message === getDatabaseUnavailableMessage()) {
        return {
          ok: false as const,
          message: resolved.message,
        }
      }

      return {
        ok: true as const,
        emailSent: false,
        message: config.genericSuccessMessage,
        debugUrl: undefined,
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
      expiresInMinutes: MAGIC_LINK_TTL_MINUTES,
    })
    const emailResult = await sendTransactionalEmail({
      to: email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    })

    await prisma.$transaction([
      prisma.magicLinkToken.updateMany({
        where: {
          email,
          scope: input.scope,
          usedAt: null,
        },
        data: {
          usedAt: new Date(),
        },
      }),
      prisma.magicLinkToken.create({
        data: {
          email,
          tokenHash,
          scope: input.scope,
          redirectPath: config.redirectPath,
          expiresAt,
          userId: user.id,
          applicationId: input.applicationId ?? resolved.applicationId,
        },
      }),
      prisma.communicationLog.create({
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
      }),
    ])

    if (!emailResult.ok) {
      return {
        ok: false as const,
        message:
          process.env.NODE_ENV === "production"
            ? "We couldn't send your sign-in email right now. Please contact support or try again after the email sender configuration is fixed."
            : `We couldn't send your sign-in email: ${emailResult.error}`,
      }
    }

    return {
      ok: true as const,
      emailSent: true,
      message: "A secure sign-in link has been sent to your email.",
      debugUrl: undefined,
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
  try {
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
      orderBy: {
        createdAt: "desc",
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
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      return null
    }

    throw error
  }
}

export async function setPortalSessionCookie(
  scope: PortalScope,
  rawSessionToken: string,
  expiresAt: Date
) {
  await clearPortalSessionCookie(scope)

  const cookieStore = await cookies()

  cookieStore.set(
    portalConfig[scope].cookieName,
    rawSessionToken,
    buildPortalCookieOptions(expiresAt)
  )
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

  await clearPortalSessionCookie(scope)
}
