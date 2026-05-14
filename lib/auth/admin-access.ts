import { prisma } from "@/lib/db"

export function getConfiguredAdminEmails() {
  return Array.from(
    new Set(
      (process.env.ADMIN_EMAILS ?? "")
        .split(/[\s,;]+/)
        .map((entry) => entry.trim().toLowerCase())
        .filter(Boolean)
    )
  )
}

export async function findAdminUserByEmail(emailInput: string) {
  const email = emailInput.trim().toLowerCase()

  if (!email) {
    return null
  }

  return prisma.user.findFirst({
    where: {
      email,
      role: "ADMIN",
    },
  })
}
