export default function DashboardPage() {
  return (
    <div className="dashboard-content">
      <div className="dashboard-header-card large">
        <div className="header-left">
          <h2 className="header-title">INDONESIAN TOURISM USABILITY QUESTIONNAIRE DASHBOARD</h2>
          <p className="header-desc">Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua</p>
          <div className="header-actions">
            <button className="primary-btn">+ Buat Evaluasi</button>
          </div>
        </div>
      </div>

      <div className="stats-row">
        <div className="stat-card boxed">
          <div className="stat-title">Total Evaluasi</div>
          <div className="stat-value">12</div>
        </div>
        <div className="stat-card boxed">
          <div className="stat-title">Evaluasi Aktif</div>
          <div className="stat-value">3</div>
        </div>
        <div className="stat-card boxed">
          <div className="stat-title">Evaluasi Selesai</div>
          <div className="stat-value">9</div>
        </div>
      </div>

      <section className="latest-section">
        <div className="latest-header-row">
          <h3 className="latest-title">Evaluasi Terbaru</h3>
          <button className="archive-link">Buka Arsip</button>
        </div>

        <div className="latest-cards">
          <EvaluationSummary title="Traveloka" status="Menunggu Responden" />
          <EvaluationSummary title="Agoda" status="Selesai" />
          <EvaluationSummary title="tiket.com" status="Menunggu Responden" />
        </div>
      </section>
    </div>
  )
}

function EvaluationSummary({ title, status }) {
  return (
    <div className="latest-card">
      <div className="card-icon">📄</div>
      <div className="card-body">
        <div className="card-title">{title}</div>
        <div className="card-sub">{status}</div>
      </div>
      <button className="card-action" aria-label={`Actions for ${title}`}>⋯</button>
    </div>
  )
}