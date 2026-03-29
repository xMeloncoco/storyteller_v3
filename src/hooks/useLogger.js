import { useState, useCallback } from 'react'

/**
 * Central logging hook for the app.
 * Each log entry has: timestamp, level (info|success|warning|error), and message.
 */
export function useLogger() {
  const [logs, setLogs] = useState([])

  const addLog = useCallback((level, message) => {
    setLogs(prev => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        timestamp: new Date().toLocaleTimeString(),
        level,
        message,
      },
    ])
  }, [])

  const log = useCallback((msg) => addLog('info', msg), [addLog])
  const success = useCallback((msg) => addLog('success', msg), [addLog])
  const warn = useCallback((msg) => addLog('warning', msg), [addLog])
  const error = useCallback((msg) => addLog('error', msg), [addLog])

  const clearLogs = useCallback(() => setLogs([]), [])

  return { logs, log, success, warn, error, clearLogs }
}
