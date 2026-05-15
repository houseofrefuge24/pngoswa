const PRODUCTION_SITE_URL = "https://www.pngoswa.org"
const LOCAL_SITE_URL = "http://localhost:3000"

function normalizeSiteUrl(value: string) {
  return value.replace(/\/$/, "")
}

export function getSiteUrl() {
  return normalizeSiteUrl(
    process.env.NEXT_PUBLIC_SITE_URL ??
      (process.env.NODE_ENV === "production"
        ? PRODUCTION_SITE_URL
        : LOCAL_SITE_URL)
  )
}

export { PRODUCTION_SITE_URL }
