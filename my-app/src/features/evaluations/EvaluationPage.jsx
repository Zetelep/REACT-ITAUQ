import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useProfile } from '../../app/providers/ProfileProvider'
import { api } from '../../shared/api/apiClient'
import { uploadQuestionnaireImage } from '../../shared/clients/imageUpload'
import '../account-management/AccountRequestsPage.css'
import './QuestionnairePage.css'
import EvaluationLinksSection from './EvaluationLinksSection'

const PAGE_SIZE = 20
const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Aktif' },
  { value: 'closed', label: 'Selesai' },
]

const emptyQuestionnaire = {
  title: '',
  app_name: '',
  description: '',
  status: 'draft',
  itauq_version: 'itauq-v1',
  app_link: '',
  img_link: '',
}

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function statusLabel(status) {
  return STATUS_OPTIONS.find((option) => option.value === status)?.label || status || '—'
}

function statusClass(status) {
  return status === 'active' ? 'badge-approved' : status === 'closed' ? 'badge-rejected' : 'badge-pending'
}

function sortResources(items, orderField) {
  return [...items].sort((left, right) => {
    const orderDifference = (Number(left[orderField]) || 0) - (Number(right[orderField]) || 0)
    if (orderDifference !== 0) return orderDifference
    return new Date(left.created_at || 0).getTime() - new Date(right.created_at || 0).getTime()
  })
}

function moveResource(items, sourceId, targetId, orderField) {
  const sourceIndex = items.findIndex((item) => String(item.id) === String(sourceId))
  const targetIndex = items.findIndex((item) => String(item.id) === String(targetId))
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return null

  const reordered = [...items]
  const [movedItem] = reordered.splice(sourceIndex, 1)
  reordered.splice(targetIndex, 0, movedItem)
  return reordered.map((item, index) => ({ ...item, [orderField]: index + 1 }))
}

function getListResult(result) {
  if (Array.isArray(result)) return { items: result, meta: null }
  return { items: Array.isArray(result?.data) ? result.data : [], meta: result?.meta }
}

function canCreateQuestionnaire(profile) {
  return profile?.role === 'administrator' || profile?.role === 'super_admin'
}

export default function EvaluationPage({ superAdminView = false }) {
  const { questionnaireId } = useParams()

  if (questionnaireId) {
    return <QuestionnaireDetail questionnaireId={questionnaireId} superAdminView={superAdminView} />
  }

  return <QuestionnaireList superAdminView={superAdminView} />
}

function QuestionnaireList({ superAdminView }) {
  const navigate = useNavigate()
  const { profile } = useProfile()
  const [questionnaires, setQuestionnaires] = useState([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [administratorFilter, setAdministratorFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState(null)
  const [createModal, setCreateModal] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const fetchQuestionnaires = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = { page, page_size: PAGE_SIZE }
      if (statusFilter) params.status = statusFilter
      if (superAdminView && administratorFilter.trim()) {
        params.administrator_id = administratorFilter.trim()
      } else if (!superAdminView && profile?.role === 'super_admin' && profile.id) {
        params.administrator_id = profile.id
      }

      const result = await api.get('/questionnaires', { params, includeMeta: true })
      const { items, meta } = getListResult(result)
      setQuestionnaires(items)
      setTotalPages(meta?.total_pages || 1)
    } catch (err) {
      setQuestionnaires([])
      setTotalPages(1)
      setError(err.message || 'Gagal memuat daftar evaluasi.')
    } finally {
      setLoading(false)
    }
  }, [administratorFilter, page, profile, statusFilter, superAdminView])

  useEffect(() => {
    fetchQuestionnaires()
  }, [fetchQuestionnaires])

  const handleCreate = async (values) => {
    setActionLoading('create')
    try {
      const created = await api.post('/questionnaires', values)
      setCreateModal(false)
      if (created?.id) {
        navigate(detailPath(created.id))
      } else if (page === 1) {
        await fetchQuestionnaires()
      } else {
        setPage(1)
      }
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    setActionLoading(deleteConfirm.id)
    setError('')
    try {
      await api.del(`/questionnaires/${deleteConfirm.id}`)
      setDeleteConfirm(null)
      await fetchQuestionnaires()
    } catch (err) {
      setError(err.message || 'Gagal menghapus evaluasi.')
    } finally {
      setActionLoading(null)
    }
  }

  const detailPath = (id) => `${superAdminView ? '/admin/semua-evaluasi' : '/admin/evaluasi'}/${id}`
  const canCreate = canCreateQuestionnaire(profile)
  const canManageQuestionnaire = (questionnaire) => profile?.role === 'administrator' || questionnaire?.administrator_id === profile?.id

  return (
    <div className="page-container questionnaire-page">
      <div className="page-header">
        <div>
          <p className="page-eyebrow">ITAUQ</p>
          <h1>{superAdminView ? 'Semua Evaluasi' : 'Evaluasi Saya'}</h1>
          <p className="page-subtitle">
            {superAdminView ? 'Pantau seluruh proyek evaluasi administrator.' : 'Buat dan kelola proyek evaluasi usability aplikasi Anda.'}
          </p>
        </div>
        <div className="page-filters questionnaire-filters">
          <select
            className="filter-select"
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value)
              setPage(1)
            }}
            aria-label="Filter status evaluasi"
          >
            <option value="">Semua status</option>
            {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          {superAdminView && (
            <input
              className="filter-input"
              value={administratorFilter}
              onChange={(event) => {
                setAdministratorFilter(event.target.value)
                setPage(1)
              }}
              placeholder="ID administrator"
              aria-label="Filter ID administrator"
            />
          )}
          {canCreate && (
            <button className="primary-btn-sm" onClick={() => setCreateModal(true)}>
              + Buat Evaluasi
            </button>
          )}
        </div>
      </div>

      {error && <div className="page-error" role="alert">{error}</div>}

      <div className="evaluation-summary-grid" aria-label="Ringkasan evaluasi">
        <article className="evaluation-stat-card evaluation-stat-featured">
          <span className="evaluation-stat-label">Terlihat</span>
          <strong>{questionnaires.length}</strong>
          <small>evaluasi di halaman ini</small>
          <span className="evaluation-stat-mark" aria-hidden="true"></span>
        </article>
        <article className="evaluation-stat-card">
          <span className="evaluation-stat-label">Aktif</span>
          <strong>{questionnaires.filter((item) => item.status === 'active').length}</strong>
          <small>siap menerima respons</small>
          <span className="evaluation-stat-dot is-active" aria-hidden="true" />
        </article>
        <article className="evaluation-stat-card">
          <span className="evaluation-stat-label">Draft</span>
          <strong>{questionnaires.filter((item) => item.status === 'draft').length}</strong>
          <small>masih dalam persiapan</small>
          <span className="evaluation-stat-dot is-draft" aria-hidden="true" />
        </article>
        <article className="evaluation-stat-card">
          <span className="evaluation-stat-label">Selesai</span>
          <strong>{questionnaires.filter((item) => item.status === 'closed').length}</strong>
          <small>evaluasi yang ditutup</small>
          <span className="evaluation-stat-dot is-closed" aria-hidden="true" />
        </article>
      </div>

      <section className="data-table-card evaluation-board">
        <div className="evaluation-board-header">
          <div>
            <p className="board-eyebrow">Workspace</p>
            <h2>Daftar evaluasi</h2>
            <p>Pilih evaluasi untuk mengatur task, kriteria, dan tautan responden.</p>
          </div>
          <span className="board-count">{questionnaires.length} item</span>
        </div>

        {loading ? (
          <div className="table-loading">Memuat daftar evaluasi...</div>
        ) : questionnaires.length === 0 ? (
          <div className="table-empty">
            <span className="empty-state-icon" aria-hidden="true">＋</span>
            <strong>Belum ada evaluasi.</strong>
            <span>{canCreate ? 'Buat evaluasi pertama untuk mulai menyiapkan proyek.' : 'Tidak ada evaluasi yang sesuai dengan filter.'}</span>
          </div>
        ) : (
          <div className="evaluation-card-grid">
            {questionnaires.map((questionnaire, index) => (
              <article className="evaluation-card" key={questionnaire.id}>
                <div className="evaluation-card-topline">
                  <span className="evaluation-card-index">{String(index + 1).padStart(2, '0')}</span>
                  <span className={`status-badge ${statusClass(questionnaire.status)}`}>{statusLabel(questionnaire.status)}</span>
                  {canManageQuestionnaire(questionnaire) && (
                    <button className="evaluation-card-delete" onClick={() => setDeleteConfirm(questionnaire)} title="Hapus evaluasi" aria-label={`Hapus ${questionnaire.title}`}>
                      <span aria-hidden="true">×</span>
                    </button>
                  )}
                </div>
                <div className="evaluation-card-content">
                  <p className="evaluation-card-app">{questionnaire.app_name || 'Aplikasi belum diisi'}</p>
                  <button className="table-link evaluation-card-title" onClick={() => navigate(detailPath(questionnaire.id))}>
                    {questionnaire.title}
                  </button>
                  {questionnaire.description && <p className="table-description">{questionnaire.description}</p>}
                </div>
                <div className="evaluation-card-meta">
                  <span><small>Versi</small><strong>{questionnaire.itauq_version || 'itauq-v1'}</strong></span>
                  <span><small>Dibuat</small><strong>{formatDate(questionnaire.created_at)}</strong></span>
                  {superAdminView && <span className="evaluation-card-owner"><small>Administrator</small><strong>{questionnaire.administrator_id || '—'}</strong></span>}
                </div>
                <div className="evaluation-card-actions">
                  <button className="evaluation-card-open" onClick={() => navigate(detailPath(questionnaire.id))}>
                    Kelola evaluasi <span aria-hidden="true">↗</span>
                  </button>
                  {superAdminView && (
                    <button className="evaluation-card-open evaluation-card-results" onClick={() => navigate(`/admin/hasil/${questionnaire.id}`)}>
                      Lihat Hasil <span aria-hidden="true">↗</span>
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="table-pagination">
            <button className="pagination-btn" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1}>
              ← Sebelumnya
            </button>
            <span className="pagination-info">Halaman {page} dari {totalPages}</span>
            <button className="pagination-btn" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page >= totalPages}>
              Berikutnya →
            </button>
          </div>
        )}
      </section>

      {createModal && (
        <QuestionnaireModal
          onClose={() => setCreateModal(false)}
          onSubmit={handleCreate}
          submitting={actionLoading === 'create'}
        />
      )}

      {deleteConfirm && (
        <ConfirmModal
          title="Hapus evaluasi?"
          description={`Semua task scenario dan data terkait dari “${deleteConfirm.title}” akan ikut terhapus. Tindakan ini tidak dapat dibatalkan.`}
          confirmLabel={actionLoading === deleteConfirm.id ? 'Menghapus...' : 'Hapus Evaluasi'}
          danger
          submitting={actionLoading === deleteConfirm.id}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  )
}

function QuestionnaireDetail({ questionnaireId, superAdminView }) {
  const navigate = useNavigate()
  const { profile } = useProfile()
  const [questionnaire, setQuestionnaire] = useState(null)
  const [tasks, setTasks] = useState([])
  const [criteria, setCriteria] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [questionnaireModal, setQuestionnaireModal] = useState(false)
  const [taskModal, setTaskModal] = useState(null)
  const [criteriaModal, setCriteriaModal] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [actionLoading, setActionLoading] = useState(null)
  const [dragState, setDragState] = useState(null)
  const [dropTarget, setDropTarget] = useState(null)
  const canManage = profile?.role === 'administrator' || questionnaire?.administrator_id === profile?.id
  const canViewEvaluationLinks = profile?.role === 'super_admin' || questionnaire?.administrator_id === profile?.id
  const canCreateEvaluationLink = questionnaire?.administrator_id === profile?.id
  const canManageEvaluationLinks = profile?.role === 'super_admin' || questionnaire?.administrator_id === profile?.id
  const backPath = superAdminView ? '/admin/semua-evaluasi' : '/admin/evaluasi'
  const hasTasks = tasks.length > 0
  const setupPriorityTitle = !canManage
    ? 'Tinjau konfigurasi evaluasi'
    : hasTasks
      ? 'Evaluasi siap dibagikan'
      : 'Tambahkan task scenario'
  const setupPriorityDescription = !canManage
    ? 'Periksa susunan evaluasi dan tautan publik dari panel di bawah.'
    : hasTasks
      ? 'Task sudah tersedia. Kriteria bersifat opsional, lalu buat link publik untuk responden.'
      : 'Task adalah langkah inti yang akan dikerjakan responden pada alur evaluasi.'

  const fetchDetail = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [questionnaireData, tasksData, criteriaData] = await Promise.all([
        api.get(`/questionnaires/${questionnaireId}`),
        api.get(`/questionnaires/${questionnaireId}/task-scenarios`),
        api.get(`/questionnaires/${questionnaireId}/eligibility-criteria`),
      ])
      setQuestionnaire(questionnaireData)
      setTasks(Array.isArray(tasksData) ? tasksData : [])
      setCriteria(Array.isArray(criteriaData) ? criteriaData : [])
    } catch (err) {
      setError(err.message || 'Gagal memuat detail evaluasi.')
    } finally {
      setLoading(false)
    }
  }, [questionnaireId])

  useEffect(() => {
    fetchDetail()
  }, [fetchDetail])

  const handleQuestionnaireUpdate = async (values) => {
    setActionLoading('questionnaire')
    try {
      const updated = await api.patch(`/questionnaires/${questionnaireId}`, values)
      setQuestionnaire(updated)
      setQuestionnaireModal(false)
    } finally {
      setActionLoading(null)
    }
  }

  const handleTaskSubmit = async (values) => {
    const editing = taskModal?.id
    setActionLoading(editing || 'task-create')
    try {
      const path = editing
        ? `/task-scenarios/${editing}`
        : `/questionnaires/${questionnaireId}/task-scenarios`
      const result = editing ? await api.patch(path, values) : await api.post(path, values)
      setTasks((current) => sortResources(editing ? current.map((task) => task.id === editing ? result : task) : [...current, result], 'task_order'))
      setTaskModal(null)
    } finally {
      setActionLoading(null)
    }
  }

  const handleCriteriaSubmit = async (values) => {
    const editing = criteriaModal?.id
    setActionLoading(editing || 'criteria-create')
    try {
      const path = editing
        ? `/eligibility-criteria/${editing}`
        : `/questionnaires/${questionnaireId}/eligibility-criteria`
      const result = editing ? await api.patch(path, values) : await api.post(path, values)
      setCriteria((current) => sortResources(editing ? current.map((criterion) => criterion.id === editing ? result : criterion) : [...current, result], 'criteria_order'))
      setCriteriaModal(null)
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeleteRelated = async () => {
    if (!deleteConfirm) return
    setActionLoading(deleteConfirm.id)
    try {
      await api.del(deleteConfirm.type === 'task' ? `/task-scenarios/${deleteConfirm.id}` : `/eligibility-criteria/${deleteConfirm.id}`)
      if (deleteConfirm.type === 'task') {
        setTasks((current) => current.filter((task) => task.id !== deleteConfirm.id))
      } else {
        setCriteria((current) => current.filter((criterion) => criterion.id !== deleteConfirm.id))
      }
      setDeleteConfirm(null)
    } catch (err) {
      setError(err.message || 'Gagal menghapus data.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDragStart = (event, type, id) => {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(id))
    setDragState({ type, id })
  }

  const handleDragOver = (event, type, id) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    if (dragState?.type !== type || String(dropTarget?.id) !== String(id)) {
      setDropTarget({ type, id })
    }
  }

  const handleDragEnd = () => {
    setDragState(null)
    setDropTarget(null)
  }

  const handleDrop = async (event, type, targetId) => {
    event.preventDefault()
    const sourceId = dragState?.type === type ? dragState.id : event.dataTransfer.getData('text/plain')
    const orderField = type === 'task' ? 'task_order' : 'criteria_order'
    const currentItems = type === 'task' ? tasks : criteria
    const reordered = moveResource(currentItems, sourceId, targetId, orderField)

    setDragState(null)
    setDropTarget(null)
    if (!reordered) return

    if (type === 'task') setTasks(reordered)
    else setCriteria(reordered)

    const action = `${type}-reorder`
    setActionLoading(action)
    setError('')
    try {
      const path = type === 'task' ? '/task-scenarios' : '/eligibility-criteria'
      const results = await Promise.allSettled(
        reordered.map((item) => api.patch(`${path}/${item.id}`, { [orderField]: item[orderField] })),
      )
      const failedRequest = results.find((result) => result.status === 'rejected')
      if (failedRequest) throw failedRequest.reason
    } catch (err) {
      const message = err.message || 'Gagal menyimpan urutan data.'
      await fetchDetail()
      setError(message)
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) return <div className="page-container questionnaire-page"><div className="detail-loading">Memuat detail evaluasi...</div></div>
  if (error && !questionnaire) {
    return (
      <div className="page-container questionnaire-page">
        <button className="back-link" onClick={() => navigate(backPath)}>← Kembali ke daftar</button>
        <div className="page-error" role="alert">{error}</div>
      </div>
    )
  }
  if (!questionnaire) return null

  return (
    <div className="page-container questionnaire-page detail-page">
      <button className="back-link" onClick={() => navigate(backPath)}>← Kembali ke daftar evaluasi</button>
      {error && <div className="page-error" role="alert">{error}</div>}

      <section className="detail-hero">
        <div className="detail-hero-copy">
          <div className="detail-kicker">{questionnaire.app_name}</div>
          <h1>{questionnaire.title}</h1>
          <p>{questionnaire.description || 'Belum ada deskripsi evaluasi.'}</p>
          <div className="detail-meta">
            <span className={`status-badge ${statusClass(questionnaire.status)}`}>{statusLabel(questionnaire.status)}</span>
            <span>Versi {questionnaire.itauq_version || 'itauq-v1'}</span>
            <span>Dibuat {formatDate(questionnaire.created_at)}</span>
          </div>
        </div>
        {canManage && (
          <button className="primary-btn-sm detail-edit-btn" onClick={() => setQuestionnaireModal(true)}>Edit Informasi</button>
        )}
      </section>

      <section className="setup-flow" aria-label="Alur penyiapan evaluasi">
        <div className="setup-flow-heading">
          <div>
            <p className="page-eyebrow">Setup Evaluasi</p>
            <h2>Susun alur responden dari atas ke bawah</h2>
            <p className="setup-flow-intro">Mulai dari informasi aplikasi, lalu susun task yang akan dikerjakan responden. Setelah itu, tambahkan kriteria kelayakan bila diperlukan dan bagikan link publik saat evaluasi siap digunakan.</p>
          </div>
          <div className="setup-priority">
            <span className="setup-priority-label">Prioritas berikutnya</span>
            <strong>{setupPriorityTitle}</strong>
            <p>{setupPriorityDescription}</p>
            {canManage && !hasTasks && <button className="setup-priority-action" type="button" onClick={() => setTaskModal({})}>+ Tambah Task</button>}
            {hasTasks && canViewEvaluationLinks && <a className="setup-priority-action" href="#evaluation-links">{canCreateEvaluationLink ? 'Atur link publik' : 'Lihat link publik'} ↗</a>}
          </div>
        </div>
        <div className="setup-steps">
          <SetupStep number="1" title="Info evaluasi" description="Judul, aplikasi, dan status" complete />
          <SetupStep number="2" title="Task scenario" description={`${tasks.length} task ditambahkan`} active={canManage && !hasTasks} complete={hasTasks} />
          <SetupStep number="3" title="Kriteria" description={criteria.length > 0 ? `${criteria.length} kriteria ditambahkan` : 'Opsional · bisa dilewati'} active={false} complete={criteria.length > 0} optional={!criteria.length} />
          <SetupStep number="4" title="Link publik" description={canCreateEvaluationLink ? 'Bagikan ke responden' : canViewEvaluationLinks ? 'Kelola link responden' : 'Tersedia setelah setup'} active={canCreateEvaluationLink && hasTasks} />
        </div>
        <div className="setup-flow-note"><span aria-hidden="true">i</span><span>ITAUQ {questionnaire.itauq_version || 'itauq-v1'} otomatis tersedia untuk setiap evaluasi; tidak perlu dikonfigurasi manual.</span></div>
      </section>

      <div className="detail-grid">
        <ResourceSection
          tone="primary"
          eyebrow="Langkah inti"
          title="Task Scenario"
          description="Langkah yang harus diselesaikan responden selama evaluasi. Seret kartu untuk mengubah urutan."
          emptyText="Belum ada task scenario. Tambahkan setidaknya satu alur yang ingin diuji."
          addLabel="+ Tambah Task"
          canManage={canManage}
          onAdd={() => setTaskModal({ task_order: tasks.length + 1 })}
        >
          {tasks.length > 0 && (
            <div className="resource-list">
              {tasks.map((task, index) => (
                <ResourceCard
                  key={task.id}
                  number={index + 1}
                  title={task.title}
                  description={task.instruction}
                  draggable={canManage && !actionLoading}
                  dragging={dragState?.type === 'task' && String(dragState.id) === String(task.id)}
                  dragOver={dropTarget?.type === 'task' && String(dropTarget.id) === String(task.id)}
                  onDragStart={(event) => handleDragStart(event, 'task', task.id)}
                  onDragOver={(event) => handleDragOver(event, 'task', task.id)}
                  onDrop={(event) => handleDrop(event, 'task', task.id)}
                  onDragEnd={handleDragEnd}
                >
                  <div className="resource-actions">
                    {canManage && <button className="text-action" onClick={() => setTaskModal(task)}>Edit</button>}
                    {canManage && <button className="text-action danger" onClick={() => setDeleteConfirm({ ...task, type: 'task' })}>Hapus</button>}
                  </div>
                </ResourceCard>
              ))}
            </div>
          )}
        </ResourceSection>

        <ResourceSection
          tone="optional"
          eyebrow="Opsional"
          title="Kriteria Kelayakan"
          description="Pernyataan yang harus disetujui responden sebelum mengisi identitas. Seret kartu untuk mengubah urutan."
          emptyText="Tidak ada kriteria. Gate kelayakan akan dilewati oleh responden."
          addLabel="+ Tambah Kriteria"
          canManage={canManage}
          onAdd={() => setCriteriaModal({})}
        >
          {criteria.length > 0 && (
            <div className="resource-list">
              {criteria.map((criterion) => (
                <ResourceCard
                  key={criterion.id}
                  number={criterion.criteria_order}
                  title={criterion.statement}
                  draggable={canManage && !actionLoading}
                  dragging={dragState?.type === 'criteria' && String(dragState.id) === String(criterion.id)}
                  dragOver={dropTarget?.type === 'criteria' && String(dropTarget.id) === String(criterion.id)}
                  onDragStart={(event) => handleDragStart(event, 'criteria', criterion.id)}
                  onDragOver={(event) => handleDragOver(event, 'criteria', criterion.id)}
                  onDrop={(event) => handleDrop(event, 'criteria', criterion.id)}
                  onDragEnd={handleDragEnd}
                >
                  <div className="resource-actions">
                    {canManage && <button className="text-action" onClick={() => setCriteriaModal(criterion)}>Edit</button>}
                    {canManage && <button className="text-action danger" onClick={() => setDeleteConfirm({ ...criterion, type: 'criteria' })}>Hapus</button>}
                  </div>
                </ResourceCard>
              ))}
            </div>
          )}
        </ResourceSection>
      </div>

      <EvaluationLinksSection
        questionnaireId={questionnaireId}
        canView={canViewEvaluationLinks}
        canCreate={canCreateEvaluationLink}
        canManage={canManageEvaluationLinks}
      />

      {questionnaireModal && (
        <QuestionnaireModal
          questionnaire={questionnaire}
          onClose={() => setQuestionnaireModal(false)}
          onSubmit={handleQuestionnaireUpdate}
          submitting={actionLoading === 'questionnaire'}
        />
      )}
      {taskModal && (
        <TaskModal
          task={taskModal.id ? taskModal : null}
          onClose={() => setTaskModal(null)}
          onSubmit={handleTaskSubmit}
          submitting={actionLoading === (taskModal.id || 'task-create')}
        />
      )}
      {criteriaModal && (
        <CriteriaModal
          criterion={criteriaModal.id ? criteriaModal : null}
          onClose={() => setCriteriaModal(null)}
          onSubmit={handleCriteriaSubmit}
          submitting={actionLoading === (criteriaModal.id || 'criteria-create')}
        />
      )}
      {deleteConfirm && (
        <ConfirmModal
          title={`Hapus ${deleteConfirm.type === 'task' ? 'task scenario' : 'kriteria'}?`}
          description="Data yang dihapus tidak dapat dipulihkan."
          confirmLabel={actionLoading === deleteConfirm.id ? 'Menghapus...' : 'Hapus'}
          danger
          submitting={actionLoading === deleteConfirm.id}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={handleDeleteRelated}
        />
      )}
    </div>
  )
}

function SetupStep({ number, title, description, active, complete, optional }) {
  return (
    <div className={`setup-step${active ? ' active' : ''}${complete ? ' complete' : ''}${optional ? ' optional' : ''}`}>
      <span className="setup-step-number">{complete ? '✓' : number}</span>
      <span className="setup-step-copy"><strong>{title}</strong><small>{description}</small></span>
    </div>
  )
}

function ResourceSection({ tone = 'default', eyebrow, title, description, emptyText, addLabel, canManage, onAdd, children }) {
  const hasChildren = Boolean(children)
  return (
    <section className={`resource-section resource-section-${tone}`}>
      <div className="resource-section-header">
        <div>
          {eyebrow && <span className="resource-section-eyebrow">{eyebrow}</span>}
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        {canManage && <button className="secondary-btn-sm" onClick={onAdd}>{addLabel}</button>}
      </div>
      {hasChildren ? children : <div className="resource-empty">{emptyText}</div>}
    </section>
  )
}

function ResourceCard({ number, title, description, children, draggable = false, dragging, dragOver, onDragStart, onDragOver, onDrop, onDragEnd }) {
  return (
    <article
      className={`resource-card${draggable ? ' is-draggable' : ''}${dragging ? ' is-dragging' : ''}${dragOver ? ' is-drag-over' : ''}`}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      <div className="resource-number">{number ?? 0}</div>
      {draggable && <span className="resource-drag-handle" title="Seret untuk mengubah urutan" aria-hidden="true">⋮⋮</span>}
      <div className="resource-content">
        <h3>{title}</h3>
        {description && <p>{description}</p>}
        {children}
      </div>
    </article>
  )
}

function QuestionnaireModal({ questionnaire, onClose, onSubmit, submitting }) {
  const [form, setForm] = useState(() => ({ ...emptyQuestionnaire, ...questionnaire }))
  const [error, setError] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(form.img_link || '')
  const [uploading, setUploading] = useState(false)
  const editing = Boolean(questionnaire)

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }))

  const handleFileChange = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Hanya file gambar yang diperbolehkan.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Ukuran file maksimal 10 MB sebelum kompresi.')
      return
    }
    setError('')
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const removeImage = () => {
    setImageFile(null)
    setImagePreview('')
    update('img_link', '')
  }

  const submit = async (event) => {
    event.preventDefault()
    if (!form.title.trim() || !form.app_name.trim()) {
      setError('Judul dan nama aplikasi wajib diisi.')
      return
    }
    if (form.app_link.trim() && !/^https?:\/\/.+/.test(form.app_link.trim())) {
      setError('Link aplikasi harus diawali http:// atau https://')
      return
    }
    setError('')
    try {
      let imgUrl = form.img_link || ''
      if (imageFile) {
        setUploading(true)
        imgUrl = await uploadQuestionnaireImage(imageFile)
        setUploading(false)
      }
      await onSubmit({
        title: form.title.trim(),
        app_name: form.app_name.trim(),
        description: form.description.trim(),
        status: form.status,
        app_link: form.app_link.trim() || '',
        img_link: imgUrl,
        ...(editing ? {} : { itauq_version: form.itauq_version.trim() || 'itauq-v1' }),
      })
    } catch (err) {
      setUploading(false)
      setError(err.message || 'Gagal menyimpan evaluasi.')
    }
  }

  return (
    <Modal title={editing ? 'Edit Evaluasi' : 'Buat Evaluasi'} onClose={onClose}>
      <form onSubmit={submit}>
        {error && <div className="change-pw-error modal-error">{error}</div>}
        <div className="modal-field"><label htmlFor="questionnaire-title">Judul Evaluasi</label><input id="questionnaire-title" className="modal-input" value={form.title} onChange={(event) => update('title', event.target.value)} autoFocus /></div>
        <div className="modal-field"><label htmlFor="questionnaire-app">Nama Aplikasi</label><input id="questionnaire-app" className="modal-input" value={form.app_name} onChange={(event) => update('app_name', event.target.value)} /></div>
        <div className="modal-field"><label htmlFor="questionnaire-description">Deskripsi <span>(opsional)</span></label><textarea id="questionnaire-description" className="modal-textarea" value={form.description || ''} onChange={(event) => update('description', event.target.value)} rows={3} /></div>
        <div className="modal-two-columns">
          <div className="modal-field"><label htmlFor="questionnaire-status">Status</label><select id="questionnaire-status" className="modal-input" value={form.status} onChange={(event) => update('status', event.target.value)}>{STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
          {!editing && <div className="modal-field"><label htmlFor="questionnaire-version">Versi ITAUQ</label><input id="questionnaire-version" className="modal-input" value={form.itauq_version} onChange={(event) => update('itauq_version', event.target.value)} /></div>}
        </div>
        <div className="modal-field">
          <label htmlFor="questionnaire-app-link">Link Aplikasi <span>(opsional)</span></label>
          <input id="questionnaire-app-link" className="modal-input" type="url" placeholder="https://contoh.com" value={form.app_link} onChange={(event) => update('app_link', event.target.value)} />
          <span className="modal-help">Tautan ke aplikasi yang akan dievaluasi responden.</span>
        </div>
        <div className="modal-field">
          <label>Gambar Aplikasi <span>(opsional)</span></label>
          {imagePreview ? (
            <div className="modal-image-preview">
              <img src={imagePreview} alt="Pratinjau gambar aplikasi" />
              <button type="button" className="modal-image-remove" onClick={removeImage} title="Hapus gambar">×</button>
            </div>
          ) : (
            <label htmlFor="questionnaire-image" className="modal-image-upload">
              <span className="modal-image-upload-icon" aria-hidden="true">+</span>
              <span>Pilih gambar</span>
              <small>JPG, PNG, WEBP — dikompres otomatis di bawah 500 KB</small>
            </label>
          )}
          <input id="questionnaire-image" type="file" accept="image/*" onChange={handleFileChange} className="modal-image-input" />
        </div>
        <ModalActions onClose={onClose} submitting={submitting || uploading} submitLabel={uploading ? 'Mengunggah gambar...' : editing ? 'Simpan Perubahan' : 'Buat Evaluasi'} />
      </form>
    </Modal>
  )
}

function TaskModal({ task, onClose, onSubmit, submitting }) {
  const [form, setForm] = useState({ title: task?.title || '', instruction: task?.instruction || '', task_order: task?.task_order ?? 1 })
  const [error, setError] = useState('')
  const submit = async (event) => {
    event.preventDefault()
    if (!form.title.trim() || !form.instruction.trim()) {
      setError('Judul dan instruksi task wajib diisi.')
      return
    }
    setError('')
    try {
      await onSubmit({ title: form.title.trim(), instruction: form.instruction.trim(), task_order: Math.max(1, Number(form.task_order) || 1) })
    } catch (err) {
      setError(err.message || 'Gagal menyimpan task scenario.')
    }
  }
  return (
    <Modal title={task ? 'Edit Task Scenario' : 'Tambah Task Scenario'} onClose={onClose}>
      <form onSubmit={submit}>
        {error && <div className="change-pw-error modal-error">{error}</div>}
        <div className="modal-field"><label htmlFor="task-title">Judul Task</label><input id="task-title" className="modal-input" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} autoFocus /></div>
        <div className="modal-field"><label htmlFor="task-instruction">Instruksi</label><textarea id="task-instruction" className="modal-textarea" value={form.instruction} onChange={(event) => setForm((current) => ({ ...current, instruction: event.target.value }))} rows={4} /></div>
        <div className="modal-field"><label htmlFor="task-order">Urutan Tampilan</label><input id="task-order" className="modal-input" type="number" min="1" step="1" value={form.task_order} onChange={(event) => setForm((current) => ({ ...current, task_order: event.target.value }))} /></div>
        <ModalActions onClose={onClose} submitting={submitting} submitLabel={task ? 'Simpan Perubahan' : 'Tambah Task'} />
      </form>
    </Modal>
  )
}

function CriteriaModal({ criterion, onClose, onSubmit, submitting }) {
  const [form, setForm] = useState({ statement: criterion?.statement || '', criteria_order: criterion?.criteria_order ?? 0 })
  const [error, setError] = useState('')
  const submit = async (event) => {
    event.preventDefault()
    if (!form.statement.trim()) {
      setError('Pernyataan kriteria tidak boleh kosong.')
      return
    }
    setError('')
    try {
      await onSubmit({ statement: form.statement.trim(), criteria_order: Number(form.criteria_order) || 0 })
    } catch (err) {
      setError(err.message || 'Gagal menyimpan kriteria.')
    }
  }
  return (
    <Modal title={criterion ? 'Edit Kriteria' : 'Tambah Kriteria'} onClose={onClose}>
      <form onSubmit={submit}>
        {error && <div className="change-pw-error modal-error">{error}</div>}
        <div className="modal-field"><label htmlFor="criteria-statement">Pernyataan</label><textarea id="criteria-statement" className="modal-textarea" value={form.statement} onChange={(event) => setForm((current) => ({ ...current, statement: event.target.value }))} rows={4} autoFocus /></div>
        <div className="modal-field"><label htmlFor="criteria-order">Urutan Tampilan</label><input id="criteria-order" className="modal-input" type="number" min="0" step="1" value={form.criteria_order} onChange={(event) => setForm((current) => ({ ...current, criteria_order: event.target.value }))} /></div>
        <ModalActions onClose={onClose} submitting={submitting} submitLabel={criterion ? 'Simpan Perubahan' : 'Tambah Kriteria'} />
      </form>
    </Modal>
  )
}

function Modal({ title, onClose, children }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card questionnaire-modal" onClick={(event) => event.stopPropagation()}>
        <h2 className="modal-title">{title}</h2>
        {children}
      </div>
    </div>
  )
}

function ModalActions({ onClose, submitting, submitLabel }) {
  return (
    <div className="modal-actions">
      <button type="button" className="modal-btn cancel" onClick={onClose}>Batal</button>
      <button type="submit" className="modal-btn confirm" disabled={submitting}>{submitting ? 'Menyimpan...' : submitLabel}</button>
    </div>
  )
}

function ConfirmModal({ title, description, confirmLabel, danger, submitting, onClose, onConfirm }) {
  return (
    <Modal title={title} onClose={onClose}>
      <p className="modal-desc">{description}</p>
      <div className="modal-actions">
        <button type="button" className="modal-btn cancel" onClick={onClose}>Batal</button>
        <button type="button" className={`modal-btn ${danger ? 'confirm-reject' : 'confirm'}`} onClick={onConfirm} disabled={submitting}>{confirmLabel}</button>
      </div>
    </Modal>
  )
}
