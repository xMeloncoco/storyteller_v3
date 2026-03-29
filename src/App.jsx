import { useState, useEffect } from 'react'
import ChatPanel from './components/ChatPanel'
import LogPanel from './components/LogPanel'
import WorldStatePanel from './components/WorldStatePanel'
import SystemPromptPanel from './components/SystemPromptPanel'
import { useLogger } from './hooks/useLogger'
import './App.css'

const HARDCODED_WORLD_STATE = {
  turn: 0,
  location: "The Rusty Lantern Inn",
  time: "evening",
  characters: {
    player: {
      name: "Unnamed Adventurer",
      position: "main hall",
      status: "healthy"
    },
    innkeeper: {
      name: "Marta",
      position: "behind the bar",
      mood: "friendly",
      knows: ["player just arrived"]
    },
    stranger: {
      name: "Hooded Figure",
      position: "corner booth",
      mood: "watchful",
      knows: []
    }
  },
  flags: {
    quest_available: true,
    inn_door_locked: false
  }
}

const HARDCODED_SYSTEM_PROMPT = `You are a narrator for an interactive story. Follow these rules strictly:

NARRATOR RULES:
- Never write the player character's actions, words, or thoughts
- Only describe what the world and NPCs do in response to the player
- Maintain consistent character personalities
- Respect what each character knows — no metagaming
- Keep descriptions vivid but concise (2-4 paragraphs)

CURRENT SCENE:
Location: The Rusty Lantern Inn
Time: Evening
Present: Marta (innkeeper, behind bar), Hooded Figure (corner booth)

SCRATCHPAD — think through before responding:
[ ] Who is present in the scene?
[ ] What does each character want right now?
[ ] What would each character naturally do in response?
[ ] Does any character know something they shouldn't? If so, don't use it.`

function loadMessages() {
  try {
    const saved = localStorage.getItem('storyteller_messages')
    return saved ? JSON.parse(saved) : []
  } catch {
    return []
  }
}

function App() {
  const [messages, setMessages] = useState(loadMessages)
  const [worldState] = useState(HARDCODED_WORLD_STATE)
  const logger = useLogger()

  useEffect(() => {
    localStorage.setItem('storyteller_messages', JSON.stringify(messages))
  }, [messages])

  const handleSendMessage = (text) => {
    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: text,
    }
    setMessages(prev => [...prev, userMessage])
    logger.success(`Message sent: "${text.slice(0, 50)}${text.length > 50 ? '...' : ''}"`)

    // Simulate a narrator response (Phase 1 — no AI yet)
    setTimeout(() => {
      const narratorMessage = {
        id: Date.now() + 1,
        role: 'narrator',
        content: `[No AI connected yet — this is a placeholder response to: "${text}"]`,
      }
      setMessages(prev => [...prev, narratorMessage])
      logger.log('Narrator response generated (placeholder — no AI connected)')
    }, 500)

    // Simulate a fake error every 3rd message for testing
    if ((messages.length / 2 + 1) % 3 === 0) {
      logger.error(`Simulated error: DeepSeek API call failed (this is a test error for debugging)`)
      logger.warn('Retry logic would trigger here in production')
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>AI Storyteller</h1>
        <div className="header-right">
          <span className="turn-counter">Turn {messages.filter(m => m.role === 'user').length}</span>
          {messages.length > 0 && (
            <button
              className="clear-history-btn"
              onClick={() => {
                setMessages([])
                logger.log('Chat history cleared')
              }}
            >
              Clear History
            </button>
          )}
        </div>
      </header>

      <main className="main-area">
        <ChatPanel messages={messages} onSendMessage={handleSendMessage} />
      </main>

      <aside className="sidebar">
        <LogPanel logs={logger.logs} onClear={logger.clearLogs} />
        <WorldStatePanel worldState={worldState} />
        <SystemPromptPanel systemPrompt={HARDCODED_SYSTEM_PROMPT} />
      </aside>
    </div>
  )
}

export default App
