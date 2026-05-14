import Link from "next/link"

import { logoutAdmin } from "@/app/admin/actions"
import { requirePortalSession } from "@/lib/auth"

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await requirePortalSession("ADMIN")

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <div>
          <span className="section-label">Admin Platform</span>
          <h1 className="dashboard-brand">Membership Command Center</h1>
          <p className="dashboard-sidebar-copy">
            Review applicants, monitor approvals, and follow up on missing
            requirements.
          </p>
        </div>

        <nav className="dashboard-nav">
          <Link href="/admin/dashboard" className="dashboard-nav-link">
            Overview
          </Link>
        </nav>

        <div className="dashboard-sidebar-user">
          <span className="profile-meta-label">Signed in as</span>
          <strong>{session.user.email}</strong>
        </div>

        <form action={logoutAdmin}>
          <button type="submit" className="btn btn-outline dashboard-sidebar-btn">
            Sign Out
          </button>
        </form>
      </aside>
      <main className="dashboard-main">{children}</main>
    </div>
  )
}
