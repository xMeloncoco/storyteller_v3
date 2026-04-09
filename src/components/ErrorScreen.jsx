export default function ErrorScreen({ error, onRetry }) {
  const message = typeof error === 'string' ? error : error?.message || 'Something went wrong'

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      color: 'var(--text-primary)',
      gap: '16px',
      padding: '20px',
    }}>
      <div style={{
        fontSize: '14px',
        color: 'var(--error)',
        textAlign: 'center',
        maxWidth: '400px',
        padding: '20px',
        background: 'rgba(244, 67, 54, 0.1)',
        borderRadius: '8px',
        border: '1px solid rgba(244, 67, 54, 0.3)',
      }}>
        {message}
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            background: 'var(--accent)',
            color: 'white',
            border: 'none',
            padding: '8px 20px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      )}
    </div>
  )
}
