import './SystemPromptPanel.css'

export default function SystemPromptPanel({ systemPrompt, onClose }) {
  return (
    <div className="panel system-prompt-panel">
      <div className="panel-header">
        <h2>System Prompt</h2>
        <button className="panel-close-btn" onClick={onClose}>&times;</button>
      </div>
      <div className="panel-body">
        <pre className="system-prompt-display">
          {systemPrompt}
        </pre>
      </div>
    </div>
  )
}
