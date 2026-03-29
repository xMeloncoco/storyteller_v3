import { useRef, useEffect } from 'react'
import './LogPanel.css'

export default function LogPanel({ logs, onClear, onClose }) {
  const logsEndRef = useRef(null)

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  return (
    <div className="panel log-panel">
      <div className="panel-header">
        <h2>Activity Log</h2>
        <div className="panel-header-actions">
          {logs.length > 0 && (
            <button className="clear-btn" onClick={onClear}>Clear</button>
          )}
          <button className="panel-close-btn" onClick={onClose}>&times;</button>
        </div>
      </div>
      <div className="panel-body">
        {logs.length === 0 ? (
          <div className="log-empty">No activity yet.</div>
        ) : (
          <div className="log-entries">
            {logs.map((entry) => (
              <div key={entry.id} className={`log-entry ${entry.level}`}>
                <span className="log-time">{entry.timestamp}</span>
                <span className={`log-level ${entry.level}`}>{entry.level.toUpperCase()}</span>
                <span className="log-message">{entry.message}</span>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>
    </div>
  )
}
