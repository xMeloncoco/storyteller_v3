import { useState, useEffect } from 'react'
import { fetchStories, fetchPlaythroughs, createPlaythrough } from '../api/playthroughService'
import { PLACEHOLDER_USER_ID } from '../api/supabase'
import NewPlaythroughModal from './NewPlaythroughModal'
import './StorySelectScreen.css'

export default function StorySelectScreen({ onSelectPlaythrough }) {
  const [stories, setStories] = useState([])
  const [selectedStory, setSelectedStory] = useState(null)
  const [playthroughs, setPlaythroughs] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showNewModal, setShowNewModal] = useState(false)

  // Fetch template stories on mount
  useEffect(() => {
    setIsLoading(true)
    fetchStories()
      .then(data => {
        setStories(data)
        setIsLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setIsLoading(false)
      })
  }, [])

  // Fetch playthroughs when a story is selected
  useEffect(() => {
    if (!selectedStory) {
      setPlaythroughs([])
      return
    }

    setIsLoading(true)
    fetchPlaythroughs(selectedStory.id, PLACEHOLDER_USER_ID)
      .then(data => {
        setPlaythroughs(data)
        setIsLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setIsLoading(false)
      })
  }, [selectedStory])

  const handleNewPlaythrough = async (characterName) => {
    const result = await createPlaythrough(
      selectedStory.id,
      PLACEHOLDER_USER_ID,
      characterName
    )
    onSelectPlaythrough(result.playthroughId)
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Never'
    const d = new Date(dateStr)
    return d.toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  // ── Level 1: Story List ───────────────────────────────────
  if (!selectedStory) {
    return (
      <div className="story-select-screen">
        <div className="story-select-header">
          <h1>Choose a Story</h1>
          <p className="story-select-subtitle">Select a story to begin or continue a playthrough</p>
        </div>

        {isLoading && (
          <div className="story-select-loading">Loading stories...</div>
        )}

        {error && (
          <div className="story-select-error">
            <p>{error}</p>
            <button onClick={() => window.location.reload()}>Retry</button>
          </div>
        )}

        {!isLoading && !error && stories.length === 0 && (
          <div className="story-select-empty">No stories available.</div>
        )}

        <div className="story-cards">
          {stories.map(story => (
            <button
              key={story.id}
              className="story-card"
              onClick={() => setSelectedStory(story)}
            >
              <h2 className="story-card-title">{story.title}</h2>
              <p className="story-card-desc">{story.description}</p>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ── Level 2: Playthrough List ─────────────────────────────
  return (
    <div className="story-select-screen">
      <div className="story-select-header">
        <button className="back-btn" onClick={() => setSelectedStory(null)}>
          &larr; Back
        </button>
        <div>
          <h1>{selectedStory.title}</h1>
          <p className="story-select-subtitle">{selectedStory.description}</p>
        </div>
      </div>

      <div className="playthrough-actions">
        <button
          className="new-playthrough-btn"
          onClick={() => setShowNewModal(true)}
        >
          + New Playthrough
        </button>
      </div>

      {isLoading && (
        <div className="story-select-loading">Loading playthroughs...</div>
      )}

      {error && (
        <div className="story-select-error">
          <p>{error}</p>
          <button onClick={() => setSelectedStory({ ...selectedStory })}>Retry</button>
        </div>
      )}

      {!isLoading && !error && playthroughs.length === 0 && (
        <div className="story-select-empty">
          No playthroughs yet. Start a new one!
        </div>
      )}

      <div className="playthrough-cards">
        {playthroughs.map(pt => (
          <button
            key={pt.id}
            className="playthrough-card"
            onClick={() => onSelectPlaythrough(pt.id)}
          >
            <div className="playthrough-card-header">
              <span className="playthrough-char-name">{pt.user_character_name}</span>
              <span className={`playthrough-status ${pt.status}`}>{pt.status}</span>
            </div>
            <div className="playthrough-card-meta">
              <span>{pt.total_turns || 0} turns</span>
              <span>Last played: {formatDate(pt.last_played_at)}</span>
            </div>
          </button>
        ))}
      </div>

      {showNewModal && (
        <NewPlaythroughModal
          storyTitle={selectedStory.title}
          onConfirm={handleNewPlaythrough}
          onCancel={() => setShowNewModal(false)}
        />
      )}
    </div>
  )
}
