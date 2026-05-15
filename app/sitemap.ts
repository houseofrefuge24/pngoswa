import type { MetadataRoute } from "next"

import { getSiteUrl } from "@/lib/site-url"

const siteUrl = getSiteUrl()

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()

  return [
    {
      url: `${siteUrl}/`,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteUrl}/about`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/membership`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
  ]
}
