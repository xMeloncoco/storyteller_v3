import { useState, useRef, useEffect } from 'react'
import './LogPanel.css'

export default function LogPanel({ logs, onClear }) {
  const [collapsed, setCollapsed] = useState(false)
  const logsEndRef = useRef(null)

  const errorCount = logs.filter(l => l.level === 'error').length
  const warningCount = logs.filter(l => l.level === 'warning').length

  useEffect(() => {
    if (!collapsed) {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, collapsed])

  return (
    <div className="panel log-panel">
      <div className="panel-header" onClick={() => setCollapsed(!collapsed)}>
        <h2>
          Activity Log
          {errorCount > 0 && <span className="badge error">{errorCount}</span>}
          {warningCount > 0 && <span className="badge warning">{warningCount}</span>}
        </h2>
        <div className="panel-header-actions">
          {!collapsed && logs.length > 0 && (
            <button
              className="clear-btn"
              onClick={(e) => { e.stopPropagation(); onClear(); }}
            >
              Clear
            </button>
          )}
          <span className={`toggle-icon ${collapsed ? 'collapsed' : ''}`}>&#9660;</span>
        </div>
      </div>
      <div className={`panel-body ${collapsed ? 'collapsed' : ''}`}>
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
