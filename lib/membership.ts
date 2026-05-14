import { randomUUID } from "node:crypto"

import { requestMagicLink } from "@/lib/auth"
import { prisma } from "@/lib/db"
import type {
  MembershipApplicationFormValues,
  MembershipUploadedFile,
} from "@/lib/membership-form"
import {
  removeApplicationStorage,
  saveUploadedFile,
  type StoredUpload,
} from "@/lib/storage"
import {
  allowedUploadThingDocumentMimeTypes,
  allowedUploadThingImageMimeTypes,
  utapi,
} from "@/lib/uploadthing"

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024

const genderMap = {
  female: "FEMALE",
  male: "MALE",
  "non-binary": "NON_BINARY",
  "prefer-not-to-say": "PREFER_NOT_TO_SAY",
} as const

const civilStatusMap = {
  single: "SINGLE",
  married: "MARRIED",
  widowed: "WIDOWED",
  separated: "SEPARATED",
} as const

const employmentStatusMap = {
  regular: "REGULAR",
  contractual: "CONTRACTUAL",
  volunteer: "VOLUNTEER",
} as const

const paymentModeMap = {
  gcash: "GCASH",
  "bank-transfer": "BANK_TRANSFER",
  cash: "CASH",
  other: "OTHER",
} as const

const membershipTypeMap = {
  regular: "REGULAR",
  lifetime: "LIFETIME",
  honorary: "HONORARY",
} as const

const allowedDocumentMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
])

type FieldErrors = Record<string, string>

type ParsedApplicationInput = {
  firstName: string
  lastName: string
  middleName?: string
  gender: (typeof genderMap)[keyof typeof genderMap]
  dateOfBirth: Date
  civilStatus: (typeof civilStatusMap)[keyof typeof civilStatusMap]
  prcLicense?: string
  dateOfRegistration: Date
  contactNumber: string
  email: string
  region: string
  organization: string
  officeAddress: string
  position: string
  employmentStatus: (typeof employmentStatusMap)[keyof typeof employmentStatusMap]
  lengthOfService: string
  areaOfPractice: string
  degree: string
  school: string
  yearGraduated: string
  postgraduateStudies?: string
  specializations: string
  otherOrganizations?: string
  membershipType: (typeof membershipTypeMap)[keyof typeof membershipTypeMap]
  paymentMode: (typeof paymentModeMap)[keyof typeof paymentModeMap]
  isConventionAttendee: boolean
  agreedToPrivacy: boolean
}

type ParsedLegacyDocuments = {
  resumeUpload: File
  employmentProofUpload?: File
  prcLicenseUpload?: File
  endorsementUpload?: File
  certificateUpload?: File
  paymentProof: File
  photoUpload: File
}

type ParsedUploadedDocuments = {
  resumeUpload: MembershipUploadedFile
  employmentProofUpload?: MembershipUploadedFile
  prcLicenseUpload?: MembershipUploadedFile
  endorsementUpload?: MembershipUploadedFile
  certificateUpload?: MembershipUploadedFile
  paymentProof: MembershipUploadedFile
  photoUpload: MembershipUploadedFile
}

type ParsedMembershipApplication =
  | {
      ok: true
      source: "legacy"
      values: ParsedApplicationInput
      documents: ParsedLegacyDocuments
    }
  | {
      ok: true
      source: "uploadthing"
      values: ParsedApplicationInput
      documents: ParsedUploadedDocuments
    }
  | {
      ok: false
      errors: FieldErrors
    }

type MembershipDocumentTypeValue =
  | "RESUME"
  | "EMPLOYMENT_PROOF"
  | "PRC_LICENSE"
  | "ENDORSEMENT"
  | "ATTENDANCE_CERTIFICATE"
  | "PAYMENT_PROOF"
  | "ID_PHOTO"

type StoredMembershipDocument = StoredUpload & {
  type: MembershipDocumentTypeValue
  label: string
}

function readString(formData: FormData, fieldName: string) {
  const value = formData.get(fieldName)
  return typeof value === "string" ? value.trim() : ""
}

function readRequiredString(
  formData: FormData,
  fieldName: string,
  label: string,
  errors: FieldErrors
) {
  const value = readString(formData, fieldName)

  if (!value) {
    errors[fieldName] = `${label} is required.`
  }

  return value
}

function readDate(
  formData: FormData,
  fieldName: string,
  label: string,
  errors: FieldErrors
) {
  const value = readRequiredString(formData, fieldName, label, errors)
  const parsed = new Date(value)

  if (value && Number.isNaN(parsed.getTime())) {
    errors[fieldName] = `${label} is invalid.`
  }

  return parsed
}

function readEnumValue<TMap extends Record<string, string>>(
  formData: FormData,
  fieldName: string,
  label: string,
  mapper: TMap,
  errors: FieldErrors
) {
  const rawValue = readRequiredString(formData, fieldName, label, errors)
  const mappedValue = mapper[rawValue as keyof TMap]

  if (rawValue && !mappedValue) {
    errors[fieldName] = `${label} is invalid.`
  }

  return mappedValue
}

function readFile(
  formData: FormData,
  fieldName: string,
  label: string,
  errors: FieldErrors,
  required: boolean
) {
  const entry = formData.get(fieldName)

  if (!(entry instanceof File) || entry.size === 0) {
    if (required) {
      errors[fieldName] = `${label} is required.`
    }

    return undefined
  }

  if (entry.size > MAX_UPLOAD_BYTES) {
    errors[fieldName] = `${label} must be smaller than 8MB.`
    return undefined
  }

  if (entry.type && !allowedDocumentMimeTypes.has(entry.type)) {
    errors[fieldName] = `${label} must be a PDF, JPG, or PNG file.`
    return undefined
  }

  return entry
}

function validateEmail(email: string, errors: FieldErrors) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Please enter a valid email address."
  }
}

function validateYear(year: string, errors: FieldErrors) {
  if (!/^\d{4}$/.test(year)) {
    errors.yearGraduated = "Year graduated must be a 4-digit year."
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function readPayloadString(
  payload: Record<string, unknown>,
  fieldName: keyof MembershipApplicationFormValues | string
) {
  const value = payload[fieldName]
  return typeof value === "string" ? value.trim() : ""
}

function readPayloadRequiredString(
  payload: Record<string, unknown>,
  fieldName: keyof MembershipApplicationFormValues | string,
  label: string,
  errors: FieldErrors
) {
  const value = readPayloadString(payload, fieldName)

  if (!value) {
    errors[String(fieldName)] = `${label} is required.`
  }

  return value
}

function readPayloadDate(
  payload: Record<string, unknown>,
  fieldName: keyof MembershipApplicationFormValues | string,
  label: string,
  errors: FieldErrors
) {
  const value = readPayloadRequiredString(payload, fieldName, label, errors)
  const parsed = new Date(value)

  if (value && Number.isNaN(parsed.getTime())) {
    errors[String(fieldName)] = `${label} is invalid.`
  }

  return parsed
}

function readPayloadEnumValue<TMap extends Record<string, string>>(
  payload: Record<string, unknown>,
  fieldName: keyof MembershipApplicationFormValues | string,
  label: string,
  mapper: TMap,
  errors: FieldErrors
) {
  const rawValue = readPayloadRequiredString(payload, fieldName, label, errors)
  const mappedValue = mapper[rawValue as keyof TMap]

  if (rawValue && !mappedValue) {
    errors[String(fieldName)] = `${label} is invalid.`
  }

  return mappedValue
}

function readUploadedDocument(
  payload: Record<string, unknown>,
  fieldName: keyof MembershipApplicationFormValues,
  label: string,
  errors: FieldErrors,
  required: boolean,
  allowedMimeTypes: Set<string>
) {
  const entry = payload[fieldName]

  if (!isRecord(entry)) {
    if (required) {
      errors[fieldName] = `${label} is required.`
    }

    return undefined
  }

  const key = typeof entry.key === "string" ? entry.key : ""
  const name = typeof entry.name === "string" ? entry.name : ""
  const type = typeof entry.type === "string" ? entry.type : ""
  const ufsUrl = typeof entry.ufsUrl === "string" ? entry.ufsUrl : ""
  const size = typeof entry.size === "number" ? entry.size : NaN

  if (!key || !name || !type || !ufsUrl || !Number.isFinite(size)) {
    errors[fieldName] = `${label} is invalid. Please upload the file again.`
    return undefined
  }

  if (size > MAX_UPLOAD_BYTES) {
    errors[fieldName] = `${label} must be smaller than 8MB.`
    return undefined
  }

  if (!allowedMimeTypes.has(type)) {
    errors[fieldName] = `${label} must match the allowed file types.`
    return undefined
  }

  return {
    key,
    name,
    size,
    type,
    ufsUrl,
  } satisfies MembershipUploadedFile
}

function parseSharedValuesFromFormData(formData: FormData):
  | {
      ok: true
      values: ParsedApplicationInput
    }
  | {
      ok: false
      errors: FieldErrors
    } {
  const errors: FieldErrors = {}

  const values: ParsedApplicationInput = {
    firstName: readRequiredString(formData, "firstName", "First name", errors),
    lastName: readRequiredString(formData, "lastName", "Last name", errors),
    middleName: readString(formData, "middleName") || undefined,
    gender: readEnumValue(
      formData,
      "gender",
      "Sex / Gender",
      genderMap,
      errors
    )!,
    dateOfBirth: readDate(formData, "dateOfBirth", "Date of birth", errors),
    civilStatus: readEnumValue(
      formData,
      "civilStatus",
      "Civil status",
      civilStatusMap,
      errors
    )!,
    prcLicense: readString(formData, "prcLicense") || undefined,
    dateOfRegistration: readDate(
      formData,
      "dateOfRegistration",
      "Date of registration",
      errors
    ),
    contactNumber: readRequiredString(
      formData,
      "contactNumber",
      "Contact number",
      errors
    ),
    email: readRequiredString(
      formData,
      "email",
      "Email address",
      errors
    ).toLowerCase(),
    region: readRequiredString(formData, "region", "Region", errors),
    organization: readRequiredString(
      formData,
      "organization",
      "Organization / NGO",
      errors
    ),
    officeAddress: readRequiredString(
      formData,
      "officeAddress",
      "Office address",
      errors
    ),
    position: readRequiredString(
      formData,
      "position",
      "Position / Designation",
      errors
    ),
    employmentStatus: readEnumValue(
      formData,
      "employmentStatus",
      "Employment status",
      employmentStatusMap,
      errors
    )!,
    lengthOfService: readRequiredString(
      formData,
      "lengthOfService",
      "Length of service",
      errors
    ),
    areaOfPractice: readRequiredString(
      formData,
      "areaOfPractice",
      "Area of practice",
      errors
    ),
    degree: readRequiredString(formData, "degree", "Degree", errors),
    school: readRequiredString(
      formData,
      "school",
      "School / University",
      errors
    ),
    yearGraduated: readRequiredString(
      formData,
      "yearGraduated",
      "Year graduated",
      errors
    ),
    postgraduateStudies:
      readString(formData, "postgraduateStudies") || undefined,
    specializations: readRequiredString(
      formData,
      "specializations",
      "Areas of specialization",
      errors
    ),
    otherOrganizations: readString(formData, "otherOrganizations") || undefined,
    membershipType: readEnumValue(
      formData,
      "membershipType",
      "Membership type",
      membershipTypeMap,
      errors
    )!,
    paymentMode: readEnumValue(
      formData,
      "paymentMode",
      "Mode of payment",
      paymentModeMap,
      errors
    )!,
    isConventionAttendee:
      readRequiredString(
        formData,
        "isConventionAttendee",
        "Convention attendee selection",
        errors
      ) === "yes",
    agreedToPrivacy: readString(formData, "agreed") === "yes",
  }

  validateEmail(values.email, errors)
  validateYear(values.yearGraduated, errors)

  if (!values.agreedToPrivacy) {
    errors.agreed =
      "You must agree to the declaration and data privacy consent."
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors }
  }

  return { ok: true, values }
}

function parseSharedValuesFromPayload(payload: Record<string, unknown>):
  | {
      ok: true
      values: ParsedApplicationInput
    }
  | {
      ok: false
      errors: FieldErrors
    } {
  const errors: FieldErrors = {}

  const values: ParsedApplicationInput = {
    firstName: readPayloadRequiredString(
      payload,
      "firstName",
      "First name",
      errors
    ),
    lastName: readPayloadRequiredString(
      payload,
      "lastName",
      "Last name",
      errors
    ),
    middleName: readPayloadString(payload, "middleName") || undefined,
    gender: readPayloadEnumValue(
      payload,
      "gender",
      "Sex / Gender",
      genderMap,
      errors
    )!,
    dateOfBirth: readPayloadDate(
      payload,
      "dateOfBirth",
      "Date of birth",
      errors
    ),
    civilStatus: readPayloadEnumValue(
      payload,
      "civilStatus",
      "Civil status",
      civilStatusMap,
      errors
    )!,
    prcLicense: readPayloadString(payload, "prcLicense") || undefined,
    dateOfRegistration: readPayloadDate(
      payload,
      "dateOfRegistration",
      "Date of registration",
      errors
    ),
    contactNumber: readPayloadRequiredString(
      payload,
      "contactNumber",
      "Contact number",
      errors
    ),
    email: readPayloadRequiredString(
      payload,
      "email",
      "Email address",
      errors
    ).toLowerCase(),
    region: readPayloadRequiredString(payload, "region", "Region", errors),
    organization: readPayloadRequiredString(
      payload,
      "organization",
      "Organization / NGO",
      errors
    ),
    officeAddress: readPayloadRequiredString(
      payload,
      "officeAddress",
      "Office address",
      errors
    ),
    position: readPayloadRequiredString(
      payload,
      "position",
      "Position / Designation",
      errors
    ),
    employmentStatus: readPayloadEnumValue(
      payload,
      "employmentStatus",
      "Employment status",
      employmentStatusMap,
      errors
    )!,
    lengthOfService: readPayloadRequiredString(
      payload,
      "lengthOfService",
      "Length of service",
      errors
    ),
    areaOfPractice: readPayloadRequiredString(
      payload,
      "areaOfPractice",
      "Area of practice",
      errors
    ),
    degree: readPayloadRequiredString(payload, "degree", "Degree", errors),
    school: readPayloadRequiredString(
      payload,
      "school",
      "School / University",
      errors
    ),
    yearGraduated: readPayloadRequiredString(
      payload,
      "yearGraduated",
      "Year graduated",
      errors
    ),
    postgraduateStudies:
      readPayloadString(payload, "postgraduateStudies") || undefined,
    specializations: readPayloadRequiredString(
      payload,
      "specializations",
      "Areas of specialization",
      errors
    ),
    otherOrganizations:
      readPayloadString(payload, "otherOrganizations") || undefined,
    membershipType: readPayloadEnumValue(
      payload,
      "membershipType",
      "Membership type",
      membershipTypeMap,
      errors
    )!,
    paymentMode: readPayloadEnumValue(
      payload,
      "paymentMode",
      "Mode of payment",
      paymentModeMap,
      errors
    )!,
    isConventionAttendee:
      readPayloadRequiredString(
        payload,
        "isConventionAttendee",
        "Convention attendee selection",
        errors
      ) === "yes",
    agreedToPrivacy: payload.agreed === true,
  }

  validateEmail(values.email, errors)
  validateYear(values.yearGraduated, errors)

  if (!values.agreedToPrivacy) {
    errors.agreed =
      "You must agree to the declaration and data privacy consent."
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors }
  }

  return { ok: true, values }
}

function parseLegacyMembershipApplication(
  formData: FormData
): ParsedMembershipApplication {
  const parsedValues = parseSharedValuesFromFormData(formData)

  if (!parsedValues.ok) {
    return parsedValues
  }

  const errors: FieldErrors = {}
  const documents: ParsedLegacyDocuments = {
    resumeUpload: readFile(
      formData,
      "resumeUpload",
      "CV / Resume",
      errors,
      true
    )!,
    employmentProofUpload: readFile(
      formData,
      "employmentProofUpload",
      "Proof of employment or leadership role",
      errors,
      parsedValues.values.membershipType !== "HONORARY"
    ),
    prcLicenseUpload: readFile(
      formData,
      "prcLicenseUpload",
      "PRC license copy",
      errors,
      false
    ),
    endorsementUpload: readFile(
      formData,
      "endorsementUpload",
      "Recommendation / endorsement",
      errors,
      parsedValues.values.membershipType === "HONORARY"
    ),
    certificateUpload: readFile(
      formData,
      "certificateUpload",
      "Certificate of participation / attendance",
      errors,
      parsedValues.values.isConventionAttendee
    ),
    paymentProof: readFile(
      formData,
      "paymentProof",
      "Proof of payment",
      errors,
      true
    )!,
    photoUpload: readFile(formData, "photoUpload", "2x2 photo", errors, true)!,
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors }
  }

  return {
    ok: true,
    source: "legacy",
    values: parsedValues.values,
    documents,
  }
}

function parseUploadedMembershipApplication(
  payload: unknown
): ParsedMembershipApplication {
  if (!isRecord(payload)) {
    return {
      ok: false,
      errors: {
        form: "Invalid application payload.",
      },
    }
  }

  const parsedValues = parseSharedValuesFromPayload(payload)

  if (!parsedValues.ok) {
    return parsedValues
  }

  const errors: FieldErrors = {}
  const documents: ParsedUploadedDocuments = {
    resumeUpload: readUploadedDocument(
      payload,
      "resumeUpload",
      "CV / Resume",
      errors,
      true,
      allowedUploadThingDocumentMimeTypes
    )!,
    employmentProofUpload: readUploadedDocument(
      payload,
      "employmentProofUpload",
      "Proof of employment or leadership role",
      errors,
      parsedValues.values.membershipType !== "HONORARY",
      allowedUploadThingDocumentMimeTypes
    ),
    prcLicenseUpload: readUploadedDocument(
      payload,
      "prcLicenseUpload",
      "PRC license copy",
      errors,
      false,
      allowedUploadThingDocumentMimeTypes
    ),
    endorsementUpload: readUploadedDocument(
      payload,
      "endorsementUpload",
      "Recommendation / endorsement",
      errors,
      parsedValues.values.membershipType === "HONORARY",
      allowedUploadThingDocumentMimeTypes
    ),
    certificateUpload: readUploadedDocument(
      payload,
      "certificateUpload",
      "Certificate of participation / attendance",
      errors,
      parsedValues.values.isConventionAttendee,
      allowedUploadThingDocumentMimeTypes
    ),
    paymentProof: readUploadedDocument(
      payload,
      "paymentProof",
      "Proof of payment",
      errors,
      true,
      allowedUploadThingDocumentMimeTypes
    )!,
    photoUpload: readUploadedDocument(
      payload,
      "photoUpload",
      "2x2 photo",
      errors,
      true,
      allowedUploadThingImageMimeTypes
    )!,
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors }
  }

  return {
    ok: true,
    source: "uploadthing",
    values: parsedValues.values,
    documents,
  }
}

function buildApplicationNumber() {
  const year = new Date().getFullYear()
  return `PNGOSWA-${year}-${randomUUID().slice(0, 8).toUpperCase()}`
}

function getFullName(values: {
  firstName: string
  middleName?: string
  lastName: string
}) {
  return [values.firstName, values.middleName, values.lastName]
    .filter(Boolean)
    .join(" ")
}

function toStoredUpload(file: MembershipUploadedFile): StoredUpload {
  return {
    originalName: file.name,
    storedName: file.key,
    storagePath: file.ufsUrl,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: file.size,
  }
}

export function formatMembershipStatus(status: string) {
  switch (status) {
    case "PENDING":
      return "Pending Review"
    case "FOLLOW_UP":
      return "Follow Up Needed"
    case "APPROVED":
      return "Approved"
    case "REJECTED":
      return "Rejected"
    default:
      return status
  }
}

export function formatMembershipType(type: string) {
  switch (type) {
    case "REGULAR":
      return "Regular Member"
    case "LIFETIME":
      return "Lifetime Member"
    case "HONORARY":
      return "Honorary Member"
    default:
      return type
  }
}

export function formatPaymentMode(mode: string) {
  switch (mode) {
    case "BANK_TRANSFER":
      return "Bank Transfer"
    case "GCASH":
      return "GCash"
    default:
      return mode.charAt(0) + mode.slice(1).toLowerCase()
  }
}

export function getStatusTone(status: string) {
  switch (status) {
    case "APPROVED":
      return "success"
    case "FOLLOW_UP":
      return "warning"
    case "REJECTED":
      return "danger"
    default:
      return "info"
  }
}

export function getApplicationRequirementChecklist(application: {
  membershipType: string
  prcLicense: string | null
  isConventionAttendee: boolean
  documents: Array<{ type: string }>
}) {
  const uploaded = new Set(
    application.documents.map((document) => document.type)
  )

  return [
    {
      label: "CV / Resume",
      satisfied: uploaded.has("RESUME"),
    },
    {
      label: "Proof of employment or leadership role",
      satisfied:
        application.membershipType === "HONORARY" ||
        uploaded.has("EMPLOYMENT_PROOF"),
    },
    {
      label: "Recommendation / endorsement",
      satisfied:
        application.membershipType !== "HONORARY" ||
        uploaded.has("ENDORSEMENT"),
    },
    {
      label: "Certificate of participation / attendance",
      satisfied:
        !application.isConventionAttendee ||
        uploaded.has("ATTENDANCE_CERTIFICATE"),
    },
    {
      label: "Proof of payment",
      satisfied: uploaded.has("PAYMENT_PROOF"),
    },
    {
      label: "2x2 ID photo",
      satisfied: uploaded.has("ID_PHOTO"),
    },
    {
      label: "PRC license copy",
      satisfied:
        !application.prcLicense ||
        application.prcLicense.trim().length === 0 ||
        uploaded.has("PRC_LICENSE"),
      optional: !application.prcLicense,
    },
  ]
}

export async function createMembershipApplication(input: FormData | unknown) {
  const parsed =
    input instanceof FormData
      ? parseLegacyMembershipApplication(input)
      : parseUploadedMembershipApplication(input)

  if (!parsed.ok) {
    return {
      ok: false as const,
      status: 400,
      errors: parsed.errors,
    }
  }

  const applicationId = randomUUID()
  const applicationNumber = buildApplicationNumber()
  const fullName = getFullName(parsed.values)

  const user = await prisma.user.upsert({
    where: {
      email: parsed.values.email,
    },
    update: {
      name: fullName,
    },
    create: {
      email: parsed.values.email,
      name: fullName,
      role: "MEMBER",
    },
  })

  const storedDocuments: StoredMembershipDocument[] = []

  try {
    if (parsed.source === "legacy") {
      storedDocuments.push({
        ...(await saveUploadedFile({
          applicationId,
          file: parsed.documents.resumeUpload,
          prefix: "resume",
        })),
        type: "RESUME",
        label: "CV / Resume",
      })

      if (parsed.documents.employmentProofUpload) {
        storedDocuments.push({
          ...(await saveUploadedFile({
            applicationId,
            file: parsed.documents.employmentProofUpload,
            prefix: "employment-proof",
          })),
          type: "EMPLOYMENT_PROOF",
          label: "Proof of Employment / Leadership Role",
        })
      }

      if (parsed.documents.prcLicenseUpload) {
        storedDocuments.push({
          ...(await saveUploadedFile({
            applicationId,
            file: parsed.documents.prcLicenseUpload,
            prefix: "prc-license",
          })),
          type: "PRC_LICENSE",
          label: "PRC License Copy",
        })
      }

      if (parsed.documents.endorsementUpload) {
        storedDocuments.push({
          ...(await saveUploadedFile({
            applicationId,
            file: parsed.documents.endorsementUpload,
            prefix: "endorsement",
          })),
          type: "ENDORSEMENT",
          label: "Recommendation / Endorsement",
        })
      }

      if (parsed.documents.certificateUpload) {
        storedDocuments.push({
          ...(await saveUploadedFile({
            applicationId,
            file: parsed.documents.certificateUpload,
            prefix: "attendance-certificate",
          })),
          type: "ATTENDANCE_CERTIFICATE",
          label: "Attendance Certificate",
        })
      }

      storedDocuments.push({
        ...(await saveUploadedFile({
          applicationId,
          file: parsed.documents.paymentProof,
          prefix: "payment-proof",
        })),
        type: "PAYMENT_PROOF",
        label: "Proof of Payment",
      })

      storedDocuments.push({
        ...(await saveUploadedFile({
          applicationId,
          file: parsed.documents.photoUpload,
          prefix: "id-photo",
        })),
        type: "ID_PHOTO",
        label: "2x2 ID Photo",
      })
    } else {
      storedDocuments.push({
        ...toStoredUpload(parsed.documents.resumeUpload),
        type: "RESUME",
        label: "CV / Resume",
      })

      if (parsed.documents.employmentProofUpload) {
        storedDocuments.push({
          ...toStoredUpload(parsed.documents.employmentProofUpload),
          type: "EMPLOYMENT_PROOF",
          label: "Proof of Employment / Leadership Role",
        })
      }

      if (parsed.documents.prcLicenseUpload) {
        storedDocuments.push({
          ...toStoredUpload(parsed.documents.prcLicenseUpload),
          type: "PRC_LICENSE",
          label: "PRC License Copy",
        })
      }

      if (parsed.documents.endorsementUpload) {
        storedDocuments.push({
          ...toStoredUpload(parsed.documents.endorsementUpload),
          type: "ENDORSEMENT",
          label: "Recommendation / Endorsement",
        })
      }

      if (parsed.documents.certificateUpload) {
        storedDocuments.push({
          ...toStoredUpload(parsed.documents.certificateUpload),
          type: "ATTENDANCE_CERTIFICATE",
          label: "Attendance Certificate",
        })
      }

      storedDocuments.push({
        ...toStoredUpload(parsed.documents.paymentProof),
        type: "PAYMENT_PROOF",
        label: "Proof of Payment",
      })

      storedDocuments.push({
        ...toStoredUpload(parsed.documents.photoUpload),
        type: "ID_PHOTO",
        label: "2x2 ID Photo",
      })
    }

    await prisma.membershipApplication.create({
      data: {
        id: applicationId,
        applicationNumber,
        userId: user.id,
        status: "PENDING",
        ...parsed.values,
        documents: {
          create: storedDocuments,
        },
        reviewActions: {
          create: {
            reviewerId: null,
            type: "SUBMITTED",
            subject: "Application submitted",
            message: "Member submitted a new membership application.",
          },
        },
      },
    })
  } catch (error) {
    if (parsed.source === "legacy") {
      await removeApplicationStorage(applicationId)
    } else {
      const uploadedKeys = storedDocuments
        .map((document) => document.storedName)
        .filter(Boolean)

      if (uploadedKeys.length > 0) {
        try {
          await utapi.deleteFiles(uploadedKeys)
        } catch (cleanupError) {
          console.error("Failed to clean up UploadThing files:", cleanupError)
        }
      }
    }

    throw error
  }

  const magicLinkResult = await requestMagicLink({
    applicationId,
    email: user.email,
    recipientName: user.name ?? undefined,
    scope: "MEMBER",
    userId: user.id,
  })

  return {
    ok: true as const,
    applicationId,
    applicationNumber,
    emailSent: magicLinkResult.emailSent,
    debugUrl: magicLinkResult.debugUrl,
    message: magicLinkResult.message,
  }
}
