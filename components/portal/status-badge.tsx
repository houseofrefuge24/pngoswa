import { formatMembershipStatus, getStatusTone } from "@/lib/membership"

type StatusBadgeProps = {
  status: string
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const tone = getStatusTone(status)

  return (
    <span className={`status-badge status-badge-${tone}`}>
      {formatMembershipStatus(status)}
    </span>
  )
}
