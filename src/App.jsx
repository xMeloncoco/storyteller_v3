import { useState, useEffect, useRef } from 'react'
import ChatPanel from './components/ChatPanel'
import LogPanel from './components/LogPanel'
import WorldStatePanel from './components/WorldStatePanel'
import SystemPromptPanel from './components/SystemPromptPanel'
import StorySelectScreen from './components/StorySelectScreen'
import LoadingScreen from './components/LoadingScreen'
import ErrorScreen from './components/ErrorScreen'
import { useLogger } from './hooks/useLogger'
import { usePlaythrough } from './hooks/usePlaythrough'
import { getNarratorResponse } from './api/deepseek'
import { buildSystemPrompt } from './prompts/systemPrompt'
import './App.css'

function App() {
  // ── Screen navigation ──
  const [screen, setScreen] = useState('select') // 'select' | 'chat'
  const [activePlaythroughId, setActivePlaythroughId] = useState(null)

  // ── Playthrough state (replaces useStoryState + localStorage messages) ──
  const playthrough = usePlaythrough(activePlaythroughId)

  // ── UI state ──
  const [activePanel, setActivePanel] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [currentPrompt, setCurrentPrompt] = useState('')
  const menuRef = useRef(null)
  const logger = useLogger()

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

  // ── Navigation handlers ──

  const handleSelectPlaythrough = (playthroughId) => {
    setActivePlaythroughId(playthroughId)
    setScreen('chat')
    setActivePanel(null)
    setCurrentPrompt('')
    logger.clearLogs()
  }

  const handleBackToStories = () => {
    setScreen('select')
    setActivePlaythroughId(null)
    setActivePanel(null)
    setCurrentPrompt('')
  }

  // ── Prompt builder ──

  const getSystemPrompt = (triggerInstructions = '', relevantMemories = []) => {
    if (!playthrough.promptState) return ''
    return buildSystemPrompt(playthrough.promptState, triggerInstructions, relevantMemories)
  }

  // ── Turn pipeline ──

  const handleSendMessage = async (text) => {
    const sceneNumber = playthrough.sceneNumber
    const newTurn = (playthrough.turnCount || 0) + 1

    // Build the user message
    const userMessage = {
      role: 'user',
      content: text,
      sceneNumber,
      turnNumber: newTurn,
    }

    // Add to local state + Supabase
    playthrough.addMessage(userMessage)
    logger.success(`Message sent: "${text.slice(0, 50)}${text.length > 50 ? '...' : ''}"`)

    // Increment turn count
    playthrough.updateSceneState({ turn_count: newTurn })
    playthrough.updatePlaythrough({
      total_turns: newTurn,
      last_played_at: new Date().toISOString(),
    })
    logger.log(`Turn ${newTurn}`)

    // Build the messages array including the new user message
    // (playthrough.messages won't include it yet due to async state update)
    const messagesForApi = [...playthrough.messages, userMessage]

    // Build system prompt
    const systemPrompt = getSystemPrompt()
    setCurrentPrompt(systemPrompt)

    // Call DeepSeek API
    setIsLoading(true)
    logger.log('Sending request to DeepSeek V3...')

    try {
      const { parsed, debug } = await getNarratorResponse(messagesForApi, systemPrompt)

      playthrough.addMessage({
        role: 'narrator',
        content: parsed.raw,
        displayText: parsed.narrativeText,
        sceneNumber,
        turnNumber: newTurn,
        backgroundContext: parsed.backgroundContext,
        worldBackground: parsed.worldBackground,
        debug,
      })
      logger.success('Narrator response received from DeepSeek V3')
    } catch (err) {
      logger.error(`DeepSeek API error: ${err.message}`)

      playthrough.addMessage({
        role: 'narrator',
        content: `[Error: Could not get a response. ${err.message}]`,
        sceneNumber,
        turnNumber: newTurn,
        debug: { error: err.message },
      })
    } finally {
      setIsLoading(false)
    }
  }

  const openPanel = (panel) => {
    setActivePanel(activePanel === panel ? null : panel)
    setMenuOpen(false)
  }

  // ── Story Select Screen ──

  if (screen === 'select') {
    return <StorySelectScreen onSelectPlaythrough={handleSelectPlaythrough} />
  }

  // ── Loading / Error for playthrough data ──

  if (playthrough.isLoading) {
    return <LoadingScreen message="Loading story..." />
  }

  if (playthrough.error) {
    return (
      <ErrorScreen
        error={playthrough.error}
        onRetry={() => setActivePlaythroughId(activePlaythroughId)}
      />
    )
  }

  // ── Chat Screen ──

  const errorCount = logger.logs.filter(l => l.level === 'error').length

  return (
    <div className="app">
      <header className="app-header">
        <h1>{playthrough.storyTitle || 'AI Storyteller'}</h1>
        <div className="header-right">
          <span className="turn-counter">Turn {playthrough.turnCount || 0}</span>

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

          <button className="clear-history-btn" onClick={handleBackToStories}>
            Back to Stories
          </button>
        </div>
      </header>

      <main className="main-area">
        <ChatPanel
          messages={playthrough.messages}
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
            <WorldStatePanel
              worldState={playthrough.promptState?.worldState || {}}
              onClose={() => setActivePanel(null)}
            />
          </div>
        )}
        {activePanel === 'systemPrompt' && (
          <div className="overlay-panel">
            <SystemPromptPanel
              systemPrompt={currentPrompt || getSystemPrompt()}
              onClose={() => setActivePanel(null)}
            />
          </div>
        )}
      </main>
    </div>
  )
}

export default App
