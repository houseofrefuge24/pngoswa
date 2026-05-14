import { getCurrentPortalSession } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { readStoredFile } from "@/lib/storage"

export async function GET(
  _request: Request,
  context: { params: Promise<{ documentId: string }> }
) {
  const { documentId } = await context.params
  const [adminSession, memberSession] = await Promise.all([
    getCurrentPortalSession("ADMIN"),
    getCurrentPortalSession("MEMBER"),
  ])

  if (!adminSession && !memberSession) {
    return new Response("Unauthorized", { status: 401 })
  }

  const document = await prisma.membershipDocument.findUnique({
    where: {
      id: documentId,
    },
    include: {
      application: true,
    },
  })

  if (!document) {
    return new Response("Document not found", { status: 404 })
  }

  if (
    !adminSession &&
    memberSession &&
    document.application.userId !== memberSession.user.id
  ) {
    return new Response("Forbidden", { status: 403 })
  }

  if (/^https?:\/\//.test(document.storagePath)) {
    return Response.redirect(document.storagePath, 307)
  }

  const fileBuffer = await readStoredFile(document.storagePath)

  return new Response(fileBuffer, {
    status: 200,
    headers: {
      "Content-Disposition": `inline; filename="${document.originalName}"`,
      "Content-Type": document.mimeType,
      "Content-Length": String(document.sizeBytes),
    },
  })
}
