import { PrismaPg } from "@prisma/adapter-pg"

import { PrismaClient } from "@/lib/generated/prisma/client"

const globalForDatabase = globalThis as typeof globalThis & {
  prisma?: PrismaClient
}

function normalizeConnectionString(connectionString: string) {
  try {
    const url = new URL(connectionString)

    if (
      (url.protocol === "postgres:" || url.protocol === "postgresql:") &&
      (url.searchParams.get("connect_timeout") === "0" ||
        !url.searchParams.has("connect_timeout"))
    ) {
      // Fail faster in development when the local database process is down.
      url.searchParams.set("connect_timeout", "5")
    }

    return url.toString()
  } catch {
    return connectionString
  }
}

function resolveConnectionString() {
  const rawUrl = process.env.DATABASE_URL

  if (!rawUrl) {
    throw new Error("DATABASE_URL is required to initialize Prisma.")
  }

  if (!rawUrl.startsWith("prisma+postgres://")) {
    return normalizeConnectionString(rawUrl)
  }

  const url = new URL(rawUrl)
  const apiKey = url.searchParams.get("api_key")

  if (!apiKey) {
    throw new Error(
      "DATABASE_URL is using prisma+postgres but does not include an api_key."
    )
  }

  try {
    const decoded = Buffer.from(apiKey, "base64url").toString("utf8")
    const payload = JSON.parse(decoded) as { databaseUrl?: string }

    if (!payload.databaseUrl) {
      throw new Error("Missing databaseUrl in Prisma Postgres api_key payload.")
    }

    return normalizeConnectionString(payload.databaseUrl)
  } catch (error) {
    throw new Error(
      `Failed to decode prisma+postgres DATABASE_URL for runtime access: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    )
  }
}

function createDatabaseClient() {
  const adapter = new PrismaPg(resolveConnectionString(), {
    onConnectionError(error) {
      console.error("Prisma PG connection error:", error)
    },
    onPoolError(error) {
      console.error("Prisma PG pool error:", error)
    },
  })

  return new PrismaClient({
    adapter,
  })
}

export function isDatabaseConnectionError(error: unknown) {
  if (!(error instanceof Error)) {
    return false
  }

  const maybeCode =
    typeof error === "object" && error && "code" in error
      ? String(error.code)
      : ""

  return (
    maybeCode === "ECONNREFUSED" ||
    maybeCode === "ECONNRESET" ||
    maybeCode === "ETIMEDOUT" ||
    maybeCode === "EPIPE" ||
    maybeCode === "ENOTFOUND" ||
    maybeCode === "P1001" ||
    error.message.includes("ECONNREFUSED") ||
    error.message.includes("Can't reach database server") ||
    error.message.includes("Connection terminated unexpectedly") ||
    error.message.includes("server closed the connection unexpectedly") ||
    error.message.includes("timeout expired") ||
    error.message.includes("connect ETIMEDOUT") ||
    error.message.includes("connect ECONNRESET")
  )
}

export function getDatabaseUnavailableMessage() {
  return "The database is unavailable right now. Start your local Postgres/Prisma database or update DATABASE_URL, then try again."
}

export const prisma = globalForDatabase.prisma ?? createDatabaseClient()

if (process.env.NODE_ENV !== "production") {
  globalForDatabase.prisma = prisma
}
