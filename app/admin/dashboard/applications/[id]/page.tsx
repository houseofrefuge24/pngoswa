import Link from "next/link"
import { notFound } from "next/navigation"

import { reviewMembershipAction } from "@/app/admin/actions"
import { StatusBadge } from "@/components/portal/status-badge"
import { prisma } from "@/lib/db"
import {
  formatMembershipType,
  formatPaymentMode,
  getApplicationRequirementChecklist,
} from "@/lib/membership"

type ApplicationDetailPageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ updated?: string }>
}

export default async function ApplicationDetailPage({
  params,
  searchParams,
}: ApplicationDetailPageProps) {
  const { id } = await params
  const query = await searchParams
  const application = await prisma.membershipApplication.findUnique({
    where: {
      id,
    },
    include: {
      documents: {
        orderBy: {
          createdAt: "asc",
        },
      },
      reviewActions: {
        orderBy: {
          createdAt: "desc",
        },
        include: {
          reviewer: true,
        },
      },
    },
  })

  if (!application) {
    notFound()
  }

  const checklist = getApplicationRequirementChecklist(application)

  return (
    <div className="dashboard-content">
      <section className="dashboard-hero dashboard-hero-tight">
        <div>
          <Link href="/admin/dashboard" className="back-link">
            Back to dashboard
          </Link>
          <div className="panel-heading-row">
            <div>
              <span className="section-label">Application Review</span>
              <h1 className="dashboard-title">
                {application.firstName} {application.lastName}
              </h1>
              <p className="dashboard-copy">{application.applicationNumber}</p>
            </div>
            <StatusBadge status={application.status} />
          </div>
        </div>
      </section>

      {query.updated ? (
        <div className="form-feedback form-feedback-success">
          <p>Application updated successfully.</p>
        </div>
      ) : null}

      <div className="detail-grid">
        <section className="dashboard-panel">
          <h2 className="dashboard-section-title">Applicant summary</h2>
          <div className="profile-meta-grid">
            <div>
              <span className="profile-meta-label">Membership Type</span>
              <strong>{formatMembershipType(application.membershipType)}</strong>
            </div>
            <div>
              <span className="profile-meta-label">Payment Mode</span>
              <strong>{formatPaymentMode(application.paymentMode)}</strong>
            </div>
            <div>
              <span className="profile-meta-label">Email</span>
              <strong>{application.email}</strong>
            </div>
            <div>
              <span className="profile-meta-label">Contact</span>
              <strong>{application.contactNumber}</strong>
            </div>
            <div>
              <span className="profile-meta-label">Organization</span>
              <strong>{application.organization}</strong>
            </div>
            <div>
              <span className="profile-meta-label">Position</span>
              <strong>{application.position}</strong>
            </div>
            <div>
              <span className="profile-meta-label">Region</span>
              <strong>{application.region}</strong>
            </div>
            <div>
              <span className="profile-meta-label">Submitted</span>
              <strong>{application.createdAt.toLocaleString()}</strong>
            </div>
          </div>
        </section>

        <section className="dashboard-panel">
          <h2 className="dashboard-section-title">Requirement checklist</h2>
          <div className="checklist-grid">
            {checklist.map((item) => (
              <div key={item.label} className="checklist-item">
                <strong>{item.label}</strong>
                <span
                  className={
                    item.satisfied
                      ? "status-badge status-badge-success"
                      : item.optional
                        ? "status-badge status-badge-info"
                        : "status-badge status-badge-warning"
                  }
                >
                  {item.satisfied
                    ? "Received"
                    : item.optional
                      ? "Optional"
                      : "Missing"}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="dashboard-panel">
          <h2 className="dashboard-section-title">Submitted documents</h2>
          <div className="doc-list">
            {application.documents.map((document) => (
              <a
                key={document.id}
                href={`/api/documents/${document.id}`}
                className="doc-card"
                target="_blank"
                rel="noreferrer"
              >
                <strong>{document.label}</strong>
                <span>{document.originalName}</span>
              </a>
            ))}
          </div>
        </section>

        <section className="dashboard-panel">
          <h2 className="dashboard-section-title">Review actions</h2>
          <form action={reviewMembershipAction} className="review-form">
            <input type="hidden" name="applicationId" value={application.id} />
            <div className="form-group">
              <label className="form-label" htmlFor="subject">
                Email subject
              </label>
              <input
                id="subject"
                name="subject"
                className="form-input"
                type="text"
                placeholder="Application update from PNGOSWA"
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="message">
                Reviewer message
              </label>
              <textarea
                id="message"
                name="message"
                className="form-input"
                rows={8}
                placeholder="Use this space for follow-up instructions, decision context, or approval notes."
                defaultValue={application.followUpMessage ?? ""}
              />
            </div>
            <div className="review-actions">
              <button className="btn btn-primary" type="submit" name="action" value="approve">
                Accept Membership
              </button>
              <button className="btn btn-outline" type="submit" name="action" value="follow-up">
                Send Follow Up
              </button>
              <button className="btn btn-cta" type="submit" name="action" value="reject">
                Reject Application
              </button>
            </div>
          </form>
        </section>

        <section className="dashboard-panel detail-grid-full">
          <h2 className="dashboard-section-title">Review timeline</h2>
          <div className="timeline-list">
            {application.reviewActions.map((action) => (
              <div key={action.id} className="timeline-item">
                <div className="timeline-dot" />
                <div>
                  <strong>{action.subject ?? action.type}</strong>
                  {action.message ? <p>{action.message}</p> : null}
                  <span>
                    {action.createdAt.toLocaleString()}
                    {action.reviewer?.email ? ` • ${action.reviewer.email}` : ""}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
