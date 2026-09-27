import React, { useState, useEffect, useRef } from 'react'
import {
  Upload, FileText, CheckCircle2, AlertCircle,
  Send, Bot, User, ChevronDown, ChevronUp,
  Loader2, Database, Layers
} from 'lucide-react'

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

// ─── Small helpers ───────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  return (
    <span className={`badge ${status}`}>
      {status === 'processing' && <Loader2 size={11} className="spin" />}
      {status === 'ready'      && <CheckCircle2 size={11} />}
      {status === 'failed'     && <AlertCircle size={11} />}
      {status}
    </span>
  )
}

function SourcesAccordion({ sources, msgId }) {
  const [open, setOpen] = useState(false)
  if (!sources || sources.length === 0) return null
  return (
    <div className="sources-box">
      <div className="sources-toggle" onClick={() => setOpen(o => !o)}>
        <span>Sources ({sources.length} chunk{sources.length > 1 ? 's' : ''} used)</span>
        {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </div>
      {open && (
        <div className="sources-items">
          {sources.map((src, i) => (
            <div key={i} className="source-item">
              <div className="source-filename">
                <FileText size={12} />
                <span>{src.filename} &nbsp;·&nbsp; {src.chunk_id}</span>
              </div>
              <div className="source-snippet">"{src.text_snippet?.slice(0, 180)}…"</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [docs, setDocs]               = useState([])
  const [selectedIds, setSelectedIds] = useState([])
  const [uploading, setUploading]     = useState(false)
  const [uploadErr, setUploadErr]     = useState(null)

  const [messages, setMessages]       = useState([])
  const [query, setQuery]             = useState('')
  const [querying, setQuerying]       = useState(false)

  const feedRef    = useRef(null)
  const fileRef    = useRef(null)

  // ── Fetch documents ───────────────────────────────────────────────────────
  const loadDocs = async () => {
    try {
      const res = await fetch(`${API}/documents`)
      if (!res.ok) return
      const data = await res.json()
      setDocs(data)
      // Auto-tick any newly-ready documents that weren't selected yet
      const readyIds = data.filter(d => d.status === 'ready').map(d => d.document_id)
      setSelectedIds(prev => {
        if (prev.length === 0) return readyIds
        return prev.filter(id => readyIds.includes(id))
      })
    } catch { /* network hiccup – silently ignore */ }
  }

  useEffect(() => { loadDocs() }, [])

  // Poll every 3 s while anything is still processing
  useEffect(() => {
    if (!docs.some(d => d.status === 'processing')) return
    const id = setInterval(loadDocs, 3000)
    return () => clearInterval(id)
  }, [docs])

  // Scroll chat to bottom on new message
  useEffect(() => {
    if (feedRef.current)
      feedRef.current.scrollTop = feedRef.current.scrollHeight
  }, [messages, querying])

  // ── Upload ────────────────────────────────────────────────────────────────
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadErr(null)
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res = await fetch(`${API}/documents/upload`, { method: 'POST', body: fd })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error || 'Upload failed')
      }
      await loadDocs()
    } catch (err) {
      setUploadErr(err.message)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  // ── Selection helpers ─────────────────────────────────────────────────────
  const readyDocs = docs.filter(d => d.status === 'ready')
  const allSelected = readyDocs.length > 0 && selectedIds.length === readyDocs.length

  const toggleDoc = (id) =>
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )

  const toggleAll = () =>
    setSelectedIds(allSelected ? [] : readyDocs.map(d => d.document_id))

  // ── Send query ────────────────────────────────────────────────────────────
  const handleSend = async (e) => {
    e.preventDefault()
    const q = query.trim()
    if (!q || querying) return
    setQuery('')
    setMessages(m => [...m, { id: Date.now(), role: 'user', content: q }])
    setQuerying(true)
    try {
      const res = await fetch(`${API}/chat/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          document_ids: selectedIds.length > 0 ? selectedIds : null
        })
      })
      if (!res.ok) throw new Error('Backend error')
      const data = await res.json()
      setMessages(m => [...m, {
        id: Date.now() + 1,
        role: 'assistant',
        content: data.answer || 'No answer returned.',
        sources: data.sources || []
      }])
    } catch (err) {
      setMessages(m => [...m, {
        id: Date.now() + 1,
        role: 'assistant',
        content: `Error: ${err.message}`,
        sources: []
      }])
    } finally {
      setQuerying(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div id="root">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="app-header">
        <div className="brand">
          <Layers size={22} />
          Hybrid RAG System
        </div>
        <div className="scope-badge">
          <Database size={14} />
          {selectedIds.length} document{selectedIds.length !== 1 ? 's' : ''} in scope
        </div>
      </header>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="app-layout">

        {/* ── Sidebar ─────────────────────────────────────────────────── */}
        <aside className="sidebar">

          {/* Upload */}
          <div className="sidebar-section">
            <div className="section-title">Upload Document</div>
            <div
              className={`upload-dropzone${uploading ? ' uploading' : ''}`}
              onClick={() => fileRef.current?.click()}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.docx,.txt"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              {uploading ? (
                <>
                  <Loader2 className="upload-icon spin" size={26} />
                  <p className="upload-title">Uploading…</p>
                </>
              ) : (
                <>
                  <Upload className="upload-icon" size={26} />
                  <p className="upload-title">Click to pick a file</p>
                  <p className="upload-hint">PDF · DOCX · TXT</p>
                </>
              )}
            </div>
            {uploadErr && <p className="upload-error">{uploadErr}</p>}
          </div>

          {/* Document list header */}
          <div className="sidebar-section">
            <div className="section-title">
              <span>Documents ({docs.length})</span>
              {readyDocs.length > 0 && (
                <button className="select-all-btn" onClick={toggleAll}>
                  {allSelected ? 'Unselect all' : 'Select all'}
                </button>
              )}
            </div>
          </div>

          {/* Document list */}
          <div className="docs-list-wrap">
            {docs.length === 0 ? (
              <p className="docs-empty">No documents uploaded yet.</p>
            ) : (
              <div className="docs-list">
                {docs.map(doc => (
                  <div key={doc.document_id} className="doc-card">
                    <div className="doc-info">
                      {doc.status === 'ready' && (
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(doc.document_id)}
                          onChange={() => toggleDoc(doc.document_id)}
                        />
                      )}
                      <FileText size={17} color="var(--text-muted)" />
                      <span className="doc-name" title={doc.filename}>{doc.filename}</span>
                    </div>
                    <StatusBadge status={doc.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* ── Chat Area ───────────────────────────────────────────────── */}
        <main className="chat-main">
          <div className="chat-feed" ref={feedRef}>
            {messages.length === 0 && !querying ? (
              <div className="chat-empty">
                <Bot className="chat-empty-icon" size={46} />
                <h3>Hybrid RAG Assistant</h3>
                <p>
                  Upload your documents on the left, tick the ones you want in scope,
                  then ask anything — answers are grounded only in those files.
                </p>
              </div>
            ) : (
              messages.map(msg => (
                <div key={msg.id} className={`msg-row ${msg.role}`}>
                  <div className={`msg-avatar ${msg.role}`}>
                    {msg.role === 'user'
                      ? <User size={17} />
                      : <Bot size={17} />
                    }
                  </div>
                  <div className="msg-body">
                    <div className="msg-bubble">{msg.content}</div>
                    {msg.role === 'assistant' && (
                      <SourcesAccordion sources={msg.sources} msgId={msg.id} />
                    )}
                  </div>
                </div>
              ))
            )}

            {/* Typing indicator */}
            {querying && (
              <div className="msg-row assistant">
                <div className="msg-avatar assistant"><Bot size={17} /></div>
                <div className="msg-body">
                  <div className="msg-bubble" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Loader2 className="spin" size={15} />
                    Searching vectors &amp; generating answer…
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Input ─────────────────────────────────────────────────── */}
          <div className="input-bar">
            <form className="input-form" onSubmit={handleSend}>
              <input
                className="chat-input"
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                disabled={querying}
                placeholder={
                  selectedIds.length > 0
                    ? 'Ask a question about the selected documents…'
                    : 'Select documents above, then ask a question…'
                }
              />
              <button
                type="submit"
                className="send-btn"
                disabled={!query.trim() || querying}
                title="Send"
              >
                <Send size={15} />
              </button>
            </form>
          </div>
        </main>
      </div>
    </div>
  )
}
