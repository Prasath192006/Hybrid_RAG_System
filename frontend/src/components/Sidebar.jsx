// ─── Sidebar ──────────────────────────────────────────────────────────────────
import { useRef, useState } from 'react'
import { Upload, Loader2, AlertCircle, FolderOpen } from 'lucide-react'
import DocumentCard from './DocumentCard'

export default function Sidebar({ docs, selectedIds, onToggle, onSelectAll, onUpload, uploading, uploadError }) {
  const fileRef   = useRef(null)
  const [drag, setDrag] = useState(false)

  const readyDocs  = docs.filter(d => d.status === 'ready')
  const allSelected = readyDocs.length > 0 && selectedIds.length === readyDocs.length

  const handleFiles = (files) => {
    if (files && files[0]) onUpload(files[0])
  }

  // ── drag-and-drop handlers
  const onDragOver  = e => { e.preventDefault(); setDrag(true) }
  const onDragLeave = ()  => setDrag(false)
  const onDrop      = e  => {
    e.preventDefault()
    setDrag(false)
    handleFiles(e.dataTransfer.files)
  }

  return (
    <aside className="sidebar">

      {/* ── Upload Section ─────────────────────────────────────────── */}
      <div className="sidebar-section">
        <div className="section-header">
          <span className="section-label">
            <Upload size={12} />
            Upload
          </span>
        </div>

        <div
          id="upload-dropzone"
          className={`dropzone${drag ? ' drag-over' : ''}${uploading ? ' uploading' : ''}`}
          onClick={() => !uploading && fileRef.current?.click()}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          role="button"
          tabIndex={0}
          aria-label="Click or drag to upload a document"
          onKeyDown={e => e.key === 'Enter' && fileRef.current?.click()}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.docx,.txt"
            style={{ display: 'none' }}
            onChange={e => handleFiles(e.target.files)}
          />

          <div className="dropzone-icon">
            {uploading
              ? <Loader2 size={20} className="spin" />
              : <Upload size={20} />
            }
          </div>

          <p className="dropzone-title">
            {uploading ? 'Uploading…' : drag ? 'Drop to upload' : 'Click or drag & drop'}
          </p>
          <p className="dropzone-hint">
            <span>PDF</span>&nbsp;·&nbsp;<span>DOCX</span>&nbsp;·&nbsp;<span>TXT</span>
          </p>

          {uploading && (
            <div className="upload-progress">
              <div className="upload-progress-bar" />
            </div>
          )}
        </div>

        {uploadError && (
          <p className="upload-error">
            <AlertCircle size={13} />
            {uploadError}
          </p>
        )}
      </div>

      {/* ── Documents Section ──────────────────────────────────────── */}
      <div className="sidebar-section" style={{ paddingBottom: '0.65rem' }}>
        <div className="section-header">
          <span className="section-label">
            <FolderOpen size={12} />
            Documents
            <span className="section-count">{docs.length}</span>
          </span>
          {readyDocs.length > 0 && (
            <button
              className="select-all-btn"
              onClick={onSelectAll}
              id="select-all-btn"
            >
              {allSelected ? 'Unselect all' : 'Select all'}
            </button>
          )}
        </div>
      </div>

      {/* ── Document List ──────────────────────────────────────────── */}
      <div className="docs-scroll">
        {docs.length === 0 ? (
          <div className="docs-empty">
            <div className="docs-empty-icon"><FolderOpen size={22} /></div>
            <p>No documents uploaded yet.<br />Upload one to get started.</p>
          </div>
        ) : (
          docs.map(doc => (
            <DocumentCard
              key={doc.document_id}
              doc={doc}
              selected={selectedIds.includes(doc.document_id)}
              onToggle={onToggle}
            />
          ))
        )}
      </div>
    </aside>
  )
}
