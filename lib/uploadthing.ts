import { UTApi } from "uploadthing/server"

export const utapi = new UTApi()

export const allowedUploadThingDocumentMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
])

export const allowedUploadThingImageMimeTypes = new Set([
  "image/jpeg",
  "image/png",
])
