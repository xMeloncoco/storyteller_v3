import { useState, useEffect, useCallback } from 'react'

// Import default state from JSON files
import defaultCharacters from '../state/characters.json'
import defaultRelationships from '../state/relationships.json'
import defaultWorldState from '../state/world_state.json'
import defaultSceneState from '../state/scene_state.json'
import defaultTriggers from '../state/triggers.json'
import defaultStorySummary from '../state/story_summary.json'
import defaultLocationInfo from '../state/location_info.json'

const STORAGE_KEY = 'storyteller_state'

function loadPersistedState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return JSON.parse(saved)
  } catch { /* fall through */ }
  return null
}

function deepMerge(target, source) {
  const result = { ...target }
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key]) &&
      target[key] &&
      typeof target[key] === 'object' &&
      !Array.isArray(target[key])
    ) {
      result[key] = deepMerge(target[key], source[key])
    } else {
      result[key] = source[key]
    }
  }
  return result
}

/**
 * Single source of truth for all story state.
 * Loads from localStorage if available, otherwise from JSON files.
 * Persists every change to localStorage.
 */
export function useStoryState() {
  const [state, setState] = useState(() => {
    const persisted = loadPersistedState()
    if (persisted) return persisted

    return {
      characters: defaultCharacters,
      relationships: defaultRelationships,
      worldState: defaultWorldState,
      sceneState: defaultSceneState,
      triggers: defaultTriggers,
      storySummary: defaultStorySummary,
      locationInfo: defaultLocationInfo,
    }
  })

  // Persist to localStorage on every change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const updateWorldState = useCallback((changes) => {
    setState(prev => ({
      ...prev,
      worldState: deepMerge(prev.worldState, changes),
    }))
  }, [])

  const updateSceneState = useCallback((changes) => {
    setState(prev => ({
      ...prev,
      sceneState: deepMerge(prev.sceneState, changes),
    }))
  }, [])

  const updateCharacterState = useCallback((characterName, changes) => {
    setState(prev => {
      const char = prev.characters[characterName]
      if (!char) return prev
      return {
        ...prev,
        characters: {
          ...prev.characters,
          [characterName]: {
            ...char,
            state: deepMerge(char.state || {}, changes),
          },
        },
      }
    })
  }, [])

  const updateRelationships = useCallback((changes) => {
    setState(prev => ({
      ...prev,
      relationships: { ...prev.relationships, ...changes },
    }))
  }, [])

  const updateTriggers = useCallback((changes) => {
    setState(prev => ({
      ...prev,
      triggers: { ...prev.triggers, ...changes },
    }))
  }, [])

  const updateStorySummary = useCallback((changes) => {
    setState(prev => ({
      ...prev,
      storySummary: deepMerge(prev.storySummary, changes),
    }))
  }, [])

  const resetToDefaults = useCallback(() => {
    const defaults = {
      characters: defaultCharacters,
      relationships: defaultRelationships,
      worldState: defaultWorldState,
      sceneState: defaultSceneState,
      triggers: defaultTriggers,
      storySummary: defaultStorySummary,
      locationInfo: defaultLocationInfo,
    }
    setState(defaults)
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  /**
   * The userName comes from story_summary.user_character.name,
   * falling back to a generic default.
   */
  const userName = state.storySummary?.user_character?.name || 'the Player'

  return {
    ...state,
    userName,
    updateWorldState,
    updateSceneState,
    updateCharacterState,
    updateRelationships,
    updateTriggers,
    updateStorySummary,
    resetToDefaults,
  }
}
