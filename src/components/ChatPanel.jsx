import { useState, useRef, useEffect } from 'react'
import './ChatPanel.css'

export default function ChatPanel({ messages, onSendMessage, isLoading }) {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const handleSend = () => {
    const trimmed = input.trim()
    if (!trimmed || isLoading) return
    onSendMessage(trimmed)
    setInput('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="chat-panel">
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty">
            Type an action for your character to begin...
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`chat-message ${msg.role}`}>
            <div className="chat-message-label">
              {msg.role === 'user' ? 'You' : 'Narrator'}
            </div>
            <div className="chat-message-text">{msg.content}</div>
          </div>
        ))}
        {isLoading && (
          <div className="chat-message narrator">
            <div className="chat-message-label">Narrator</div>
            <div className="chat-typing">
              <span className="dot"></span>
              <span className="dot"></span>
              <span className="dot"></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="chat-input-area">
        <textarea
          className="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isLoading ? 'Waiting for narrator...' : 'What do you do?'}
          rows={2}
          disabled={isLoading}
        />
        <button
          className="chat-send-btn"
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
        >
          {isLoading ? '...' : 'Send'}
        </button>
      </div>
    </div>
  )
}
