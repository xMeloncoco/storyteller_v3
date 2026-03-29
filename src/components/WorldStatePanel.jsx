import { useState } from 'react'
import './WorldStatePanel.css'

export default function WorldStatePanel({ worldState }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="panel world-state-panel">
      <div className="panel-header" onClick={() => setCollapsed(!collapsed)}>
        <h2>World State</h2>
        <span className={`toggle-icon ${collapsed ? 'collapsed' : ''}`}>&#9660;</span>
      </div>
      <div className={`panel-body ${collapsed ? 'collapsed' : ''}`}>
        <pre className="json-display">
          {JSON.stringify(worldState, null, 2)}
        </pre>
      </div>
    </div>
  )
}
