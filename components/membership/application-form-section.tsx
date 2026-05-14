"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Controller,
  useForm,
  useWatch,
  type FieldErrors,
  type Path,
} from "react-hook-form"

import type {
  MembershipApplicationFormValues,
  MembershipApplicationSuccess,
} from "@/lib/membership-form"
import { membershipFormDefaults } from "@/lib/membership-form"
import {
  ChoiceCard,
  Field,
  Input,
  Select,
  Textarea,
  UploadInput,
} from "@/components/ui"

import { membershipTypeOptions } from "./data"

type ApplyResponse =
  | {
      ok: true
      applicationNumber: string
      emailSent: boolean
      message: string
      debugUrl?: string
    }
  | {
      ok: false
      message?: string
      errors?: Record<string, string>
    }

function collectErrorMessages(
  errors: FieldErrors<MembershipApplicationFormValues>
) {
  return Object.values(errors)
    .flatMap((error) =>
      error && typeof error === "object" && "message" in error
        ? [error.message]
        : []
    )
    .filter((message): message is string => typeof message === "string")
}

export function ApplicationFormSection() {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] =
    useState<MembershipApplicationSuccess | null>(null)

  const {
    control,
    handleSubmit,
    register,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<MembershipApplicationFormValues>({
    defaultValues: membershipFormDefaults,
  })

  const membershipType = useWatch({ control, name: "membershipType" })
  const isConventionAttendee = useWatch({
    control,
    name: "isConventionAttendee",
  })
  const agreed = useWatch({ control, name: "agreed" })
  const validationMessages = collectErrorMessages(errors)

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null)
    setSubmitSuccess(null)

    try {
      const response = await fetch("/api/memberships/apply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      })

      const payload = (await response.json()) as ApplyResponse

      if (!response.ok || !payload.ok) {
        if (!payload.ok) {
          for (const [fieldName, message] of Object.entries(
            payload.errors ?? {}
          )) {
            setError(fieldName as Path<MembershipApplicationFormValues>, {
              type: "server",
              message,
            })
          }
        }

        setSubmitError(
          payload.ok
            ? "We could not save your application yet."
            : (payload.message ??
                "Please review the highlighted requirements and try again.")
        )
        return
      }

      setSubmitSuccess({
        applicationNumber: payload.applicationNumber,
        emailSent: payload.emailSent,
        message: payload.message,
        debugUrl: payload.debugUrl,
      })
      reset(membershipFormDefaults)
    } catch {
      setSubmitError(
        "Your application could not be sent right now. Please check your connection and try again."
      )
    }
  })

  return (
    <section
      id="apply"
      className="section-py"
      style={{ background: "var(--surface)" }}
    >
      <div className="container" style={{ maxWidth: "64rem" }}>
        <span className="section-label">Membership Form</span>
        <h2 className="section-title">Membership Application Form</h2>
        <p className="section-desc" style={{ marginBottom: "0.5rem" }}>
          Fill out the form below to apply for PNGOSWA membership. Fields marked
          with an asterisk are required.
        </p>

        <form onSubmit={onSubmit} noValidate className="membership-form">
          {submitSuccess ? (
            <div className="form-feedback form-feedback-success">
              <strong>Application saved successfully.</strong>
              <p>
                Reference number:{" "}
                <strong>{submitSuccess.applicationNumber}</strong>
              </p>
              <p>{submitSuccess.message}</p>
              {!submitSuccess.emailSent ? (
                <p>
                  You can still request your sign-in link from{" "}
                  <Link href="/member/login">Member Login</Link>.
                </p>
              ) : null}
              {submitSuccess.debugUrl ? (
                <p>
                  Development access link:{" "}
                  <a href={submitSuccess.debugUrl}>{submitSuccess.debugUrl}</a>
                </p>
              ) : null}
            </div>
          ) : null}

          {submitError ? (
            <div className="form-feedback form-feedback-error">
              <strong>We could not submit your application yet.</strong>
              <p>{submitError}</p>
              {validationMessages.length > 0 ? (
                <ul className="form-feedback-list">
                  {validationMessages.map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          <fieldset className="form-fieldset">
            <legend className="form-legend">1. Personal Information</legend>
            <div className="form-row form-row-3">
              <Field
                htmlFor="lastName"
                label="Last Name"
                required
                error={errors.lastName?.message}
              >
                <Input
                  id="lastName"
                  placeholder="Dela Cruz"
                  invalid={!!errors.lastName}
                  {...register("lastName", {
                    required: "Last name is required.",
                  })}
                />
              </Field>
              <Field
                htmlFor="firstName"
                label="First Name"
                required
                error={errors.firstName?.message}
              >
                <Input
                  id="firstName"
                  placeholder="Juan"
                  invalid={!!errors.firstName}
                  {...register("firstName", {
                    required: "First name is required.",
                  })}
                />
              </Field>
              <Field
                htmlFor="middleName"
                label="Middle Name"
                error={errors.middleName?.message}
              >
                <Input
                  id="middleName"
                  placeholder="Santos"
                  invalid={!!errors.middleName}
                  {...register("middleName")}
                />
              </Field>
            </div>

            <div className="form-row">
              <Field
                htmlFor="gender"
                label="Sex / Gender"
                required
                error={errors.gender?.message}
              >
                <Select
                  id="gender"
                  invalid={!!errors.gender}
                  {...register("gender", {
                    required: "Sex / Gender is required.",
                  })}
                >
                  <option value="">Select gender</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="non-binary">Non-binary</option>
                  <option value="prefer-not-to-say">Prefer not to say</option>
                </Select>
              </Field>
              <Field
                htmlFor="dateOfBirth"
                label="Date of Birth"
                required
                error={errors.dateOfBirth?.message}
              >
                <Input
                  id="dateOfBirth"
                  type="date"
                  invalid={!!errors.dateOfBirth}
                  {...register("dateOfBirth", {
                    required: "Date of birth is required.",
                  })}
                />
              </Field>
            </div>

            <div className="form-row">
              <Field
                htmlFor="civilStatus"
                label="Civil Status"
                required
                error={errors.civilStatus?.message}
              >
                <Select
                  id="civilStatus"
                  invalid={!!errors.civilStatus}
                  {...register("civilStatus", {
                    required: "Civil status is required.",
                  })}
                >
                  <option value="">Select status</option>
                  <option value="single">Single</option>
                  <option value="married">Married</option>
                  <option value="widowed">Widowed</option>
                  <option value="separated">Separated</option>
                </Select>
              </Field>
              <Field
                htmlFor="prcLicense"
                label="PRC License Number"
                hint="If applicable"
                error={errors.prcLicense?.message}
              >
                <Input
                  id="prcLicense"
                  placeholder="License number"
                  invalid={!!errors.prcLicense}
                  {...register("prcLicense")}
                />
              </Field>
            </div>

            <div className="form-row">
              <Field
                htmlFor="dateOfRegistration"
                label="Date of Registration"
                required
                error={errors.dateOfRegistration?.message}
              >
                <Input
                  id="dateOfRegistration"
                  type="date"
                  invalid={!!errors.dateOfRegistration}
                  {...register("dateOfRegistration", {
                    required: "Date of registration is required.",
                  })}
                />
              </Field>
              <Field
                htmlFor="contactNumber"
                label="Contact Number"
                required
                error={errors.contactNumber?.message}
              >
                <Input
                  id="contactNumber"
                  type="tel"
                  placeholder="09XX XXX XXXX"
                  invalid={!!errors.contactNumber}
                  {...register("contactNumber", {
                    required: "Contact number is required.",
                  })}
                />
              </Field>
            </div>

            <div className="form-row">
              <Field
                htmlFor="email"
                label="Email Address"
                required
                error={errors.email?.message}
              >
                <Input
                  id="email"
                  type="email"
                  placeholder="you@email.com"
                  invalid={!!errors.email}
                  {...register("email", {
                    required: "Email address is required.",
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: "Please enter a valid email address.",
                    },
                  })}
                />
              </Field>
              <Field
                htmlFor="region"
                label="Region"
                required
                error={errors.region?.message}
              >
                <Input
                  id="region"
                  placeholder="NCR, Region IV-A, Region VII"
                  invalid={!!errors.region}
                  {...register("region", {
                    required: "Region is required.",
                  })}
                />
              </Field>
            </div>
          </fieldset>

          <fieldset className="form-fieldset">
            <legend className="form-legend">2. Employment Information</legend>
            <Field
              htmlFor="organization"
              label="Name of Organization / NGO"
              required
              error={errors.organization?.message}
            >
              <Input
                id="organization"
                placeholder="Organization name"
                invalid={!!errors.organization}
                {...register("organization", {
                  required: "Organization / NGO is required.",
                })}
              />
            </Field>

            <Field
              htmlFor="officeAddress"
              label="Office Address"
              required
              error={errors.officeAddress?.message}
            >
              <Textarea
                id="officeAddress"
                rows={3}
                placeholder="Complete office address"
                invalid={!!errors.officeAddress}
                {...register("officeAddress", {
                  required: "Office address is required.",
                })}
              />
            </Field>

            <div className="form-row">
              <Field
                htmlFor="position"
                label="Position / Designation"
                required
                error={errors.position?.message}
              >
                <Input
                  id="position"
                  placeholder="Social Worker, Case Manager"
                  invalid={!!errors.position}
                  {...register("position", {
                    required: "Position / Designation is required.",
                  })}
                />
              </Field>
              <Field
                htmlFor="employmentStatus"
                label="Employment Status"
                required
                error={errors.employmentStatus?.message}
              >
                <Select
                  id="employmentStatus"
                  invalid={!!errors.employmentStatus}
                  {...register("employmentStatus", {
                    required: "Employment status is required.",
                  })}
                >
                  <option value="">Select status</option>
                  <option value="regular">Regular</option>
                  <option value="contractual">Contractual</option>
                  <option value="volunteer">Volunteer</option>
                </Select>
              </Field>
            </div>

            <div className="form-row">
              <Field
                htmlFor="lengthOfService"
                label="Length of Service"
                required
                error={errors.lengthOfService?.message}
              >
                <Input
                  id="lengthOfService"
                  placeholder="3 years"
                  invalid={!!errors.lengthOfService}
                  {...register("lengthOfService", {
                    required: "Length of service is required.",
                  })}
                />
              </Field>
              <Field
                htmlFor="areaOfPractice"
                label="Area of Practice"
                required
                error={errors.areaOfPractice?.message}
              >
                <Input
                  id="areaOfPractice"
                  placeholder="Child Welfare, Community Development"
                  invalid={!!errors.areaOfPractice}
                  {...register("areaOfPractice", {
                    required: "Area of practice is required.",
                  })}
                />
              </Field>
            </div>
          </fieldset>

          <fieldset className="form-fieldset">
            <legend className="form-legend">3. Educational Background</legend>
            <div className="form-row">
              <Field
                htmlFor="degree"
                label="Degree"
                required
                error={errors.degree?.message}
              >
                <Input
                  id="degree"
                  placeholder="BS Social Work"
                  invalid={!!errors.degree}
                  {...register("degree", {
                    required: "Degree is required.",
                  })}
                />
              </Field>
              <Field
                htmlFor="school"
                label="School / University"
                required
                error={errors.school?.message}
              >
                <Input
                  id="school"
                  placeholder="School name"
                  invalid={!!errors.school}
                  {...register("school", {
                    required: "School / University is required.",
                  })}
                />
              </Field>
            </div>

            <div className="form-row">
              <Field
                htmlFor="yearGraduated"
                label="Year Graduated"
                required
                error={errors.yearGraduated?.message}
              >
                <Input
                  id="yearGraduated"
                  inputMode="numeric"
                  placeholder="2020"
                  invalid={!!errors.yearGraduated}
                  {...register("yearGraduated", {
                    required: "Year graduated is required.",
                    pattern: {
                      value: /^\d{4}$/,
                      message: "Year graduated must be a 4-digit year.",
                    },
                  })}
                />
              </Field>
              <Field
                htmlFor="postgraduateStudies"
                label="Postgraduate Studies"
                hint="If any"
                error={errors.postgraduateStudies?.message}
              >
                <Input
                  id="postgraduateStudies"
                  placeholder="MA Social Work"
                  invalid={!!errors.postgraduateStudies}
                  {...register("postgraduateStudies")}
                />
              </Field>
            </div>
          </fieldset>

          <fieldset className="form-fieldset">
            <legend className="form-legend">4. Professional Information</legend>
            <Field
              htmlFor="specializations"
              label="Areas of Specialization"
              required
              error={errors.specializations?.message}
            >
              <Textarea
                id="specializations"
                rows={3}
                placeholder="Case management, child protection, community organizing"
                invalid={!!errors.specializations}
                {...register("specializations", {
                  required: "Areas of specialization are required.",
                })}
              />
            </Field>
            <Field
              htmlFor="otherOrganizations"
              label="Membership in Other Professional Organizations"
              error={errors.otherOrganizations?.message}
            >
              <Textarea
                id="otherOrganizations"
                rows={3}
                placeholder="List organizations or write N/A"
                invalid={!!errors.otherOrganizations}
                {...register("otherOrganizations")}
              />
            </Field>
          </fieldset>

          <fieldset className="form-fieldset">
            <legend className="form-legend">
              Membership Type <span className="req">*</span>
            </legend>
            <Controller
              name="membershipType"
              control={control}
              rules={{ required: "Membership type is required." }}
              render={({ field, fieldState }) => (
                <>
                  <div className="option-group">
                    {membershipTypeOptions.map((typeOption) => (
                      <ChoiceCard
                        key={typeOption.value}
                        type="radio"
                        name={field.name}
                        value={typeOption.value}
                        checked={field.value === typeOption.value}
                        selected={field.value === typeOption.value}
                        invalid={!!fieldState.error}
                        onChange={() => field.onChange(typeOption.value)}
                        title={typeOption.label}
                        description={typeOption.desc}
                      />
                    ))}
                  </div>
                  {fieldState.error ? (
                    <p role="alert" className="form-error">
                      {fieldState.error.message}
                    </p>
                  ) : null}
                </>
              )}
            />
          </fieldset>

          <fieldset className="form-fieldset">
            <legend className="form-legend">5. Supporting Documents</legend>
            <div className="form-notice">
              Upload the files that support your membership review. Use PDF for
              documents and JPG or PNG for scanned copies and images.
            </div>
            <div className="form-row">
              <Controller
                name="resumeUpload"
                control={control}
                rules={{
                  validate: (value) => !!value || "CV / Resume is required.",
                }}
                render={({ field, fieldState }) => (
                  <UploadInput
                    id="resumeUpload"
                    label="CV / Resume"
                    required
                    accept=".pdf,.jpg,.jpeg,.png"
                    allowedText="PDF, JPG, or PNG up to 8MB"
                    endpoint="membershipDocument"
                    value={field.value}
                    onChange={field.onChange}
                    error={fieldState.error?.message}
                    disabled={isSubmitting}
                  />
                )}
              />
              <Controller
                name="employmentProofUpload"
                control={control}
                rules={{
                  validate: (value) =>
                    membershipType === "honorary" ||
                    !!value ||
                    "Proof of employment or leadership role is required.",
                }}
                render={({ field, fieldState }) => (
                  <UploadInput
                    id="employmentProofUpload"
                    label="Proof of Employment / Leadership Role"
                    hint={
                      membershipType === "honorary"
                        ? "Optional for honorary applications"
                        : undefined
                    }
                    required={membershipType !== "honorary"}
                    accept=".pdf,.jpg,.jpeg,.png"
                    allowedText="PDF, JPG, or PNG up to 8MB"
                    endpoint="membershipDocument"
                    value={field.value}
                    onChange={field.onChange}
                    error={fieldState.error?.message}
                    disabled={isSubmitting}
                  />
                )}
              />
            </div>
            <div className="form-row">
              <Controller
                name="prcLicenseUpload"
                control={control}
                render={({ field, fieldState }) => (
                  <UploadInput
                    id="prcLicenseUpload"
                    label="PRC License Copy"
                    hint="If applicable"
                    accept=".pdf,.jpg,.jpeg,.png"
                    allowedText="PDF, JPG, or PNG up to 8MB"
                    endpoint="membershipDocument"
                    value={field.value}
                    onChange={field.onChange}
                    error={fieldState.error?.message}
                    disabled={isSubmitting}
                  />
                )}
              />
              <Controller
                name="endorsementUpload"
                control={control}
                rules={{
                  validate: (value) =>
                    membershipType !== "honorary" ||
                    !!value ||
                    "Recommendation / endorsement is required for honorary membership.",
                }}
                render={({ field, fieldState }) => (
                  <UploadInput
                    id="endorsementUpload"
                    label="Recommendation / Endorsement"
                    hint={
                      membershipType === "honorary"
                        ? undefined
                        : "Only required for honorary membership"
                    }
                    required={membershipType === "honorary"}
                    accept=".pdf,.jpg,.jpeg,.png"
                    allowedText="PDF, JPG, or PNG up to 8MB"
                    endpoint="membershipDocument"
                    value={field.value}
                    onChange={field.onChange}
                    error={fieldState.error?.message}
                    disabled={isSubmitting}
                  />
                )}
              />
            </div>
          </fieldset>

          <fieldset className="form-fieldset">
            <legend className="form-legend">6. Payment</legend>
            <div className="form-notice">
              <strong>Notice:</strong> Membership fee is waived for convention
              attendees. Only ID and T-shirt fees are required. Please upload
              your certificate.
            </div>
            <Controller
              name="isConventionAttendee"
              control={control}
              rules={{
                required: "Convention attendee selection is required.",
              }}
              render={({ field, fieldState }) => (
                <>
                  <div className="option-group">
                    <ChoiceCard
                      type="radio"
                      name={field.name}
                      value="yes"
                      checked={field.value === "yes"}
                      selected={field.value === "yes"}
                      invalid={!!fieldState.error}
                      onChange={() => field.onChange("yes")}
                      title="Convention Attendee with Certificate"
                    />
                    <ChoiceCard
                      type="radio"
                      name={field.name}
                      value="no"
                      checked={field.value === "no"}
                      selected={field.value === "no"}
                      invalid={!!fieldState.error}
                      onChange={() => field.onChange("no")}
                      title="Regular Applicant"
                    />
                  </div>
                  {fieldState.error ? (
                    <p role="alert" className="form-error">
                      {fieldState.error.message}
                    </p>
                  ) : null}
                </>
              )}
            />
            <div className="form-row">
              <Controller
                name="certificateUpload"
                control={control}
                rules={{
                  validate: (value) =>
                    isConventionAttendee !== "yes" ||
                    !!value ||
                    "Certificate of participation / attendance is required.",
                }}
                render={({ field, fieldState }) => (
                  <UploadInput
                    id="certificateUpload"
                    label="Certificate of Participation / Attendance"
                    required={isConventionAttendee === "yes"}
                    accept=".pdf,.jpg,.jpeg,.png"
                    allowedText="PDF, JPG, or PNG up to 8MB"
                    endpoint="membershipDocument"
                    value={field.value}
                    onChange={field.onChange}
                    error={fieldState.error?.message}
                    disabled={isSubmitting}
                  />
                )}
              />
              <Controller
                name="paymentProof"
                control={control}
                rules={{
                  validate: (value) =>
                    !!value || "Proof of payment is required.",
                }}
                render={({ field, fieldState }) => (
                  <UploadInput
                    id="paymentProof"
                    label="Proof of Payment"
                    required
                    accept=".pdf,.jpg,.jpeg,.png"
                    allowedText="PDF, JPG, or PNG up to 8MB"
                    endpoint="membershipDocument"
                    value={field.value}
                    onChange={field.onChange}
                    error={fieldState.error?.message}
                    disabled={isSubmitting}
                  />
                )}
              />
            </div>
            <Field
              htmlFor="paymentMode"
              label="Mode of Payment"
              required
              error={errors.paymentMode?.message}
            >
              <Select
                id="paymentMode"
                invalid={!!errors.paymentMode}
                {...register("paymentMode", {
                  required: "Mode of payment is required.",
                })}
              >
                <option value="">Select payment mode</option>
                <option value="gcash">GCash</option>
                <option value="bank-transfer">Bank Transfer</option>
                <option value="cash">Cash</option>
                <option value="other">Other</option>
              </Select>
            </Field>
          </fieldset>

          <fieldset className="form-fieldset">
            <legend className="form-legend">7. ID Information</legend>
            <Controller
              name="photoUpload"
              control={control}
              rules={{
                validate: (value) => !!value || "2x2 photo is required.",
              }}
              render={({ field, fieldState }) => (
                <UploadInput
                  id="photoUpload"
                  label="Upload 2x2 Photo"
                  required
                  accept=".jpg,.jpeg,.png"
                  allowedText="JPG or PNG up to 8MB"
                  endpoint="membershipPhoto"
                  value={field.value}
                  onChange={field.onChange}
                  error={fieldState.error?.message}
                  disabled={isSubmitting}
                />
              )}
            />
          </fieldset>

          <fieldset className="form-fieldset">
            <legend className="form-legend">
              8. Declaration and Data Privacy Consent
            </legend>
            <div className="agreement-box">
              <p>
                Please read the statement below carefully and indicate your
                agreement before submitting your application.
              </p>
              <p>
                I hereby certify that all information provided in this form is
                true and correct to the best of my knowledge. I agree to abide
                by the Constitution and By-Laws, policies, and{" "}
                <Link className="text-[#e8475e]" href="/ethics">
                  Code of Ethics
                </Link>{" "}
                of the PNGOSWA.
              </p>
              <p>
                In compliance with the Data Privacy Act of 2012, I hereby
                authorize PNGOSWA to collect, process, store, and use my
                personal information for membership processing, record-keeping,
                and official communication purposes. I understand that my
                information will be treated with confidentiality and will not be
                disclosed to third parties without my consent, except as
                required by law.
              </p>
              <p>
                I have read and understood the above statements and voluntarily
                give my full consent.
              </p>
              <Controller
                name="agreed"
                control={control}
                rules={{
                  validate: (value) =>
                    value ||
                    "You must agree to the declaration and data privacy consent.",
                }}
                render={({ field, fieldState }) => (
                  <>
                    <ChoiceCard
                      type="checkbox"
                      className="privacy-consent"
                      checked={field.value}
                      selected={field.value}
                      invalid={!!fieldState.error}
                      onChange={(event) => field.onChange(event.target.checked)}
                      title="I agree to the Declaration and Data Privacy Consent"
                    />
                    {fieldState.error ? (
                      <p role="alert" className="form-error">
                        {fieldState.error.message}
                      </p>
                    ) : null}
                  </>
                )}
              />
            </div>
          </fieldset>

          <button
            type="submit"
            className="btn btn-cta btn-lg submit-btn"
            disabled={!agreed || isSubmitting}
            style={{
              opacity: agreed && !isSubmitting ? 1 : 0.45,
              cursor: agreed && !isSubmitting ? "pointer" : "not-allowed",
            }}
          >
            {isSubmitting ? "Submitting Application..." : "Submit Application"}
          </button>
        </form>
      </div>
    </section>
  )
}
