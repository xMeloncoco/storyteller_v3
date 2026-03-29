import { useState, useEffect, useRef } from 'react'
import ChatPanel from './components/ChatPanel'
import LogPanel from './components/LogPanel'
import WorldStatePanel from './components/WorldStatePanel'
import SystemPromptPanel from './components/SystemPromptPanel'
import { useLogger } from './hooks/useLogger'
import { getNarratorResponse, SYSTEM_PROMPT } from './api/deepseek'
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
  const [isLoading, setIsLoading] = useState(false)
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

  const handleSendMessage = async (text) => {
    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: text,
    }

    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    logger.success(`Message sent: "${text.slice(0, 50)}${text.length > 50 ? '...' : ''}"`)

    // Update world state turn
    setWorldState(prev => ({ ...prev, turn: prev.turn + 1 }))
    logger.log(`World state updated — turn ${worldState.turn + 1}`)

    // Call DeepSeek API
    setIsLoading(true)
    logger.log('Sending request to DeepSeek V3...')

    try {
      const responseText = await getNarratorResponse(updatedMessages)

      const narratorMessage = {
        id: Date.now() + 1,
        role: 'narrator',
        content: responseText,
      }
      setMessages(prev => [...prev, narratorMessage])
      logger.success('Narrator response received from DeepSeek V3')
    } catch (err) {
      logger.error(`DeepSeek API error: ${err.message}`)

      const errorMessage = {
        id: Date.now() + 1,
        role: 'narrator',
        content: `[Error: Could not get a response. ${err.message}]`,
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
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
        <ChatPanel
          messages={messages}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
        />

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
            <SystemPromptPanel systemPrompt={SYSTEM_PROMPT} onClose={() => setActivePanel(null)} />
          </div>
        )}
      </main>
    </div>
  )
}

export default App
