import { consumeMagicLink, setPortalSessionCookie } from "@/lib/auth"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const rawToken = url.searchParams.get("token")
  const rawScope = url.searchParams.get("scope")
  const scope = rawScope === "admin" ? "ADMIN" : rawScope === "member" ? "MEMBER" : null

  if (!rawToken || !scope) {
    return Response.redirect(new URL("/", request.url))
  }

  const session = await consumeMagicLink(rawToken, scope)

  if (!session) {
    return Response.redirect(
      new URL(scope === "ADMIN" ? "/admin/login?invalid=1" : "/member/login?invalid=1", request.url)
    )
  }

  await setPortalSessionCookie(scope, session.rawSessionToken, session.expiresAt)

  return Response.redirect(new URL(session.redirectPath, request.url))
}
