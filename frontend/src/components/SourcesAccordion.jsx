// ─── SourcesAccordion ─────────────────────────────────────────────────────────
import { useState } from 'react'
import { ChevronDown, ChevronUp, FileText } from 'lucide-react'

export default function SourcesAccordion({ sources }) {
  const [open, setOpen] = useState(false)

  if (!sources || sources.length === 0) return null

  return (
    <div className="sources-wrap">
      <button
        className="sources-toggle"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        title={open ? 'Hide sources' : 'Show sources'}
      >
        <FileText size={13} />
        <span>
          {sources.length} source{sources.length > 1 ? 's' : ''} used
        </span>
        {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>

      {open && (
        <div className="sources-panel">
          {sources.map((src, i) => {
            const snippet = src.text_snippet || ''
            return (
              <div key={i} className="source-item">
                <div className="source-file">
                  <FileText size={12} />
                  <span>{src.filename}</span>
                  <span className="source-chunk-id">{src.chunk_id}</span>
                </div>
                <p className="source-snippet">
                  &ldquo;{snippet.slice(0, 200)}{snippet.length > 200 ? '…' : ''}&rdquo;
                </p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
