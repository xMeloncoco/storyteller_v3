/**
 * Dynamic system prompt builder.
 * Assembles the full narrator prompt from whatever story state is loaded —
 * works with any characters, any setting, any story.
 */

export function buildSystemPrompt(state, triggerInstructions = '', relevantMemories = []) {
  const {
    characters = {},
    relationships = {},
    worldState = {},
    sceneState = {},
    storySummary = {},
    locationInfo = {},
    userName = 'the Player',
  } = state

  const sections = [
    buildNarratorIdentity(),
    buildNarrationRules(userName),
    buildUserCharacterRules(userName, storySummary.user_character),
    buildWorldAndNPCRules(),
    buildOutputInstructions(),
    buildTriggerSection(triggerInstructions),
    buildCharacterSection(characters),
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

function buildUserCharacterRules(userName, userCharacter) {
  let characterContext = ''
  if (userCharacter) {
    const details = []
    if (userCharacter.age) details.push(`Age: ${userCharacter.age}`)
    if (userCharacter.background) details.push(`Background: ${userCharacter.background}`)
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

function buildCharacterSection(characters) {
  const entries = Object.entries(characters)
  if (entries.length === 0) return '[INFORMATION]\n\n## Characters\nNo characters defined.'

  const blocks = entries.map(([name, char]) => {
    const lines = [`### ${name}`]

    // Sheet
    if (char.sheet) {
      const sheet = char.sheet
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

      // Collect all example fields (example_correct, example_correct_2, etc.)
      const correctExamples = Object.entries(sheet)
        .filter(([k]) => k.startsWith('example_correct'))
        .map(([, v]) => v)
      const incorrectExamples = Object.entries(sheet)
        .filter(([k]) => k.startsWith('example_incorrect'))
        .map(([, v]) => v)

      if (correctExamples.length > 0) {
        lines.push('Example correct:')
        correctExamples.forEach(e => lines.push(`  "${e}"`))
      }
      if (incorrectExamples.length > 0) {
        lines.push('Example WRONG (never do this):')
        incorrectExamples.forEach(e => lines.push(`  "${e}"`))
      }
    }

    // State
    if (char.state) {
      lines.push(`Current mood: ${char.state.current_mood || 'unknown'}`)
      lines.push(`Current goal: ${char.state.current_goal || 'none'}`)
      if (char.state.knowledge && char.state.knowledge.length > 0) {
        lines.push('Knows:')
        char.state.knowledge.forEach(k => lines.push(`  - ${k}`))
      }
    }

    return lines.join('\n')
  })

  return `[INFORMATION]\n\n## Characters\n${blocks.join('\n\n')}`
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

  // Current location from world state
  if (worldState.current_location) {
    parts.push(`Current location: ${worldState.current_location}`)
  }
  if (worldState.time_of_day) {
    parts.push(`Time: ${worldState.time_of_day}`)
  }
  if (worldState.weather) {
    parts.push(`Weather: ${worldState.weather}`)
  }

  // Detailed location info if available
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
