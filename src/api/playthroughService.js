import { supabase, PLACEHOLDER_USER_ID } from './supabase'

// ─── READ OPERATIONS ──────────────────────────────────────────────

/** Fetch all template stories (playthrough_id IS NULL) */
export async function fetchStories() {
  const { data, error } = await supabase
    .from('stories')
    .select('id, title, description, initial_message, initial_location, initial_time')
    .is('playthrough_id', null)

  if (error) throw error
  return data
}

/** Fetch all playthroughs for a given story belonging to a user */
export async function fetchPlaythroughs(storyId, userId = PLACEHOLDER_USER_ID) {
  const { data, error } = await supabase
    .from('playthroughs')
    .select('id, status, user_character_name, total_turns, last_played_at, created_at')
    .eq('story_id', storyId)
    .eq('user_id', userId)
    .order('last_played_at', { ascending: false, nullsFirst: false })

  if (error) throw error
  return data
}

/** Fetch ALL state for an active playthrough — called once on load */
export async function fetchPlaythroughState(playthroughId) {
  const [
    playthroughRes,
    charactersRes,
    relationshipsRes,
    locationsRes,
    triggersRes,
    worldStateRes,
    sceneStateRes,
    physicalStatesRes,
    liveStatesRes,
    arcProgressRes,
    triggerStatesRes,
    storySummaryRes,
    sceneSummariesRes,
    messagesRes,
    storyArcsRes,
  ] = await Promise.all([
    supabase
      .from('playthroughs')
      .select('*, story:stories!playthroughs_story_id_fkey(*)')
      .eq('id', playthroughId)
      .single(),
    supabase
      .from('characters')
      .select('*')
      .eq('playthrough_id', playthroughId),
    supabase
      .from('relationships')
      .select('*, from_character:characters!relationships_from_character_id_fkey(name), to_character:characters!relationships_to_character_id_fkey(name)')
      .eq('playthrough_id', playthroughId),
    supabase
      .from('locations')
      .select('*')
      .eq('playthrough_id', playthroughId),
    supabase
      .from('triggers')
      .select('*')
      .eq('playthrough_id', playthroughId),
    supabase
      .from('playthrough_world_state')
      .select('*')
      .eq('playthrough_id', playthroughId)
      .single(),
    supabase
      .from('playthrough_scene_state')
      .select('*')
      .eq('playthrough_id', playthroughId)
      .eq('is_active', true)
      .single(),
    supabase
      .from('character_physical_states')
      .select('*, character:characters!character_physical_states_character_id_fkey(name)')
      .eq('playthrough_id', playthroughId),
    supabase
      .from('character_live_states')
      .select('*, character:characters!character_live_states_character_id_fkey(name)')
      .eq('playthrough_id', playthroughId),
    supabase
      .from('playthrough_arc_progress')
      .select('*')
      .eq('playthrough_id', playthroughId),
    supabase
      .from('playthrough_trigger_state')
      .select('*')
      .eq('playthrough_id', playthroughId),
    supabase
      .from('story_summaries')
      .select('*')
      .eq('playthrough_id', playthroughId)
      .single(),
    supabase
      .from('scene_summaries')
      .select('*')
      .eq('playthrough_id', playthroughId)
      .order('scene_number', { ascending: true }),
    supabase
      .from('messages')
      .select('*')
      .eq('playthrough_id', playthroughId)
      .order('turn_number', { ascending: true }),
    supabase
      .from('story_arcs')
      .select('*')
      .eq('playthrough_id', playthroughId),
  ])

  // Check for critical errors (playthrough row must exist)
  if (playthroughRes.error) throw playthroughRes.error
  if (worldStateRes.error && worldStateRes.error.code !== 'PGRST116') throw worldStateRes.error
  if (sceneStateRes.error && sceneStateRes.error.code !== 'PGRST116') throw sceneStateRes.error

  return {
    playthrough: playthroughRes.data,
    story: playthroughRes.data?.story,
    characters: charactersRes.data || [],
    relationships: relationshipsRes.data || [],
    locations: locationsRes.data || [],
    triggers: triggersRes.data || [],
    worldState: worldStateRes.data || {},
    sceneState: sceneStateRes.data || {},
    physicalStates: physicalStatesRes.data || [],
    liveStates: liveStatesRes.data || [],
    arcProgress: arcProgressRes.data || [],
    triggerStates: triggerStatesRes.data || [],
    storySummary: storySummaryRes.data || {},
    sceneSummaries: sceneSummariesRes.data || [],
    messages: messagesRes.data || [],
    storyArcs: storyArcsRes.data || [],
  }
}

// ─── PER-TURN WRITE OPERATIONS ────────────────────────────────────

/** Insert a single message row */
export async function insertMessage(playthroughId, {
  sceneNumber, turnNumber, role, content,
  backgroundContext = null, worldBackground = null, validationResult = null,
}) {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      playthrough_id: playthroughId,
      scene_number: sceneNumber,
      turn_number: turnNumber,
      role,
      content,
      background_context: backgroundContext,
      world_background: worldBackground,
      validation_result: validationResult,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/** Update the playthrough world state */
export async function updateWorldState(playthroughId, changes) {
  const { error } = await supabase
    .from('playthrough_world_state')
    .update(changes)
    .eq('playthrough_id', playthroughId)

  if (error) throw error
}

/** Update the active scene state */
export async function updateSceneState(playthroughId, changes) {
  const { error } = await supabase
    .from('playthrough_scene_state')
    .update(changes)
    .eq('playthrough_id', playthroughId)
    .eq('is_active', true)

  if (error) throw error
}

/** Update a character's physical state */
export async function updateCharacterPhysicalState(playthroughId, characterId, changes) {
  const { error } = await supabase
    .from('character_physical_states')
    .update(changes)
    .eq('playthrough_id', playthroughId)
    .eq('character_id', characterId)

  if (error) throw error
}

/** Update a character's live state (mood, goal, knowledge) */
export async function updateCharacterLiveState(playthroughId, characterId, changes) {
  const { error } = await supabase
    .from('character_live_states')
    .update(changes)
    .eq('playthrough_id', playthroughId)
    .eq('character_id', characterId)

  if (error) throw error
}

/** Update trigger state */
export async function updateTriggerState(playthroughId, triggerId, changes) {
  const { error } = await supabase
    .from('playthrough_trigger_state')
    .update(changes)
    .eq('playthrough_id', playthroughId)
    .eq('trigger_id', triggerId)

  if (error) throw error
}

/** Update playthrough metadata (total_turns, last_played_at) */
export async function updatePlaythroughRow(playthroughId, changes) {
  const { error } = await supabase
    .from('playthroughs')
    .update(changes)
    .eq('id', playthroughId)

  if (error) throw error
}

// ─── SCENE-END WRITE OPERATIONS ──────────────────────────────────

/** Insert a scene summary */
export async function insertSceneSummary(playthroughId, {
  sceneNumber, summaryText, keyEvents = [], flagsSet = [],
}) {
  const { error } = await supabase
    .from('scene_summaries')
    .insert({
      playthrough_id: playthroughId,
      scene_number: sceneNumber,
      summary_text: summaryText,
      key_events: keyEvents,
      flags_set: flagsSet,
    })

  if (error) throw error
}

/** Upsert the story summary */
export async function upsertStorySummary(playthroughId, summaryText) {
  const { error } = await supabase
    .from('story_summaries')
    .update({ summary_text: summaryText })
    .eq('playthrough_id', playthroughId)

  if (error) throw error
}

/** Update a relationship row */
export async function updateRelationship(relationshipId, changes) {
  const { error } = await supabase
    .from('relationships')
    .update(changes)
    .eq('id', relationshipId)

  if (error) throw error
}

/** End current scene and start a new one */
export async function createNewScene(playthroughId, newSceneNumber, sceneIntent = '') {
  // Deactivate old scene
  const { error: deactivateErr } = await supabase
    .from('playthrough_scene_state')
    .update({ is_active: false })
    .eq('playthrough_id', playthroughId)
    .eq('is_active', true)

  if (deactivateErr) throw deactivateErr

  // Insert new scene
  const { error: insertErr } = await supabase
    .from('playthrough_scene_state')
    .insert({
      playthrough_id: playthroughId,
      scene_number: newSceneNumber,
      scene_intent: sceneIntent,
      tone: '',
      pacing: '',
      turn_count: 0,
      rolling_summary: '',
      last_summary_at_turn: 0,
      plot_flags: {},
      is_active: true,
    })

  if (insertErr) throw insertErr
}

/** Update arc progress */
export async function updateArcProgress(playthroughId, arcId, changes) {
  const { error } = await supabase
    .from('playthrough_arc_progress')
    .update(changes)
    .eq('playthrough_id', playthroughId)
    .eq('arc_id', arcId)

  if (error) throw error
}

// ─── NEW PLAYTHROUGH CREATION ─────────────────────────────────────

/**
 * Create a new playthrough: copies all template rows for a story,
 * creates live state rows, returns the new playthrough ID.
 */
export async function createPlaythrough(storyId, userId, userCharacterName) {
  let playthroughId = null

  try {
    // 1. Insert the playthrough row
    const { data: playthrough, error: ptErr } = await supabase
      .from('playthroughs')
      .insert({
        story_id: storyId,
        user_id: userId,
        user_character_name: userCharacterName,
        status: 'active',
        total_turns: 0,
      })
      .select()
      .single()

    if (ptErr) throw ptErr
    playthroughId = playthrough.id

    // 2. Copy the story row
    const { data: templateStory, error: storyFetchErr } = await supabase
      .from('stories')
      .select('*')
      .eq('id', storyId)
      .is('playthrough_id', null)
      .single()

    if (storyFetchErr) throw storyFetchErr

    const { id: _storyId, created_at: _sc, ...storyFields } = templateStory
    const { data: copiedStory, error: storyCopyErr } = await supabase
      .from('stories')
      .insert({
        ...storyFields,
        playthrough_id: playthroughId,
        copied_from: storyId,
      })
      .select()
      .single()

    if (storyCopyErr) throw storyCopyErr
    const newStoryId = copiedStory.id

    // 3. Copy characters → build ID map
    const { data: templateChars, error: charFetchErr } = await supabase
      .from('characters')
      .select('*')
      .eq('story_id', storyId)
      .is('playthrough_id', null)

    if (charFetchErr) throw charFetchErr

    const charIdMap = {} // old id → new id
    if (templateChars && templateChars.length > 0) {
      const charInserts = templateChars.map(({ id: _id, created_at: _ca, ...fields }) => ({
        ...fields,
        story_id: newStoryId,
        playthrough_id: playthroughId,
      }))

      const { data: copiedChars, error: charCopyErr } = await supabase
        .from('characters')
        .insert(charInserts)
        .select()

      if (charCopyErr) throw charCopyErr

      // Build map: match by name since order might differ
      for (const orig of templateChars) {
        const copied = copiedChars.find(c => c.name === orig.name)
        if (copied) charIdMap[orig.id] = copied.id
      }
    }

    // 4. Copy locations
    const { data: templateLocs, error: locFetchErr } = await supabase
      .from('locations')
      .select('*')
      .eq('story_id', storyId)
      .is('playthrough_id', null)

    if (locFetchErr) throw locFetchErr

    if (templateLocs && templateLocs.length > 0) {
      const locInserts = templateLocs.map(({ id: _id, created_at: _ca, ...fields }) => ({
        ...fields,
        story_id: newStoryId,
        playthrough_id: playthroughId,
      }))

      const { error: locCopyErr } = await supabase
        .from('locations')
        .insert(locInserts)

      if (locCopyErr) throw locCopyErr
    }

    // 5. Copy story_arcs → build ID map
    const { data: templateArcs, error: arcFetchErr } = await supabase
      .from('story_arcs')
      .select('*')
      .eq('story_id', storyId)
      .is('playthrough_id', null)

    if (arcFetchErr) throw arcFetchErr

    const arcIdMap = {} // old id → new id
    if (templateArcs && templateArcs.length > 0) {
      const arcInserts = templateArcs.map(({ id: _id, created_at: _ca, ...fields }) => ({
        ...fields,
        story_id: newStoryId,
        playthrough_id: playthroughId,
      }))

      const { data: copiedArcs, error: arcCopyErr } = await supabase
        .from('story_arcs')
        .insert(arcInserts)
        .select()

      if (arcCopyErr) throw arcCopyErr

      for (const orig of templateArcs) {
        const copied = copiedArcs.find(a => a.arc_order === orig.arc_order)
        if (copied) arcIdMap[orig.id] = copied.id
      }
    }

    // 6. Copy arc_episodes → use arc ID map
    if (templateArcs && templateArcs.length > 0) {
      const oldArcIds = templateArcs.map(a => a.id)
      const { data: templateEpisodes, error: epFetchErr } = await supabase
        .from('arc_episodes')
        .select('*')
        .in('arc_id', oldArcIds)

      if (epFetchErr) throw epFetchErr

      if (templateEpisodes && templateEpisodes.length > 0) {
        const epInserts = templateEpisodes.map(({ id: _id, created_at: _ca, ...fields }) => ({
          ...fields,
          arc_id: arcIdMap[fields.arc_id] || fields.arc_id,
          playthrough_id: playthroughId,
        }))

        const { error: epCopyErr } = await supabase
          .from('arc_episodes')
          .insert(epInserts)

        if (epCopyErr) throw epCopyErr
      }
    }

    // 7. Copy triggers → build ID map
    const { data: templateTriggers, error: trigFetchErr } = await supabase
      .from('triggers')
      .select('*')
      .eq('story_id', storyId)
      .is('playthrough_id', null)

    if (trigFetchErr) throw trigFetchErr

    const triggerIdMap = {} // old id → new id
    if (templateTriggers && templateTriggers.length > 0) {
      const trigInserts = templateTriggers.map(({ id: _id, created_at: _ca, ...fields }) => ({
        ...fields,
        story_id: newStoryId,
        playthrough_id: playthroughId,
      }))

      const { data: copiedTriggers, error: trigCopyErr } = await supabase
        .from('triggers')
        .insert(trigInserts)
        .select()

      if (trigCopyErr) throw trigCopyErr

      for (const orig of templateTriggers) {
        const copied = copiedTriggers.find(t => t.condition === orig.condition)
        if (copied) triggerIdMap[orig.id] = copied.id
      }
    }

    // 8. Copy relationships → use character ID map
    const { data: templateRels, error: relFetchErr } = await supabase
      .from('relationships')
      .select('*')
      .eq('story_id', storyId)
      .is('playthrough_id', null)

    if (relFetchErr) throw relFetchErr

    if (templateRels && templateRels.length > 0) {
      const relInserts = templateRels.map(({ id: _id, created_at: _ca, ...fields }) => ({
        ...fields,
        story_id: newStoryId,
        playthrough_id: playthroughId,
        from_character_id: charIdMap[fields.from_character_id] || fields.from_character_id,
        to_character_id: charIdMap[fields.to_character_id] || fields.to_character_id,
      }))

      const { error: relCopyErr } = await supabase
        .from('relationships')
        .insert(relInserts)

      if (relCopyErr) throw relCopyErr
    }

    // 9. Create live state rows
    const copiedChars = Object.values(charIdMap)

    // 9a. World state
    const { error: wsErr } = await supabase
      .from('playthrough_world_state')
      .insert({
        playthrough_id: playthroughId,
        current_location: copiedStory.initial_location || '',
        time_of_day: copiedStory.initial_time || '',
        weather: '',
        characters_present: [],
      })

    if (wsErr) throw wsErr

    // 9b. Scene state (scene 1)
    const { error: ssErr } = await supabase
      .from('playthrough_scene_state')
      .insert({
        playthrough_id: playthroughId,
        scene_number: 1,
        scene_intent: '',
        tone: '',
        pacing: '',
        turn_count: 0,
        rolling_summary: '',
        last_summary_at_turn: 0,
        plot_flags: {},
        is_active: true,
      })

    if (ssErr) throw ssErr

    // 9c. Character physical states
    if (copiedChars.length > 0) {
      const physInserts = copiedChars.map(charId => ({
        playthrough_id: playthroughId,
        character_id: charId,
        position: null,
        posture: null,
        left_hand: null,
        right_hand: null,
        distance_from_user: null,
        facing: null,
        last_moved_turn: null,
      }))

      const { error: physErr } = await supabase
        .from('character_physical_states')
        .insert(physInserts)

      if (physErr) throw physErr
    }

    // 9d. Character live states
    if (copiedChars.length > 0) {
      const liveInserts = copiedChars.map(charId => ({
        playthrough_id: playthroughId,
        character_id: charId,
        current_mood: '',
        current_goal: '',
        knowledge: [],
      }))

      const { error: liveErr } = await supabase
        .from('character_live_states')
        .insert(liveInserts)

      if (liveErr) throw liveErr
    }

    // 9e. Arc progress
    const copiedArcIds = Object.values(arcIdMap)
    if (copiedArcIds.length > 0) {
      const arcInserts = copiedArcIds.map(arcId => ({
        playthrough_id: playthroughId,
        arc_id: arcId,
        is_active: false,
        is_completed: false,
        active_flags: [],
      }))

      const { error: arcErr } = await supabase
        .from('playthrough_arc_progress')
        .insert(arcInserts)

      if (arcErr) throw arcErr
    }

    // 9f. Trigger states
    const copiedTriggerIds = Object.values(triggerIdMap)
    if (copiedTriggerIds.length > 0) {
      const trigInserts = copiedTriggerIds.map(triggerId => ({
        playthrough_id: playthroughId,
        trigger_id: triggerId,
        activated: false,
        times_fired: 0,
        last_fired_turn: null,
      }))

      const { error: trigErr } = await supabase
        .from('playthrough_trigger_state')
        .insert(trigInserts)

      if (trigErr) throw trigErr
    }

    // 9g. Story summary (empty)
    const { error: sumErr } = await supabase
      .from('story_summaries')
      .insert({
        playthrough_id: playthroughId,
        summary_text: '',
      })

    if (sumErr) throw sumErr

    return { playthroughId, story: copiedStory }

  } catch (err) {
    // Clean up: delete the playthrough row (cascade should handle children)
    if (playthroughId) {
      await supabase.from('playthroughs').delete().eq('id', playthroughId)
    }
    throw err
  }
}
