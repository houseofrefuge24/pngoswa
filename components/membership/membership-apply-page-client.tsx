"use client"

import {
  ApplicationFormSection,
  MembershipFooter,
  MembershipNavbar,
} from "@/components/membership"

export function MembershipApplyPageClient() {
  return (
    <>
      <MembershipNavbar />
      <main className="flex-1">
        <section className="page-header">
          <div
            className="container"
            style={{ padding: "3rem 1.25rem 2.5rem", position: "relative" }}
          >
            <p className="back-link" style={{ marginBottom: "1rem" }}>
              Membership Application Form
            </p>
            <h1
              style={{
                fontSize: "clamp(2rem, 4vw, 3rem)",
                fontWeight: 800,
                lineHeight: 1.12,
                marginBottom: "0.75rem",
                color: "var(--navy-50)",
              }}
            >
              Apply for PNGOSWA Membership
            </h1>
            <p
              style={{
                color: "rgba(255,255,255,0.7)",
                fontSize: "1.125rem",
                maxWidth: "42rem",
                lineHeight: 1.6,
              }}
            >
              Complete your personal, employment, educational, professional,
              payment, ID, and data privacy details in one submission.
            </p>
          </div>
          <div className="gradient-bar" />
        </section>
        <ApplicationFormSection />
      </main>
      <MembershipFooter />
    </>
  )
}
