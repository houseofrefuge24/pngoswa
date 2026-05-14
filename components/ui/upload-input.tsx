"use client"

import { useRef, useState, type ChangeEvent } from "react"

import type { MembershipUploadedFile } from "@/lib/membership-form"
import { useUploadThing } from "@/lib/uploadthing-client"
import { cn, formatFileSize } from "@/lib/utils"

import { Field } from "./field"

type UploadInputProps = {
  id: string
  label: string
  hint?: string
  error?: string
  required?: boolean
  disabled?: boolean
  endpoint: "membershipDocument" | "membershipPhoto"
  accept: string
  allowedText: string
  value: MembershipUploadedFile | null
  onChange: (value: MembershipUploadedFile | null) => void
}

export function UploadInput({
  id,
  label,
  hint,
  error,
  required,
  disabled,
  endpoint,
  accept,
  allowedText,
  value,
  onChange,
}: UploadInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [localError, setLocalError] = useState<string | null>(null)
  const { startUpload, isUploading } = useUploadThing(endpoint, {
    onClientUploadComplete: (files) => {
      const uploadedFile = files[0]

      if (!uploadedFile) {
        setLocalError("Upload finished without returning a file.")
        return
      }

      setLocalError(null)
      onChange({
        key: uploadedFile.key,
        name: uploadedFile.name,
        size: uploadedFile.size,
        type: uploadedFile.type,
        ufsUrl: uploadedFile.ufsUrl,
      })
    },
    onUploadError: (uploadError) => {
      setLocalError(uploadError.message)
    },
  })

  const combinedError = error ?? localError ?? undefined

  const triggerFilePicker = () => {
    inputRef.current?.click()
  }

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])

    if (!files.length) {
      return
    }

    setLocalError(null)

    try {
      const uploadedFiles = await startUpload(files)

      if (!uploadedFiles?.length) {
        setLocalError("The selected file did not upload.")
      }
    } catch {
      // UploadThing surfaces the error through onUploadError.
    } finally {
      event.target.value = ""
    }
  }

  return (
    <Field
      htmlFor={id}
      label={label}
      hint={hint}
      required={required}
      error={combinedError}
    >
      <div
        className={cn(
          "upload-input-shell",
          value && "upload-input-shell-complete",
          combinedError && "upload-input-shell-invalid"
        )}
      >
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={accept}
          className="sr-only"
          disabled={disabled || isUploading}
          onChange={handleFileChange}
        />

        {value ? (
          <div className="upload-input-summary">
            <div>
              <strong>{value.name}</strong>
              <p>
                {formatFileSize(value.size)} · {value.type || "Uploaded file"}
              </p>
            </div>
            <div className="upload-input-actions">
              <a
                href={value.ufsUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn-outline upload-inline-btn"
              >
                Preview
              </a>
              <button
                type="button"
                className="btn btn-outline upload-inline-btn"
                disabled={disabled || isUploading}
                onClick={triggerFilePicker}
              >
                Replace
              </button>
              <button
                type="button"
                className="btn btn-outline upload-inline-btn"
                disabled={disabled || isUploading}
                onClick={() => onChange(null)}
              >
                Clear
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="upload-input-picker"
            disabled={disabled || isUploading}
            onClick={triggerFilePicker}
          >
            <strong>{isUploading ? "Uploading..." : "Choose a file"}</strong>
            <span>{allowedText}</span>
          </button>
        )}
      </div>
    </Field>
  )
}
