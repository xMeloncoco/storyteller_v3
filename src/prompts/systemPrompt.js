/**
 * Dynamic system prompt builder.
 * Assembles the full narrator prompt from whatever story state is loaded —
 * works with any characters, any setting, any story.
 *
 * Character types:
 *   "user" — the player character. Never controlled by the narrator.
 *   "main" — primary NPC(s). Full sheet, full rules, examples, detailed state.
 *   "side" — supporting NPCs. Sheet + rules included, but lighter framing.
 */

// --- Helpers to sort characters by type ---

function getCharactersByType(characters) {
  const user = []
  const main = []
  const side = []

  for (const [name, char] of Object.entries(characters)) {
    const type = char.type || 'side'
    if (type === 'user') user.push([name, char])
    else if (type === 'main') main.push([name, char])
    else side.push([name, char])
  }

  return { user, main, side }
}

/**
 * Find the user character from the characters object.
 * Returns { name, char } or null.
 */
export function findUserCharacter(characters) {
  for (const [name, char] of Object.entries(characters)) {
    if (char.type === 'user') return { name, char }
  }
  return null
}

// --- Main export ---

export function buildSystemPrompt(state, triggerInstructions = '', relevantMemories = []) {
  const {
    characters = {},
    relationships = {},
    worldState = {},
    sceneState = {},
    storySummary = {},
    locationInfo = {},
  } = state

  const { user, main, side } = getCharactersByType(characters)
  const userChar = user.length > 0 ? user[0] : null
  const userFullName = userChar ? (userChar[1].sheet?.name || userChar[0]) : 'the Player'
  // Use first name in prompt rules for readability
  const userName = userFullName.split(' ')[0]

  const sections = [
    buildNarratorIdentity(),
    buildNarrationRules(userName),
    buildUserCharacterRules(userName, userChar, userFullName),
    buildWorldAndNPCRules(),
    buildOutputInstructions(),
    buildTriggerSection(triggerInstructions),
    buildCharacterSection(main, side, userName),
    buildRelationshipSection(relationships),
    buildLocationSection(locationInfo, worldState),
    buildStorySummarySection(storySummary),
    buildRollingSceneSummarySection(sceneState),
    buildRelevantMemoriesSection(relevantMemories),
    buildWorldStateSection(worldState),
    buildSceneStateSection(sceneState),
  ]

  return sections.filter(Boolean).join('\n\n')
}

// --- Section builders ---

function buildNarratorIdentity() {
  return `[NARRATOR IDENTITY]
You are a narrator for an interactive story.
Your name in this story is irrelevant — you are the world, not a character.`
}

function buildNarrationRules(userName) {
  return `[NARRATION RULES]
- Write in third person, present tense.
- Keep responses to 2–4 sentences unless the scene demands more.
- Describe atmosphere, NPC actions, NPC dialogue, and world reactions.
- Distinguish clearly between what characters say, what they do, and what they think.
  - Spoken words → use dialogue formatting
  - Actions → plain narration
  - Thoughts → only output via the background_context function, never in the narrative text
- Not every character in the scene needs to act or speak every turn. Prioritize:
  1. Characters directly involved in what ${userName} just did or said
  2. Characters whose current intention makes a reaction likely
  3. Background characters only if their reaction adds meaningfully to the scene
  A character staying silent or continuing what they were doing is a valid response.`
}

function buildUserCharacterRules(userName, userEntry, userFullName) {
  let characterContext = ''
  if (userEntry) {
    const [, char] = userEntry
    const sheet = char.sheet || {}
    const state = char.state || {}
    const details = []
    if (sheet.name) details.push(`Full name: ${sheet.name}`)
    if (sheet.age) details.push(`Age: ${sheet.age}`)
    if (sheet.physical) details.push(`Physical: ${sheet.physical}`)
    if (sheet.personality) details.push(`Personality: ${sheet.personality}`)
    if (sheet.background) details.push(`Background: ${sheet.background}`)
    if (state.knowledge && state.knowledge.length > 0) {
      details.push(`Currently knows:\n${state.knowledge.map(k => `  - ${k}`).join('\n')}`)
    }
    if (details.length > 0) {
      characterContext = `\n\n${userName}'s character context (for reference only — you still never control them):\n${details.join('\n')}`
    }
  }

  return `[USER CHARACTER RULES]
- ${userName} is played by the person reading this. You never control them.
- Never write ${userName}'s actions, words, internal thoughts, or reactions.
- Never assume what ${userName} intends to do next.
- If ${userName} does something in their message, narrate the world REACTING to it —
  do not repeat or rewrite what they did.
- ${userName}'s input follows this convention:
  - Text inside "quotation marks" = spoken out loud. NPCs can hear and react to this.
  - Text outside quotation marks is either a physical action or an internal thought.
    Distinguish between them:
    - Physical actions = things that can be seen or heard (smiling, stepping forward,
      crossing arms, sighing). NPCs can see and react to these.
    - Internal thoughts/feelings = things happening only in ${userName}'s mind
      (even though it wasn't, she felt uneasy, she knew he was lying).
      NPCs cannot see, hear, or react to these under any circumstances.
  - When it is ambiguous whether something is an action or a thought, default to
    treating it as a thought — err on the side of NPCs knowing less, not more.
  - Example: "Everything is fine," she smiled, even though it wasn't.
    → NPCs hear "Everything is fine" and see the smile.
    → "even though it wasn't" is internal — NPCs do not know this.${characterContext}`
}

function buildWorldAndNPCRules() {
  return `[WORLD & NPC RULES]
- NPCs behave according to their character sheet and current character state only.
- NPCs only know what they have directly witnessed, been explicitly told, or what is
  listed in their knowledge list. If something happened out of their sight and nobody
  told them, they do not know it and cannot react to it.
- NPC physical states must be consistent with the scene state. A character cannot
  move closer if they are already within touching distance. A character cannot use
  a hand that is already occupied. Movement must be physically possible given their
  last known position and posture.`
}

function buildOutputInstructions() {
  return `[OUTPUT INSTRUCTIONS]
You must always output the following function calls before writing any narrative:
1. background_context({ character, intention, will_act, mood }) — one call per NPC
   in the scene
2. world_background({ events }) — one call describing anything happening in the world
   outside the immediate scene that may be relevant (weather changing, distant sounds,
   background activity, off-screen events). Omit if nothing is happening outside the scene.
3. narrative({ text }) — the actual story response

Do not write any narrative text outside the narrative() function call.`
}

function buildTriggerSection(triggerInstructions) {
  if (!triggerInstructions) return null
  return `[TRIGGER INSTRUCTIONS]\n${triggerInstructions}`
}

/**
 * Build character info section.
 * Main characters get full detail with examples.
 * Side characters get a compact block.
 * User character is excluded — handled in [USER CHARACTER RULES].
 */
function buildCharacterSection(main, side, userName) {
  const blocks = []

  // Main characters — full detail
  if (main.length > 0) {
    blocks.push('### Main Characters')
    for (const [name, char] of main) {
      blocks.push(buildFullCharacterBlock(name, char, userName))
    }
  }

  // Side characters — compact
  if (side.length > 0) {
    blocks.push('### Supporting Characters')
    for (const [name, char] of side) {
      blocks.push(buildCompactCharacterBlock(name, char))
    }
  }

  if (blocks.length === 0) return '[INFORMATION]\n\n## Characters\nNo NPC characters defined.'

  return `[INFORMATION]\n\n## Characters\n${blocks.join('\n\n')}`
}

function buildFullCharacterBlock(name, char, userName) {
  const fullName = char.sheet?.name || name
  const lines = [`**${name}** (${fullName})`]
  const sheet = char.sheet || {}

  if (sheet.role) lines.push(`Role: ${sheet.role}`)
  if (sheet.age) lines.push(`Age: ${sheet.age}`)
  if (sheet.physical) lines.push(`Physical: ${sheet.physical}`)
  if (sheet.personality) lines.push(`Personality: ${sheet.personality}`)

  if (sheet.hard_rules && sheet.hard_rules.length > 0) {
    lines.push('Hard rules:')
    sheet.hard_rules.forEach(r => lines.push(`  - ${r}`))
  }

  if (sheet.communication_style) lines.push(`Communication style: ${sheet.communication_style}`)
  if (sheet.speech_style) lines.push(`Speech style: ${sheet.speech_style}`)

  // Examples
  const correctExamples = collectPrefixedFields(sheet, 'example_correct')
  const incorrectExamples = collectPrefixedFields(sheet, 'example_incorrect')

  if (correctExamples.length > 0) {
    lines.push(`Example correct ${name} response:`)
    correctExamples.forEach(e => lines.push(`  "${e}"`))
  }
  if (incorrectExamples.length > 0) {
    lines.push(`Example WRONG ${name} response (drift — never do this):`)
    incorrectExamples.forEach(e => lines.push(`  "${e}"`))
  }

  // State
  const state = char.state || {}
  lines.push(`Current mood: ${state.current_mood || 'unknown'}`)
  lines.push(`Current goal: ${state.current_goal || 'none'}`)
  if (state.knowledge && state.knowledge.length > 0) {
    lines.push('Knows:')
    state.knowledge.forEach(k => lines.push(`  - ${k}`))
  }

  return lines.join('\n')
}

function buildCompactCharacterBlock(name, char) {
  const fullName = char.sheet?.name || name
  const lines = [`**${name}** (${fullName})`]
  const sheet = char.sheet || {}

  if (sheet.role) lines.push(`Role: ${sheet.role}`)
  if (sheet.age) lines.push(`Age: ${sheet.age}`)
  if (sheet.physical) lines.push(`Physical: ${sheet.physical}`)
  if (sheet.personality) lines.push(`Personality: ${sheet.personality}`)

  if (sheet.hard_rules && sheet.hard_rules.length > 0) {
    lines.push('Rules:')
    sheet.hard_rules.forEach(r => lines.push(`  - ${r}`))
  }

  if (sheet.communication_style) lines.push(`Communication style: ${sheet.communication_style}`)
  if (sheet.speech_style) lines.push(`Speech style: ${sheet.speech_style}`)

  // Examples — include one correct if available
  const correctExamples = collectPrefixedFields(sheet, 'example_correct')
  if (correctExamples.length > 0) {
    lines.push(`Example: "${correctExamples[0]}"`)
  }

  // State — compact
  const state = char.state || {}
  lines.push(`Mood: ${state.current_mood || 'unknown'} | Goal: ${state.current_goal || 'none'}`)
  if (state.knowledge && state.knowledge.length > 0) {
    lines.push('Knows:')
    state.knowledge.forEach(k => lines.push(`  - ${k}`))
  }

  return lines.join('\n')
}

function collectPrefixedFields(obj, prefix) {
  return Object.entries(obj)
    .filter(([k]) => k.startsWith(prefix))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v)
}

function buildRelationshipSection(relationships) {
  const entries = Object.entries(relationships)
  if (entries.length === 0) return '## Relationships\nNo relationships defined.'

  const lines = entries.map(([key, rel]) => {
    return `${key}: ${rel.perception} (trust: ${rel.trust_level})`
  })

  return `## Relationships
Relationships are recorded as mutual entries — each pair of characters has a record
from both perspectives. What A thinks of B and what B thinks of A are tracked separately,
as they may differ significantly.

${lines.join('\n')}`
}

function buildLocationSection(locationInfo, worldState) {
  const parts = []

  if (worldState.current_location) {
    parts.push(`Current location: ${worldState.current_location}`)
  }
  if (worldState.time_of_day) {
    parts.push(`Time: ${worldState.time_of_day}`)
  }
  if (worldState.weather) {
    parts.push(`Weather: ${worldState.weather}`)
  }

  if (locationInfo.locations) {
    const currentKey = Object.keys(locationInfo.locations).find(key => {
      const loc = locationInfo.locations[key]
      return worldState.current_location && worldState.current_location.includes(loc.name)
    })
    if (currentKey) {
      const loc = locationInfo.locations[currentKey]
      if (loc.description) parts.push(`Description: ${loc.description}`)
      if (loc.atmosphere) parts.push(`Atmosphere: ${loc.atmosphere}`)
    }
  }

  if (locationInfo.current_location_notes) {
    parts.push(`Scene notes: ${locationInfo.current_location_notes}`)
  }

  return `## Location\n${parts.length > 0 ? parts.join('\n') : 'No location info.'}`
}

function buildStorySummarySection(storySummary) {
  const summary = storySummary.summary || 'Story has just begun. No prior events.'
  return `## Story Summary\n${summary}`
}

function buildRollingSceneSummarySection(sceneState) {
  const summary = sceneState.rolling_summary || 'Scene has just started.'
  return `## Rolling Scene Summary\n${summary}`
}

function buildRelevantMemoriesSection(relevantMemories) {
  if (!relevantMemories || relevantMemories.length === 0) return null
  return `## Relevant Memories\n${relevantMemories.join('\n\n')}`
}

function buildWorldStateSection(worldState) {
  return `[WORLD STATE]\n${JSON.stringify(worldState, null, 2)}`
}

function buildSceneStateSection(sceneState) {
  return `[SCENE STATE]\n${JSON.stringify(sceneState, null, 2)}`
}

/**
 * Returns a truncated preview of the prompt for the debug panel.
 */
export function getPromptPreview(prompt, maxLength = 2000) {
  if (prompt.length <= maxLength) return prompt
  return prompt.slice(0, maxLength) + '\n\n... [truncated — full prompt is ' + prompt.length + ' characters]'
}
