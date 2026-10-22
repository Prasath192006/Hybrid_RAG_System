// ─── ChatPanel ────────────────────────────────────────────────────────────────
import { useRef, useEffect, useState } from 'react'
import { Bot, Send, Info } from 'lucide-react'
import ChatMessage from './ChatMessage'

/** Auto-resizing textarea */
function useAutoResize(ref, value) {
  useEffect(() => {
    if (!ref.current) return
    ref.current.style.height = 'auto'
    ref.current.style.height = `${Math.min(ref.current.scrollHeight, 140)}px`
  }, [value])
}

export default function ChatPanel({ messages, querying, selectedIds, onSend }) {
  const [query, setQuery] = useState('')
  const feedRef    = useRef(null)
  const textaRef   = useRef(null)

  useAutoResize(textaRef, query)

  // Scroll chat to bottom whenever messages change or query is in flight
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight
    }
  }, [messages, querying])

  const handleSubmit = (e) => {
    e.preventDefault()
    const q = query.trim()
    if (!q || querying || selectedIds.length === 0) return
    onSend(q)
    setQuery('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const canSend = query.trim().length > 0 && !querying && selectedIds.length > 0

  return (
    <main className="chat-main">
      {/* ── Feed ─────────────────────────────────────────────────────── */}
      <div className="chat-feed" ref={feedRef} id="chat-feed">
        {messages.length === 0 && !querying ? (
          /* Empty state */
          <div className="chat-empty fade-in">
            <div className="chat-empty-glow">
              <Bot size={38} />
            </div>
            <h2>Hybrid <span className="text-gradient">RAG</span> Assistant</h2>
            <p>
              Ask any question and get grounded answers drawn strictly
              from your uploaded documents — no hallucination.
            </p>
            <div className="chat-empty-steps">
              <div className="step-item">
                <div className="step-num">1</div>
                Upload a PDF, DOCX, or TXT in the sidebar
              </div>
              <div className="step-item">
                <div className="step-num">2</div>
                Wait for the status to show <strong>ready</strong>, then tick it
              </div>
              <div className="step-item">
                <div className="step-num">3</div>
                Type your question and press Enter
              </div>
            </div>
          </div>
        ) : (
          <>
            {messages.map(msg => (
              <ChatMessage key={msg.id} msg={msg} />
            ))}

            {/* Typing indicator */}
            {querying && (
              <div className="msg-row assistant fade-in">
                <div className="msg-avatar assistant" aria-hidden="true">
                  <Bot size={17} />
                </div>
                <div className="msg-content">
                  <div className="msg-bubble typing-bubble" aria-label="Assistant is typing">
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Input Area ───────────────────────────────────────────────── */}
      <div className="input-area">
        {selectedIds.length === 0 && (
          <p className="no-docs-notice">
            <Info size={13} />
            Select at least one document in the sidebar to start chatting
          </p>
        )}

        <form
          id="chat-form"
          className="input-form"
          onSubmit={handleSubmit}
          aria-label="Chat input"
        >
          <textarea
            id="chat-input"
            ref={textaRef}
            className="chat-textarea"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={querying}
            placeholder={
              selectedIds.length > 0
                ? 'Ask a question… (Enter to send, Shift+Enter for newline)'
                : 'Select documents above first…'
            }
            rows={1}
            aria-label="Chat question input"
          />

          <button
            id="send-btn"
            type="submit"
            className="send-btn"
            disabled={!canSend}
            title="Send (Enter)"
            aria-label="Send message"
          >
            <Send size={16} />
          </button>
        </form>

        <div className="input-meta">
          <span>
            {selectedIds.length > 0
              ? `${selectedIds.length} document${selectedIds.length > 1 ? 's' : ''} in scope`
              : 'No documents selected'}
          </span>
          <span>Hybrid RAG · Qdrant + Gemini</span>
        </div>
      </div>
    </main>
  )
}
