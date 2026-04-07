import { useState, useEffect, useRef } from 'react'
import ChatPanel from './components/ChatPanel'
import LogPanel from './components/LogPanel'
import WorldStatePanel from './components/WorldStatePanel'
import SystemPromptPanel from './components/SystemPromptPanel'
import { useLogger } from './hooks/useLogger'
import { useStoryState } from './hooks/useStoryState'
import { getNarratorResponse } from './api/deepseek'
import { buildSystemPrompt } from './prompts/systemPrompt'
import './App.css'

function loadMessages() {
  try {
    const saved = localStorage.getItem('storyteller_messages')
    if (saved) {
      const parsed = JSON.parse(saved)
      if (parsed.length > 0) return parsed
    }
  } catch { /* fall through */ }
  return []
}

function App() {
  const [messages, setMessages] = useState(loadMessages)
  const [activePanel, setActivePanel] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [currentPrompt, setCurrentPrompt] = useState('')
  const menuRef = useRef(null)
  const logger = useLogger()
  const storyState = useStoryState()

  useEffect(() => {
    localStorage.setItem('storyteller_messages', JSON.stringify(messages))
  }, [messages])

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

  // Build the current system prompt (for debug display and API calls)
  const getSystemPrompt = (triggerInstructions = '', relevantMemories = []) => {
    return buildSystemPrompt(
      {
        characters: storyState.characters,
        relationships: storyState.relationships,
        worldState: storyState.worldState,
        sceneState: storyState.sceneState,
        storySummary: storyState.storySummary,
        locationInfo: storyState.locationInfo,
        userName: storyState.userName,
      },
      triggerInstructions,
      relevantMemories
    )
  }

  const handleSendMessage = async (text) => {
    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: text,
    }

    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    logger.success(`Message sent: "${text.slice(0, 50)}${text.length > 50 ? '...' : ''}"`)

    // Increment turn count
    const newTurn = (storyState.sceneState.turn_count || 0) + 1
    storyState.updateSceneState({ turn_count: newTurn })
    logger.log(`Turn ${newTurn}`)

    // Build system prompt
    const systemPrompt = getSystemPrompt()
    setCurrentPrompt(systemPrompt)

    // Call DeepSeek API
    setIsLoading(true)
    logger.log('Sending request to DeepSeek V3...')

    try {
      const { text: responseText, debug } = await getNarratorResponse(updatedMessages, systemPrompt)

      const narratorMessage = {
        id: Date.now() + 1,
        role: 'narrator',
        content: responseText,
        debug,
      }
      setMessages(prev => [...prev, narratorMessage])
      logger.success('Narrator response received from DeepSeek V3')
    } catch (err) {
      logger.error(`DeepSeek API error: ${err.message}`)

      const errorMessage = {
        id: Date.now() + 1,
        role: 'narrator',
        content: `[Error: Could not get a response. ${err.message}]`,
        debug: { error: err.message },
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleClearHistory = () => {
    setMessages([])
    storyState.resetToDefaults()
    setCurrentPrompt('')
    logger.log('Chat history and story state reset to defaults')
  }

  const openPanel = (panel) => {
    setActivePanel(activePanel === panel ? null : panel)
    setMenuOpen(false)
  }

  const errorCount = logger.logs.filter(l => l.level === 'error').length
  const turnCount = storyState.sceneState.turn_count || 0

  return (
    <div className="app">
      <header className="app-header">
        <h1>{storyState.storySummary.story_title || 'AI Storyteller'}</h1>
        <div className="header-right">
          <span className="turn-counter">Turn {turnCount}</span>

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
            <WorldStatePanel worldState={storyState.worldState} onClose={() => setActivePanel(null)} />
          </div>
        )}
        {activePanel === 'systemPrompt' && (
          <div className="overlay-panel">
            <SystemPromptPanel systemPrompt={currentPrompt || getSystemPrompt()} onClose={() => setActivePanel(null)} />
          </div>
        )}
      </main>
    </div>
  )
}

export default App
