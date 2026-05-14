import "dotenv/config"

import { randomUUID } from "node:crypto"

import { Pool } from "pg"

function getConfiguredAdminEmails() {
  return Array.from(
    new Set(
      (process.env.ADMIN_EMAILS ?? "")
        .split(/[\s,;]+/)
        .map((entry) => entry.trim().toLowerCase())
        .filter(Boolean)
    )
  )
}

function resolveConnectionString() {
  const rawUrl = process.env.DATABASE_URL

  if (!rawUrl) {
    throw new Error("DATABASE_URL is required to sync admin accounts.")
  }

  if (!rawUrl.startsWith("prisma+postgres://")) {
    return rawUrl
  }

  const url = new URL(rawUrl)
  const apiKey = url.searchParams.get("api_key")

  if (!apiKey) {
    throw new Error(
      "DATABASE_URL is using prisma+postgres but does not include an api_key."
    )
  }

  const decoded = Buffer.from(apiKey, "base64url").toString("utf8")
  const payload = JSON.parse(decoded) as { databaseUrl?: string }

  if (!payload.databaseUrl) {
    throw new Error("Missing databaseUrl in Prisma Postgres api_key payload.")
  }

  return payload.databaseUrl
}

const pool = new Pool({
  connectionString: resolveConnectionString(),
})

async function main() {
  const adminEmails = getConfiguredAdminEmails()

  if (adminEmails.length === 0) {
    console.log("No admin emails found in ADMIN_EMAILS. Nothing to sync.")
    return
  }

  console.log(`Syncing ${adminEmails.length} admin account(s)...`)

  for (const email of adminEmails) {
    const existingUserResult = await pool.query<{
      id: string
      role: "ADMIN" | "MEMBER"
    }>("select id, role from \"User\" where email = $1 limit 1", [email])

    const existingUser = existingUserResult.rows[0]

    if (!existingUser) {
      await pool.query(
        "insert into \"User\" (id, email, role, \"createdAt\", \"updatedAt\") values ($1, $2, 'ADMIN', now(), now())",
        [randomUUID(), email]
      )
      console.log(`Created admin user: ${email}`)
      continue
    }

    if (existingUser.role !== "ADMIN") {
      await pool.query(
        "update \"User\" set role = 'ADMIN', \"updatedAt\" = now() where id = $1",
        [existingUser.id]
      )
      console.log(`Promoted user to admin: ${email}`)
      continue
    }

    console.log(`Admin already up to date: ${email}`)
  }
}

main()
  .catch((error) => {
    console.error("Failed to sync admin accounts.")
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await pool.end()
  })
