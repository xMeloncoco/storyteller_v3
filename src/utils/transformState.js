/**
 * Transforms Supabase-normalized data into the exact shape
 * that buildSystemPrompt() expects (see src/prompts/systemPrompt.js).
 *
 * This is the single bridge between the Supabase schema and the
 * old JSON-based state format. If the Supabase schema or prompt
 * builder changes, update this file.
 */

/**
 * Map Supabase character type to prompt builder type.
 * Supabase: "User", "Main", "Support", "Antagonist"
 * Prompt:   "user", "main", "side", "side"
 */
function mapCharacterType(supabaseType) {
  const map = {
    'User': 'user',
    'Main': 'main',
    'Support': 'side',
    'Antagonist': 'side',
  }
  return map[supabaseType] || 'side'
}

/**
 * Convert numeric trust (0.0–1.0) to string trust_level.
 * Matches the relationship value scale from supabase_structure.md.
 */
function trustToLevel(trust) {
  if (trust == null) return 'none'
  const n = Number(trust)
  if (n <= 0.2) return 'none'
  if (n <= 0.4) return 'low'
  if (n <= 0.6) return 'moderate'
  if (n <= 0.8) return 'high'
  return 'very high'
}

/**
 * Format personality_traits JSONB array into a comma-separated string.
 * The prompt builder expects `sheet.personality` as a plain string.
 */
function formatTraits(traits) {
  if (!traits) return ''
  if (typeof traits === 'string') return traits
  if (Array.isArray(traits)) return traits.join(', ')
  return ''
}

/**
 * Generate a slug from a location name for use as an object key.
 * "Ink & Steel Tattoo Studio" → "ink_steel_tattoo_studio"
 */
function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}

/**
 * Main transform function.
 * Input: raw Supabase data as returned by fetchPlaythroughState().
 * Output: the exact shape buildSystemPrompt() accepts.
 */
export function supabaseToPromptShape({
  characters = [],
  relationships = [],
  locations = [],
  worldState = {},
  sceneState = {},
  physicalStates = [],
  liveStates = [],
  storySummary = {},
  playthrough = {},
  story = {},
  sceneSummaries = [],
}) {
  // Build lookup: character ID → live state
  const liveStateMap = {}
  for (const ls of liveStates) {
    liveStateMap[ls.character_id] = ls
  }

  // Build lookup: character ID → physical state
  const physicalStateMap = {}
  for (const ps of physicalStates) {
    physicalStateMap[ps.character_id] = ps
  }

  // Build lookup: character ID → name
  const charIdToName = {}
  for (const c of characters) {
    charIdToName[c.id] = c.name
  }

  // ── Characters ──────────────────────────────────────────────
  // Convert array of rows to { "Name": { type, sheet, state } }
  const charactersObj = {}
  for (const char of characters) {
    const ls = liveStateMap[char.id] || {}
    const firstName = char.name ? char.name.split(' ')[0] : char.name

    charactersObj[firstName] = {
      type: mapCharacterType(char.type),
      sheet: {
        name: char.name,
        age: char.age,
        physical: char.appearance || '',
        personality: formatTraits(char.personality_traits),
        background: char.backstory || '',
        role: char.role || '',
        hard_rules: char.hard_rules || [],
        communication_style: char.speech_patterns || '',
        speech_style: char.sentence_structure || '',
        example_correct: char.example_correct || undefined,
        example_correct_2: char.example_correct_2 || undefined,
        example_incorrect: char.example_incorrect || undefined,
        example_incorrect_2: char.example_incorrect_2 || undefined,
      },
      state: {
        current_mood: ls.current_mood || '',
        current_goal: ls.current_goal || '',
        knowledge: ls.knowledge || [],
      },
    }
  }

  // ── Relationships ───────────────────────────────────────────
  // Convert array of rows to { "A→B": { perception, trust_level, last_updated } }
  const relationshipsObj = {}
  for (const rel of relationships) {
    const fromName = rel.from_character?.name
      ? rel.from_character.name.split(' ')[0]
      : charIdToName[rel.from_character_id]?.split(' ')[0] || 'Unknown'
    const toName = rel.to_character?.name
      ? rel.to_character.name.split(' ')[0]
      : charIdToName[rel.to_character_id]?.split(' ')[0] || 'Unknown'

    const key = `${fromName}→${toName}`
    relationshipsObj[key] = {
      perception: rel.perception || '',
      trust_level: trustToLevel(rel.trust),
      last_updated: rel.last_updated_scene != null
        ? `scene ${rel.last_updated_scene}`
        : 'pre-scene',
    }
  }

  // ── World State ─────────────────────────────────────────────
  // Direct 1:1 mapping
  const worldStateObj = {
    current_location: worldState.current_location || '',
    time_of_day: worldState.time_of_day || '',
    weather: worldState.weather || '',
    characters_present: worldState.characters_present || [],
  }

  // ── Scene State ─────────────────────────────────────────────
  // Merge scene_state row + character_physical_states
  const charPhysicalObj = {}
  for (const ps of physicalStates) {
    const charName = ps.character?.name
      ? ps.character.name.split(' ')[0]
      : charIdToName[ps.character_id]?.split(' ')[0] || 'Unknown'

    charPhysicalObj[charName] = {
      position: ps.position || '',
      posture: ps.posture || '',
      left_hand: ps.left_hand || '',
      right_hand: ps.right_hand || '',
      distance_from_user: ps.distance_from_user || '',
      facing: ps.facing || '',
      last_moved: ps.last_moved_turn || 0,
    }
  }

  const sceneNum = sceneState.scene_number || 1
  const sceneStateObj = {
    scene_id: `scene_${String(sceneNum).padStart(3, '0')}`,
    scene_intent: sceneState.scene_intent || '',
    tone: sceneState.tone || '',
    pacing: sceneState.pacing || '',
    turn_count: sceneState.turn_count || 0,
    rolling_summary: sceneState.rolling_summary || '',
    last_summary_at_turn: sceneState.last_summary_at_turn || 0,
    plot_flags: sceneState.plot_flags || {},
    character_physical_states: charPhysicalObj,
  }

  // ── Location Info ───────────────────────────────────────────
  const locationsMap = {}
  for (const loc of locations) {
    const slug = slugify(loc.name)
    locationsMap[slug] = {
      name: loc.name,
      area: loc.area || '',
      description: loc.description || '',
      atmosphere: loc.atmosphere || '',
    }
  }

  const locationInfoObj = {
    locations: locationsMap,
    current_location_notes: '', // Not stored in Supabase per-location, empty for now
  }

  // ── Story Summary ───────────────────────────────────────────
  const completedScenes = sceneSummaries.map(s => `scene_${String(s.scene_number).padStart(3, '0')}`)
  const storySummaryObj = {
    summary: storySummary.summary_text || '',
    scenes_completed: completedScenes,
    total_turns: playthrough.total_turns || 0,
    story_title: story?.title || '',
  }

  // ── User name ───────────────────────────────────────────────
  const userChar = characters.find(c => c.type === 'User')
  const userFullName = userChar?.name || playthrough.user_character_name || 'the Player'
  const userName = userFullName.split(' ')[0]

  return {
    characters: charactersObj,
    relationships: relationshipsObj,
    worldState: worldStateObj,
    sceneState: sceneStateObj,
    storySummary: storySummaryObj,
    locationInfo: locationInfoObj,
    userName,
    userFullName,
  }
}
