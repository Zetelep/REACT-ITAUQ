export default function SettingsPage({ jwtToken, userEmail, copied, onCopy }) {
  return (
    <div className="settings-content">
      <div className="settings-card">
        <div className="settings-header">
          <div>
            <p className="settings-label">Account</p>
            <h1 className="settings-title">JWT Key</h1>
          </div>
          <button className="copy-btn" onClick={onCopy} disabled={!jwtToken}>
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        <div className="settings-meta">
          <span className="meta-label">Signed in as</span>
          <strong>{userEmail || 'No active user'}</strong>
        </div>

        <div className="jwt-box">
          <code className="jwt-value">
            {jwtToken || 'No JWT available. Please log in again.'}
          </code>
        </div>
      </div>
    </div>
  )
}