import { useState } from 'react'
import './StorySelectScreen.css'

export default function NewPlaythroughModal({ storyTitle, onConfirm, onCancel }) {
  const [name, setName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return

    setIsCreating(true)
    setError(null)

    try {
      await onConfirm(trimmed)
    } catch (err) {
      setError(err.message || 'Failed to create playthrough')
      setIsCreating(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title">New Playthrough</h2>
        <p className="modal-subtitle">{storyTitle}</p>

        <form onSubmit={handleSubmit}>
          <label className="modal-label">
            Character Name
            <input
              type="text"
              className="modal-input"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Enter your character's name"
              autoFocus
              disabled={isCreating}
            />
          </label>

          {error && (
            <div className="modal-error">{error}</div>
          )}

          <div className="modal-actions">
            <button
              type="button"
              className="modal-cancel-btn"
              onClick={onCancel}
              disabled={isCreating}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="modal-confirm-btn"
              disabled={!name.trim() || isCreating}
            >
              {isCreating ? 'Creating...' : 'Start Story'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
