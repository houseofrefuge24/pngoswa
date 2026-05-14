import { createUploadthing, type FileRouter } from "uploadthing/next"

const f = createUploadthing()

export const uploadRouter = {
  membershipDocument: f({
    image: {
      maxFileSize: "8MB",
      maxFileCount: 1,
    },
    pdf: {
      maxFileSize: "8MB",
      maxFileCount: 1,
    },
  })
    .middleware(() => ({
      source: "membership-application",
    }))
    .onUploadComplete(async ({ file }) => ({
      key: file.key,
      ufsUrl: file.ufsUrl,
    })),
  membershipPhoto: f({
    image: {
      maxFileSize: "8MB",
      maxFileCount: 1,
    },
  })
    .middleware(() => ({
      source: "membership-application",
    }))
    .onUploadComplete(async ({ file }) => ({
      key: file.key,
      ufsUrl: file.ufsUrl,
    })),
} satisfies FileRouter

export type UploadRouter = typeof uploadRouter
