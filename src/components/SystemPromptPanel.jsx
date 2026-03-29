import { useState } from 'react'
import './SystemPromptPanel.css'

export default function SystemPromptPanel({ systemPrompt }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="panel system-prompt-panel">
      <div className="panel-header" onClick={() => setCollapsed(!collapsed)}>
        <h2>System Prompt</h2>
        <span className={`toggle-icon ${collapsed ? 'collapsed' : ''}`}>&#9660;</span>
      </div>
      <div className={`panel-body ${collapsed ? 'collapsed' : ''}`}>
        <pre className="system-prompt-display">
          {systemPrompt}
        </pre>
      </div>
    </div>
  )
}
