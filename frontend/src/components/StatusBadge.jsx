// ─── StatusBadge ──────────────────────────────────────────────────────────────
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'

export default function StatusBadge({ status }) {
  return (
    <span className={`badge ${status}`} title={`Status: ${status}`}>
      {status === 'processing' && <Loader2 size={10} className="spin" />}
      {status === 'ready'      && <CheckCircle2 size={10} />}
      {status === 'failed'     && <XCircle size={10} />}
      {status}
    </span>
  )
}
