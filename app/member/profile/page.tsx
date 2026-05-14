import Link from "next/link"

import { logoutMember } from "@/app/member/actions"
import { StatusBadge } from "@/components/portal/status-badge"
import { requirePortalSession } from "@/lib/auth"
import { prisma } from "@/lib/db"
import {
  formatMembershipType,
  formatPaymentMode,
} from "@/lib/membership"

export default async function MemberProfilePage() {
  const session = await requirePortalSession("MEMBER")
  const application = await prisma.membershipApplication.findFirst({
    where: {
      userId: session.user.id,
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
      },
      communications: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  })

  return (
    <main className="portal-shell">
      <section className="portal-header">
        <div>
          <span className="section-label">Member Profile</span>
          <h1 className="portal-title">Your PNGOSWA membership status</h1>
          <p className="portal-copy">
            Signed in as <strong>{session.user.email}</strong>
          </p>
        </div>
        <form action={logoutMember}>
          <button className="btn btn-outline" type="submit">
            Sign Out
          </button>
        </form>
      </section>

      {!application ? (
        <section className="dashboard-panel">
          <h2 className="dashboard-section-title">No application found yet</h2>
          <p className="portal-copy">
            We don&apos;t have a saved membership application for this account yet.
          </p>
          <Link className="btn btn-cta" href="/membership/apply">
            Complete membership application
          </Link>
        </section>
      ) : (
        <div className="portal-grid">
          <section className="dashboard-panel">
            <div className="panel-heading-row">
              <div>
                <p className="panel-kicker">Application Reference</p>
                <h2 className="dashboard-section-title">
                  {application.applicationNumber}
                </h2>
              </div>
              <StatusBadge status={application.status} />
            </div>
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
                <span className="profile-meta-label">Organization</span>
                <strong>{application.organization}</strong>
              </div>
              <div>
                <span className="profile-meta-label">Submitted</span>
                <strong>{application.createdAt.toLocaleDateString()}</strong>
              </div>
            </div>
            {application.followUpMessage ? (
              <div className="form-feedback form-feedback-warning">
                <strong>Action needed from you</strong>
                <p>{application.followUpMessage}</p>
              </div>
            ) : null}
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
            <h2 className="dashboard-section-title">Review timeline</h2>
            <div className="timeline-list">
              {application.reviewActions.map((action) => (
                <div key={action.id} className="timeline-item">
                  <div className="timeline-dot" />
                  <div>
                    <strong>{action.subject ?? action.type}</strong>
                    {action.message ? <p>{action.message}</p> : null}
                    <span>{action.createdAt.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="dashboard-panel">
            <h2 className="dashboard-section-title">Email activity</h2>
            <div className="timeline-list">
              {application.communications.map((communication) => (
                <div key={communication.id} className="timeline-item">
                  <div className="timeline-dot timeline-dot-muted" />
                  <div>
                    <strong>{communication.subject}</strong>
                    <p>{communication.previewText}</p>
                    <span>
                      {communication.status} • {communication.createdAt.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </main>
  )
}
