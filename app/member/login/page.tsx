import Link from "next/link"

import { logoutMember, requestMemberMagicLink } from "@/app/member/actions"
import { MagicLinkRequestForm } from "@/components/portal/magic-link-request-form"
import { getCurrentPortalSession, isDevelopmentAuthBypassEnabled } from "@/lib/auth"

export default async function MemberLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ invalid?: string }>
}) {
  const params = await searchParams
  const session = await getCurrentPortalSession("MEMBER")
  const isDevBypass = isDevelopmentAuthBypassEnabled()

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <span className="section-label">Member Portal</span>
        <h1 className="auth-title">Open your membership profile</h1>
        {session ? (
          <div className="form-feedback form-feedback-warning">
            <p>
              You are currently signed in as <strong>{session.user.email}</strong>.
            </p>
            <p>
              Requesting a new magic link will switch this browser to that member
              account after the new email link is opened.
            </p>
            <div className="auth-actions-row">
              <Link href="/member/profile" className="btn btn-outline">
                Back to profile
              </Link>
              <form action={logoutMember}>
                <button type="submit" className="btn btn-primary">
                  Sign out first
                </button>
              </form>
            </div>
          </div>
        ) : null}
        <MagicLinkRequestForm
          action={requestMemberMagicLink}
          description={
            isDevBypass
              ? "Enter the same email you used in your membership application. In development, you will be signed in directly without email."
              : "Enter the same email you used in your membership application. We will send a secure sign-in link so you can check your application status."
          }
          initialError={
            params.invalid === "1"
              ? "That member sign-in link is invalid, expired, or has already been used. Request a new access link below."
              : undefined
          }
          pendingLabel={
            isDevBypass ? "Signing in..." : "Sending member access link..."
          }
          submitLabel={
            isDevBypass ? "Sign in to member profile" : "Send member access link"
          }
        />
      </section>
    </main>
  )
}
