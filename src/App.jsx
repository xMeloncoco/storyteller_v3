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
  scene: "Detective agency, late evening, raining outside",
  characters_present: ["Sable", "Pell"],
  positions: {
    Sable: "seated at desk, far side of room",
    Pell: "standing near filing cabinet, left wall"
  },
  intentions: {
    Sable: "assess whether the client is worth her time",
    Pell: "stay out of the way, look busy"
  },
  plot_flags: {},
  what_characters_know: {
    Sable: ["a client has walked in", "nothing else yet"],
    Pell: ["a client has walked in", "nothing else yet"]
  }
}

const OPENING_MESSAGE = {
  id: 0,
  role: 'narrator',
  content: `The rain hasn't let up in three days. You find the address scrawled on a damp business card — third floor, end of the hall. The sign on the frosted glass reads "Sable & Associates," though the "Associates" looks like it was added later, in cheaper paint.

You push the door open. The hinges groan.

Inside, the office is small and cluttered. A desk lamp throws a yellow cone of light across stacks of folders. Behind the desk sits a woman — dark hair pulled back, sharp eyes that don't look up when you enter. She turns a page in the file she's reading as if you aren't there.

In the far corner, a young man freezes mid-motion near a filing cabinet, a folder half-pulled from a drawer. He glances at you, then at the woman, then back at you. His mouth opens, but nothing comes out.

The rain taps against the window. The clock on the wall reads 11:47 PM.`
}

function loadMessages() {
  try {
    const saved = localStorage.getItem('storyteller_messages')
    if (saved) {
      const parsed = JSON.parse(saved)
      if (parsed.length > 0) return parsed
    }
  } catch { /* fall through */ }
  return [OPENING_MESSAGE]
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

  const handleClearHistory = () => {
    setMessages([OPENING_MESSAGE])
    setWorldState(INITIAL_WORLD_STATE)
    logger.log('Chat history and world state cleared — scene reset')
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

          {messages.length > 1 && (
            <button className="clear-history-btn" onClick={handleClearHistory}>
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
