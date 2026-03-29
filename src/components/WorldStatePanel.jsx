import './WorldStatePanel.css'

export default function WorldStatePanel({ worldState, onClose }) {
  return (
    <div className="panel world-state-panel">
      <div className="panel-header">
        <h2>World State</h2>
        <button className="panel-close-btn" onClick={onClose}>&times;</button>
      </div>
      <div className="panel-body">
        <pre className="json-display">
          {JSON.stringify(worldState, null, 2)}
        </pre>
      </div>
    </div>
  )
}
