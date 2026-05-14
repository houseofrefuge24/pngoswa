-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('PENDING', 'FOLLOW_UP', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "MembershipType" AS ENUM ('REGULAR', 'LIFETIME', 'HONORARY');

-- CreateEnum
CREATE TYPE "GenderOption" AS ENUM ('FEMALE', 'MALE', 'NON_BINARY', 'PREFER_NOT_TO_SAY');

-- CreateEnum
CREATE TYPE "CivilStatusOption" AS ENUM ('SINGLE', 'MARRIED', 'WIDOWED', 'SEPARATED');

-- CreateEnum
CREATE TYPE "EmploymentStatusOption" AS ENUM ('REGULAR', 'CONTRACTUAL', 'VOLUNTEER');

-- CreateEnum
CREATE TYPE "PaymentModeOption" AS ENUM ('GCASH', 'BANK_TRANSFER', 'CASH', 'OTHER');

-- CreateEnum
CREATE TYPE "MembershipDocumentType" AS ENUM ('RESUME', 'EMPLOYMENT_PROOF', 'PRC_LICENSE', 'ENDORSEMENT', 'ATTENDANCE_CERTIFICATE', 'PAYMENT_PROOF', 'ID_PHOTO');

-- CreateEnum
CREATE TYPE "MagicLinkScope" AS ENUM ('ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "ReviewActionType" AS ENUM ('SUBMITTED', 'FOLLOW_UP', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CommunicationKind" AS ENUM ('MAGIC_LINK', 'FOLLOW_UP', 'STATUS_UPDATE');

-- CreateEnum
CREATE TYPE "CommunicationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipApplication" (
    "id" TEXT NOT NULL,
    "applicationNumber" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'PENDING',
    "membershipType" "MembershipType" NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "middleName" TEXT,
    "gender" "GenderOption" NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "civilStatus" "CivilStatusOption" NOT NULL,
    "prcLicense" TEXT,
    "dateOfRegistration" TIMESTAMP(3) NOT NULL,
    "contactNumber" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "organization" TEXT NOT NULL,
    "officeAddress" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "employmentStatus" "EmploymentStatusOption" NOT NULL,
    "lengthOfService" TEXT NOT NULL,
    "areaOfPractice" TEXT NOT NULL,
    "degree" TEXT NOT NULL,
    "school" TEXT NOT NULL,
    "yearGraduated" TEXT NOT NULL,
    "postgraduateStudies" TEXT,
    "specializations" TEXT NOT NULL,
    "otherOrganizations" TEXT,
    "paymentMode" "PaymentModeOption" NOT NULL,
    "isConventionAttendee" BOOLEAN NOT NULL,
    "agreedToPrivacy" BOOLEAN NOT NULL,
    "reviewSummary" TEXT,
    "followUpMessage" TEXT,
    "lastFollowUpSentAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MembershipApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipDocument" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "type" "MembershipDocumentType" NOT NULL,
    "label" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MembershipDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipReviewAction" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "reviewerId" TEXT,
    "type" "ReviewActionType" NOT NULL,
    "subject" TEXT,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MembershipReviewAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MagicLinkToken" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "scope" "MagicLinkScope" NOT NULL,
    "redirectPath" TEXT NOT NULL,
    "userId" TEXT,
    "applicationId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MagicLinkToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthSession" (
    "id" TEXT NOT NULL,
    "sessionTokenHash" TEXT NOT NULL,
    "scope" "MagicLinkScope" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunicationLog" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT,
    "userId" TEXT,
    "kind" "CommunicationKind" NOT NULL,
    "status" "CommunicationStatus" NOT NULL DEFAULT 'PENDING',
    "recipientEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "previewText" TEXT NOT NULL,
    "errorMessage" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunicationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "MembershipApplication_applicationNumber_key" ON "MembershipApplication"("applicationNumber");

-- CreateIndex
CREATE INDEX "MembershipDocument_applicationId_type_idx" ON "MembershipDocument"("applicationId", "type");

-- CreateIndex
CREATE INDEX "MembershipReviewAction_applicationId_createdAt_idx" ON "MembershipReviewAction"("applicationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MagicLinkToken_tokenHash_key" ON "MagicLinkToken"("tokenHash");

-- CreateIndex
CREATE INDEX "MagicLinkToken_email_scope_expiresAt_idx" ON "MagicLinkToken"("email", "scope", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "AuthSession_sessionTokenHash_key" ON "AuthSession"("sessionTokenHash");

-- CreateIndex
CREATE INDEX "AuthSession_userId_scope_expiresAt_idx" ON "AuthSession"("userId", "scope", "expiresAt");

-- CreateIndex
CREATE INDEX "CommunicationLog_applicationId_createdAt_idx" ON "CommunicationLog"("applicationId", "createdAt");

-- AddForeignKey
ALTER TABLE "MembershipApplication" ADD CONSTRAINT "MembershipApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipDocument" ADD CONSTRAINT "MembershipDocument_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "MembershipApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipReviewAction" ADD CONSTRAINT "MembershipReviewAction_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "MembershipApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipReviewAction" ADD CONSTRAINT "MembershipReviewAction_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MagicLinkToken" ADD CONSTRAINT "MagicLinkToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MagicLinkToken" ADD CONSTRAINT "MagicLinkToken_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "MembershipApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationLog" ADD CONSTRAINT "CommunicationLog_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "MembershipApplication"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationLog" ADD CONSTRAINT "CommunicationLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
