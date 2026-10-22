// ─── DocumentCard ─────────────────────────────────────────────────────────────
import StatusBadge from './StatusBadge'

/** Returns file extension class for the coloured icon */
function extClass(filename) {
  const ext = (filename || '').split('.').pop().toLowerCase()
  if (ext === 'pdf')  return 'pdf'
  if (ext === 'docx') return 'docx'
  if (ext === 'txt')  return 'txt'
  return 'other'
}

/** Abbreviation shown inside the coloured icon square */
function extLabel(filename) {
  const ext = (filename || '').split('.').pop().toUpperCase()
  return ext.length <= 4 ? ext : ext.slice(0, 4)
}

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function DocumentCard({ doc, selected, onToggle }) {
  const isReady    = doc.status === 'ready'
  const cls        = `doc-card${selected ? ' is-selected' : ''}`

  return (
    <div className={cls} onClick={() => isReady && onToggle(doc.document_id)}>
      {/* Checkbox — only for ready docs */}
      {isReady ? (
        <input
          id={`chk-${doc.document_id}`}
          type="checkbox"
          className="doc-checkbox"
          checked={selected}
          onChange={() => onToggle(doc.document_id)}
          onClick={e => e.stopPropagation()}
          aria-label={`Select ${doc.filename}`}
        />
      ) : (
        /* placeholder so layout stays consistent */
        <span style={{ width: 16, flexShrink: 0 }} />
      )}

      {/* File-type icon */}
      <div className={`doc-file-icon ${extClass(doc.filename)}`}>
        {extLabel(doc.filename)}
      </div>

      {/* Name + date */}
      <div className="doc-meta">
        <div className="doc-name" title={doc.filename}>{doc.filename}</div>
        {doc.uploadedAt && (
          <div className="doc-date">{formatDate(doc.uploadedAt)}</div>
        )}
      </div>

      {/* Status badge */}
      <StatusBadge status={doc.status} />
    </div>
  )
}
