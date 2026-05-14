import Link from "next/link"

import { StatusBadge } from "@/components/portal/status-badge"
import { prisma } from "@/lib/db"
import { formatMembershipType } from "@/lib/membership"

type DashboardPageProps = {
  searchParams: Promise<{
    q?: string
    status?: string
  }>
}

const statusOptions = [
  "ALL",
  "PENDING",
  "FOLLOW_UP",
  "APPROVED",
  "REJECTED",
] as const

export default async function AdminDashboardPage({
  searchParams,
}: DashboardPageProps) {
  const params = await searchParams
  const query = params.q?.trim() ?? ""
  const rawStatus = params.status?.trim() ?? "ALL"
  const statusFilter = statusOptions.includes(
    rawStatus as (typeof statusOptions)[number]
  )
    ? (rawStatus as "ALL" | "PENDING" | "FOLLOW_UP" | "APPROVED" | "REJECTED")
    : "ALL"

  const where =
    query || statusFilter !== "ALL"
      ? {
          ...(statusFilter !== "ALL" ? { status: statusFilter } : {}),
          ...(query
            ? {
                OR: [
                  { firstName: { contains: query, mode: "insensitive" as const } },
                  { lastName: { contains: query, mode: "insensitive" as const } },
                  { email: { contains: query, mode: "insensitive" as const } },
                  {
                    applicationNumber: {
                      contains: query,
                      mode: "insensitive" as const,
                    },
                  },
                  {
                    organization: {
                      contains: query,
                      mode: "insensitive" as const,
                    },
                  },
                ],
              }
            : {}),
        }
      : undefined

  const [totalCount, pendingCount, followUpCount, approvedCount, rejectedCount, applications] =
    await Promise.all([
      prisma.membershipApplication.count(),
      prisma.membershipApplication.count({ where: { status: "PENDING" } }),
      prisma.membershipApplication.count({ where: { status: "FOLLOW_UP" } }),
      prisma.membershipApplication.count({ where: { status: "APPROVED" } }),
      prisma.membershipApplication.count({ where: { status: "REJECTED" } }),
      prisma.membershipApplication.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
        take: 18,
      }),
    ])

  return (
    <div className="dashboard-content">
      <section className="dashboard-hero">
        <div>
          <span className="section-label">Overview</span>
          <h1 className="dashboard-title">Membership review dashboard</h1>
          <p className="dashboard-copy">
            Monitor every application, identify items waiting for follow-up, and
            move qualified members through approval faster.
          </p>
        </div>
      </section>

      <section className="dashboard-stat-grid">
        <article className="stat-card">
          <span className="profile-meta-label">Total applications</span>
          <strong className="stat-value">{totalCount}</strong>
        </article>
        <article className="stat-card">
          <span className="profile-meta-label">Pending review</span>
          <strong className="stat-value">{pendingCount}</strong>
        </article>
        <article className="stat-card">
          <span className="profile-meta-label">Follow-up queue</span>
          <strong className="stat-value">{followUpCount}</strong>
        </article>
        <article className="stat-card">
          <span className="profile-meta-label">Approved members</span>
          <strong className="stat-value">{approvedCount}</strong>
        </article>
        <article className="stat-card">
          <span className="profile-meta-label">Rejected</span>
          <strong className="stat-value">{rejectedCount}</strong>
        </article>
      </section>

      <section className="dashboard-panel">
        <div className="panel-heading-row">
          <div>
            <p className="panel-kicker">Applications</p>
            <h2 className="dashboard-section-title">Review queue</h2>
          </div>
        </div>

        <form className="dashboard-toolbar" method="get">
          <input
            className="form-input"
            type="search"
            name="q"
            placeholder="Search applicant, email, organization, or reference"
            defaultValue={query}
          />
          <select
            className="form-input"
            name="status"
            defaultValue={statusFilter}
          >
            <option value="ALL">All statuses</option>
            <option value="PENDING">Pending review</option>
            <option value="FOLLOW_UP">Follow-up needed</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <button className="btn btn-primary" type="submit">
            Filter List
          </button>
        </form>

        <div className="dashboard-table">
          <div className="dashboard-table-row dashboard-table-head">
            <span>Applicant</span>
            <span>Membership</span>
            <span>Status</span>
            <span>Submitted</span>
            <span>Action</span>
          </div>
          {applications.map((application) => (
            <div key={application.id} className="dashboard-table-row">
              <div>
                <strong>
                  {application.firstName} {application.lastName}
                </strong>
                <p>{application.organization}</p>
                <span>{application.applicationNumber}</span>
              </div>
              <div>
                <strong>{formatMembershipType(application.membershipType)}</strong>
                <p>{application.email}</p>
              </div>
              <div>
                <StatusBadge status={application.status} />
              </div>
              <div>{application.createdAt.toLocaleDateString()}</div>
              <div>
                <Link
                  href={`/admin/dashboard/applications/${application.id}`}
                  className="btn btn-outline"
                >
                  Review
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
