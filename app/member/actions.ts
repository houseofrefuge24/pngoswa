"use server"

import { redirect } from "next/navigation"

import {
  isDevelopmentAuthBypassEnabled,
  logoutPortalSession,
  requestMagicLink,
  signInForDevelopment,
} from "@/lib/auth"

import type { MagicLinkFormState } from "@/components/portal/magic-link-request-form"

export async function requestMemberMagicLink(
  _state: MagicLinkFormState,
  formData: FormData
): Promise<MagicLinkFormState> {
  const email = String(formData.get("email") ?? "")

  if (isDevelopmentAuthBypassEnabled()) {
    const result = await signInForDevelopment("MEMBER", email)

    if (!result.ok) {
      return {
        error: result.message,
      }
    }

    redirect(result.redirectPath)
  }

  const result = await requestMagicLink({
    email,
    scope: "MEMBER",
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

export async function logoutMember() {
  await logoutPortalSession("MEMBER")
  redirect("/member/login")
}
