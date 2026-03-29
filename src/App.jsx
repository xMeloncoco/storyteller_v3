import { useState, useEffect, useRef } from 'react'
import ChatPanel from './components/ChatPanel'
import LogPanel from './components/LogPanel'
import WorldStatePanel from './components/WorldStatePanel'
import SystemPromptPanel from './components/SystemPromptPanel'
import { useLogger } from './hooks/useLogger'
import './App.css'

const INITIAL_WORLD_STATE = {
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

function loadWorldState() {
  try {
    const saved = localStorage.getItem('storyteller_world_state')
    return saved ? JSON.parse(saved) : INITIAL_WORLD_STATE
  } catch {
    return INITIAL_WORLD_STATE
  }
}

function App() {
  const [messages, setMessages] = useState(loadMessages)
  const [worldState, setWorldState] = useState(loadWorldState)
  const [activePanel, setActivePanel] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const logger = useLogger()

  useEffect(() => {
    localStorage.setItem('storyteller_messages', JSON.stringify(messages))
  }, [messages])

  useEffect(() => {
    localStorage.setItem('storyteller_world_state', JSON.stringify(worldState))
  }, [worldState])

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  const handleSendMessage = (text) => {
    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: text,
    }
    setMessages(prev => [...prev, userMessage])
    logger.success(`Message sent: "${text.slice(0, 50)}${text.length > 50 ? '...' : ''}"`)

    // Update world state turn
    setWorldState(prev => ({ ...prev, turn: prev.turn + 1 }))
    logger.log(`World state updated — turn ${worldState.turn + 1}`)

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

  const openPanel = (panel) => {
    setActivePanel(activePanel === panel ? null : panel)
    setMenuOpen(false)
  }

  const errorCount = logger.logs.filter(l => l.level === 'error').length

  return (
    <div className="app">
      <header className="app-header">
        <h1>AI Storyteller</h1>
        <div className="header-right">
          <span className="turn-counter">Turn {worldState.turn}</span>

          <div className="debug-menu" ref={menuRef}>
            <button
              className={`debug-menu-btn ${menuOpen ? 'active' : ''}`}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              Debug
              {errorCount > 0 && <span className="debug-badge">{errorCount}</span>}
            </button>
            {menuOpen && (
              <div className="debug-dropdown">
                <button onClick={() => openPanel('log')}>
                  Activity Log
                  {errorCount > 0 && <span className="menu-badge error">{errorCount} errors</span>}
                </button>
                <button onClick={() => openPanel('worldState')}>
                  World State
                </button>
                <button onClick={() => openPanel('systemPrompt')}>
                  System Prompt
                </button>
              </div>
            )}
          </div>

          {messages.length > 0 && (
            <button
              className="clear-history-btn"
              onClick={() => {
                setMessages([])
                setWorldState(INITIAL_WORLD_STATE)
                logger.log('Chat history and world state cleared')
              }}
            >
              Clear History
            </button>
          )}
        </div>
      </header>

      <main className="main-area">
        <ChatPanel messages={messages} onSendMessage={handleSendMessage} />

        {activePanel === 'log' && (
          <div className="overlay-panel">
            <LogPanel logs={logger.logs} onClear={logger.clearLogs} onClose={() => setActivePanel(null)} />
          </div>
        )}
        {activePanel === 'worldState' && (
          <div className="overlay-panel">
            <WorldStatePanel worldState={worldState} onClose={() => setActivePanel(null)} />
          </div>
        )}
        {activePanel === 'systemPrompt' && (
          <div className="overlay-panel">
            <SystemPromptPanel systemPrompt={HARDCODED_SYSTEM_PROMPT} onClose={() => setActivePanel(null)} />
          </div>
        )}
      </main>
    </div>
  )
}

export default App
