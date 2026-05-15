const PRODUCTION_SITE_URL = "https://www.pngoswa.org"
const LOCAL_SITE_URL = "http://localhost:3000"

function normalizeSiteUrl(value: string) {
  return value.replace(/\/$/, "")
}

function isInternalHostname(hostname: string) {
  const normalized = hostname.trim().toLowerCase()

  if (
    normalized === "localhost" ||
    normalized === "0.0.0.0" ||
    normalized === "127.0.0.1" ||
    normalized === "::1"
  ) {
    return true
  }

  return (
    normalized.startsWith("10.") ||
    normalized.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(normalized)
  )
}

function resolveConfiguredSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL

  if (!configured) {
    return process.env.NODE_ENV === "production"
      ? PRODUCTION_SITE_URL
      : LOCAL_SITE_URL
  }

  try {
    const normalized = normalizeSiteUrl(configured)
    const url = new URL(normalized)

    if (process.env.NODE_ENV === "production") {
      if (isInternalHostname(url.hostname)) {
        return PRODUCTION_SITE_URL
      }

      if (
        url.hostname.toLowerCase() === "pngoswa.org" ||
        url.hostname.toLowerCase() === "www.pngoswa.org"
      ) {
        return PRODUCTION_SITE_URL
      }
    }

    return normalized
  } catch {
    return process.env.NODE_ENV === "production"
      ? PRODUCTION_SITE_URL
      : LOCAL_SITE_URL
  }
}

export function getSiteUrl() {
  return normalizeSiteUrl(resolveConfiguredSiteUrl())
}

export { PRODUCTION_SITE_URL }
