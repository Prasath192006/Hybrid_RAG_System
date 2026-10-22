// ─── ChatMessage ──────────────────────────────────────────────────────────────
import { Bot, User } from 'lucide-react'
import SourcesAccordion from './SourcesAccordion'

export default function ChatMessage({ msg }) {
  const isUser = msg.role === 'user'

  return (
    <div className={`msg-row ${msg.role}`} id={`msg-${msg.id}`}>
      {/* Avatar */}
      <div className={`msg-avatar ${msg.role}`} aria-hidden="true">
        {isUser ? <User size={17} /> : <Bot size={17} />}
      </div>

      {/* Content */}
      <div className="msg-content">
        <div className="msg-bubble">{msg.content}</div>
        {!isUser && <SourcesAccordion sources={msg.sources} />}
      </div>
    </div>
  )
}
