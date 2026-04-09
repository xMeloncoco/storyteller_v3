import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  fetchPlaythroughState,
  insertMessage,
  updateWorldState as svcUpdateWorldState,
  updateSceneState as svcUpdateSceneState,
  updateCharacterPhysicalState as svcUpdatePhysicalState,
  updateCharacterLiveState as svcUpdateLiveState,
  updateTriggerState as svcUpdateTriggerState,
  updatePlaythroughRow,
  updateRelationship as svcUpdateRelationship,
  upsertStorySummary,
  insertSceneSummary,
  createNewScene,
  updateArcProgress as svcUpdateArcProgress,
} from '../api/playthroughService'
import { supabaseToPromptShape } from '../utils/transformState'

/**
 * Central state hook for a playthrough. Replaces useStoryState.
 * Fetches all state from Supabase on mount, holds in React state,
 * and exposes update functions that write to both local state and Supabase.
 */
export function usePlaythrough(playthroughId) {
  const [data, setData] = useState(null)
  const [messages, setMessages] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  // Fetch all state when playthroughId changes
  useEffect(() => {
    if (!playthroughId) {
      setData(null)
      setMessages([])
      setIsLoading(false)
      setError(null)
      return
    }

    let cancelled = false
    setIsLoading(true)
    setError(null)

    fetchPlaythroughState(playthroughId)
      .then(result => {
        if (cancelled) return
        setData(result)
        // Transform messages from Supabase shape to component shape
        setMessages(
          (result.messages || []).map(msg => ({
            id: msg.id || Date.now(),
            role: msg.role === 'assistant' ? 'narrator' : msg.role,
            content: msg.content,
            sceneNumber: msg.scene_number,
            turnNumber: msg.turn_number,
            backgroundContext: msg.background_context,
            worldBackground: msg.world_background,
          }))
        )
        setIsLoading(false)
      })
      .catch(err => {
        if (cancelled) return
        setError(err)
        setIsLoading(false)
      })

    return () => { cancelled = true }
  }, [playthroughId])

  // ── Lookup maps ─────────────────────────────────────────────

  const characterNameToId = useMemo(() => {
    if (!data?.characters) return {}
    const map = {}
    for (const c of data.characters) {
      map[c.name] = c.id
      // Also map by first name for convenience
      const firstName = c.name.split(' ')[0]
      if (firstName !== c.name) map[firstName] = c.id
    }
    return map
  }, [data?.characters])

  const triggerConditionToId = useMemo(() => {
    if (!data?.triggers) return {}
    const map = {}
    for (const t of data.triggers) {
      map[t.id] = t.id
      map[t.condition] = t.id
    }
    return map
  }, [data?.triggers])

  // ── Derived values ──────────────────────────────────────────

  const promptState = useMemo(() => {
    if (!data) return null
    return supabaseToPromptShape(data)
  }, [data])

  const userChar = data?.characters?.find(c => c.type === 'User')
  const userFullName = userChar?.name || data?.playthrough?.user_character_name || 'the Player'
  const userName = userFullName.split(' ')[0]
  const storyTitle = data?.story?.title || ''
  const turnCount = data?.sceneState?.turn_count || 0
  const sceneNumber = data?.sceneState?.scene_number || 1
  const initialMessage = data?.story?.initial_message || ''

  // ── Update functions ────────────────────────────────────────

  const updateWorldState = useCallback(async (changes) => {
    setData(prev => {
      if (!prev) return prev
      return { ...prev, worldState: { ...prev.worldState, ...changes } }
    })
    try {
      await svcUpdateWorldState(playthroughId, changes)
    } catch (err) {
      console.error('Failed to persist world state:', err)
    }
  }, [playthroughId])

  const updateSceneState = useCallback(async (changes) => {
    setData(prev => {
      if (!prev) return prev
      return { ...prev, sceneState: { ...prev.sceneState, ...changes } }
    })
    try {
      await svcUpdateSceneState(playthroughId, changes)
    } catch (err) {
      console.error('Failed to persist scene state:', err)
    }
  }, [playthroughId])

  const updateCharacterPhysicalState = useCallback(async (characterName, changes) => {
    const characterId = characterNameToId[characterName]
    if (!characterId) {
      console.error(`Character not found: ${characterName}`)
      return
    }

    setData(prev => {
      if (!prev) return prev
      return {
        ...prev,
        physicalStates: prev.physicalStates.map(ps =>
          ps.character_id === characterId ? { ...ps, ...changes } : ps
        ),
      }
    })
    try {
      await svcUpdatePhysicalState(playthroughId, characterId, changes)
    } catch (err) {
      console.error('Failed to persist physical state:', err)
    }
  }, [playthroughId, characterNameToId])

  const updateCharacterLiveState = useCallback(async (characterName, changes) => {
    const characterId = characterNameToId[characterName]
    if (!characterId) {
      console.error(`Character not found: ${characterName}`)
      return
    }

    setData(prev => {
      if (!prev) return prev
      return {
        ...prev,
        liveStates: prev.liveStates.map(ls =>
          ls.character_id === characterId ? { ...ls, ...changes } : ls
        ),
      }
    })
    try {
      await svcUpdateLiveState(playthroughId, characterId, changes)
    } catch (err) {
      console.error('Failed to persist live state:', err)
    }
  }, [playthroughId, characterNameToId])

  const updateTriggerState = useCallback(async (triggerId, changes) => {
    const resolvedId = triggerConditionToId[triggerId] || triggerId

    setData(prev => {
      if (!prev) return prev
      return {
        ...prev,
        triggerStates: prev.triggerStates.map(ts =>
          ts.trigger_id === resolvedId ? { ...ts, ...changes } : ts
        ),
      }
    })
    try {
      await svcUpdateTriggerState(playthroughId, resolvedId, changes)
    } catch (err) {
      console.error('Failed to persist trigger state:', err)
    }
  }, [playthroughId, triggerConditionToId])

  const updateRelationships = useCallback(async (relationshipId, changes) => {
    setData(prev => {
      if (!prev) return prev
      return {
        ...prev,
        relationships: prev.relationships.map(r =>
          r.id === relationshipId ? { ...r, ...changes } : r
        ),
      }
    })
    try {
      await svcUpdateRelationship(relationshipId, changes)
    } catch (err) {
      console.error('Failed to persist relationship:', err)
    }
  }, [])

  const updateStorySummary = useCallback(async (summaryText) => {
    setData(prev => {
      if (!prev) return prev
      return {
        ...prev,
        storySummary: { ...prev.storySummary, summary_text: summaryText },
      }
    })
    try {
      await upsertStorySummary(playthroughId, summaryText)
    } catch (err) {
      console.error('Failed to persist story summary:', err)
    }
  }, [playthroughId])

  const updatePlaythrough = useCallback(async (changes) => {
    setData(prev => {
      if (!prev) return prev
      return {
        ...prev,
        playthrough: { ...prev.playthrough, ...changes },
      }
    })
    try {
      await updatePlaythroughRow(playthroughId, changes)
    } catch (err) {
      console.error('Failed to persist playthrough:', err)
    }
  }, [playthroughId])

  /**
   * Add a message to local state and persist to Supabase.
   * Accepts the component-friendly shape (with debug, displayText).
   * Persists only the DB-relevant fields to Supabase.
   */
  const addMessage = useCallback(async (message) => {
    const localMsg = {
      id: Date.now() + Math.random(),
      role: message.role,
      content: message.content,
      displayText: message.displayText,
      debug: message.debug,
      sceneNumber: message.sceneNumber,
      turnNumber: message.turnNumber,
    }

    setMessages(prev => [...prev, localMsg])

    // Persist to Supabase — map 'narrator' to 'assistant' for DB
    try {
      await insertMessage(playthroughId, {
        sceneNumber: message.sceneNumber,
        turnNumber: message.turnNumber,
        role: message.role === 'narrator' ? 'assistant' : message.role,
        content: message.content,
        backgroundContext: message.backgroundContext || null,
        worldBackground: message.worldBackground || null,
      })
    } catch (err) {
      console.error('Failed to persist message:', err)
    }
  }, [playthroughId])

  /**
   * End the current scene: insert summary, create new scene row.
   */
  const endScene = useCallback(async ({
    summaryText, keyEvents, flagsSet, newSceneIntent,
  }) => {
    const currentScene = data?.sceneState?.scene_number || 1
    const newSceneNumber = currentScene + 1

    try {
      await insertSceneSummary(playthroughId, {
        sceneNumber: currentScene,
        summaryText,
        keyEvents,
        flagsSet,
      })

      await createNewScene(playthroughId, newSceneNumber, newSceneIntent || '')

      // Update local state
      setData(prev => {
        if (!prev) return prev
        return {
          ...prev,
          sceneState: {
            playthrough_id: playthroughId,
            scene_number: newSceneNumber,
            scene_intent: newSceneIntent || '',
            tone: '',
            pacing: '',
            turn_count: 0,
            rolling_summary: '',
            last_summary_at_turn: 0,
            plot_flags: {},
            is_active: true,
          },
          sceneSummaries: [
            ...prev.sceneSummaries,
            {
              scene_number: currentScene,
              summary_text: summaryText,
              key_events: keyEvents,
              flags_set: flagsSet,
            },
          ],
        }
      })
    } catch (err) {
      console.error('Failed to end scene:', err)
      throw err
    }
  }, [playthroughId, data?.sceneState?.scene_number])

  return {
    // Loading states
    isLoading,
    error,

    // Raw data (for debug panels and internal use)
    data,
    messages,

    // Prompt-shaped state (memoized transform)
    promptState,

    // Derived values
    userName,
    userFullName,
    storyTitle,
    turnCount,
    sceneNumber,
    initialMessage,

    // Update functions
    updateWorldState,
    updateSceneState,
    updateCharacterPhysicalState,
    updateCharacterLiveState,
    updateTriggerState,
    updateRelationships,
    updateStorySummary,
    updatePlaythrough,
    addMessage,
    endScene,
  }
}
