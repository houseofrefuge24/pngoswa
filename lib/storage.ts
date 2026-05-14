import { mkdir, readFile, rm, writeFile } from "node:fs/promises"
import path from "node:path"

const STORAGE_ROOT = path.join(process.cwd(), "storage", "memberships")

export type StoredUpload = {
  originalName: string
  storedName: string
  storagePath: string
  mimeType: string
  sizeBytes: number
}

function sanitizeFileName(fileName: string) {
  return fileName
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]+/g, "-")
    .replace(/-+/g, "-")
}

function toSafeAbsolutePath(storagePath: string) {
  const absolutePath = path.resolve(STORAGE_ROOT, storagePath)
  const normalizedRoot = path.resolve(STORAGE_ROOT)

  if (!absolutePath.startsWith(normalizedRoot)) {
    throw new Error("Invalid storage path.")
  }

  return absolutePath
}

export async function saveUploadedFile(params: {
  applicationId: string
  file: File
  prefix: string
}): Promise<StoredUpload> {
  const extension = path.extname(params.file.name) || ".bin"
  const safeBaseName = sanitizeFileName(path.basename(params.file.name, extension))
  const safePrefix = sanitizeFileName(params.prefix)
  const storedName = `${Date.now()}-${safePrefix}-${safeBaseName}${extension}`
  const folderPath = path.join(STORAGE_ROOT, params.applicationId)
  const absolutePath = path.join(folderPath, storedName)
  const arrayBuffer = await params.file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  await mkdir(folderPath, { recursive: true })
  await writeFile(absolutePath, buffer)

  return {
    originalName: params.file.name,
    storedName,
    storagePath: path.relative(STORAGE_ROOT, absolutePath).replace(/\\/g, "/"),
    mimeType: params.file.type || "application/octet-stream",
    sizeBytes: buffer.byteLength,
  }
}

export async function readStoredFile(storagePath: string) {
  return readFile(toSafeAbsolutePath(storagePath))
}

export async function removeApplicationStorage(applicationId: string) {
  await rm(path.join(STORAGE_ROOT, applicationId), {
    force: true,
    recursive: true,
  })
}
