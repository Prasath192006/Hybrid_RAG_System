import { useState, useEffect, useCallback } from 'react'
import { Layers, Database } from 'lucide-react'
import Sidebar   from './components/Sidebar'
import ChatPanel from './components/ChatPanel'

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

export default function App() {
  // ── Document state ──────────────────────────────────────────────────────────
  const [docs,        setDocs]        = useState([])
  const [selectedIds, setSelectedIds] = useState([])
  const [uploading,   setUploading]   = useState(false)
  const [uploadError, setUploadError] = useState(null)

  // ── Chat state ──────────────────────────────────────────────────────────────
  const [messages, setMessages] = useState([])
  const [querying, setQuerying] = useState(false)

  // ── Load documents ──────────────────────────────────────────────────────────
  const loadDocs = useCallback(async () => {
    try {
      const res = await fetch(`${API}/documents`)
      if (!res.ok) return
      const data = await res.json()
      setDocs(data)

      // Keep only IDs that are still ready; auto-add any new ready docs
      setSelectedIds(prev => {
        const readyIds = data.filter(d => d.status === 'ready').map(d => d.document_id)
        // If nothing selected yet, auto-select all ready docs
        if (prev.length === 0) return readyIds
        // Otherwise keep only previously selected IDs that are still ready
        return prev.filter(id => readyIds.includes(id))
      })
    } catch { /* network hiccup */ }
  }, [])

  // Initial load
  useEffect(() => { loadDocs() }, [loadDocs])

  // Poll every 3 s while anything is still processing
  useEffect(() => {
    if (!docs.some(d => d.status === 'processing')) return
    const id = setInterval(loadDocs, 3000)
    return () => clearInterval(id)
  }, [docs, loadDocs])

  // ── Upload ──────────────────────────────────────────────────────────────────
  const handleUpload = async (file) => {
    setUploading(true)
    setUploadError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch(`${API}/documents/upload`, { method: 'POST', body: fd })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Upload failed (${res.status})`)
      }
      await loadDocs()
    } catch (err) {
      setUploadError(err.message)
    } finally {
      setUploading(false)
    }
  }

  // ── Document selection ──────────────────────────────────────────────────────
  const toggleDoc = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const toggleAll = () => {
    const readyIds = docs.filter(d => d.status === 'ready').map(d => d.document_id)
    const allSelected = readyIds.length > 0 && selectedIds.length === readyIds.length
    setSelectedIds(allSelected ? [] : readyIds)
  }

  // ── Chat query ──────────────────────────────────────────────────────────────
  const handleSend = async (q) => {
    // Append user message immediately
    const userMsg = { id: Date.now(), role: 'user', content: q }
    setMessages(prev => [...prev, userMsg])
    setQuerying(true)

    try {
      const res = await fetch(`${API}/chat/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          document_ids: selectedIds.length > 0 ? selectedIds : null,
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Server error (${res.status})`)
      }

      const data = await res.json()
      setMessages(prev => [...prev, {
        id:      Date.now() + 1,
        role:    'assistant',
        content: data.answer  || 'No answer returned.',
        sources: data.sources || [],
      }])
    } catch (err) {
      setMessages(prev => [...prev, {
        id:      Date.now() + 1,
        role:    'assistant',
        content: `⚠ Error: ${err.message}`,
        sources: [],
      }])
    } finally {
      setQuerying(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div id="root">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="app-header">
        <div className="header-left">
          <div className="brand-logo" aria-hidden="true">
            <Layers size={18} />
          </div>
          <span className="brand-name">
            <span>Hybrid RAG</span>&nbsp;System
          </span>
        </div>

        <div className="header-right">
          <div className={`scope-pill${selectedIds.length > 0 ? ' has-docs' : ''}`}
               title={`${selectedIds.length} document(s) in scope`}>
            <Database size={13} />
            {selectedIds.length} doc{selectedIds.length !== 1 ? 's' : ''} in scope
          </div>
        </div>
      </header>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div className="app-body">
        <Sidebar
          docs={docs}
          selectedIds={selectedIds}
          onToggle={toggleDoc}
          onSelectAll={toggleAll}
          onUpload={handleUpload}
          uploading={uploading}
          uploadError={uploadError}
        />

        <ChatPanel
          messages={messages}
          querying={querying}
          selectedIds={selectedIds}
          onSend={handleSend}
        />
      </div>
    </div>
  )
}
