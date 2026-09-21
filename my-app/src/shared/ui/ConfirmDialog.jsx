import { useId, useRef } from 'react'
import { useModalDialog } from '../clients/modalDialog'

/**
 * The app's one confirmation dialog. It exists so destructive actions stop using
 * `window.confirm`, which blocks the thread, ignores the design system, cannot be
 * styled and announces inconsistently across platforms.
 *
 * Focus lands on the cancel action because that is the least destructive choice.
 */
export default function ConfirmDialog({
  title,
  description,
  confirmLabel,
  cancelLabel = 'Batal',
  danger = false,
  busy = false,
  onConfirm,
  onClose,
}) {
  const dialogRef = useRef(null)
  const titleId = useId()

  useModalDialog({ dialogRef, onClose: busy ? undefined : onClose })

  return (
    <div className="modal-overlay" onClick={busy ? undefined : onClose}>
      <div
        ref={dialogRef}
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="modal-title" id={titleId}>{title}</h2>
        {description ? <p className="modal-desc">{description}</p> : null}
        <div className="modal-actions">
          <button type="button" className="modal-btn cancel" onClick={onClose} disabled={busy}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`modal-btn ${danger ? 'confirm-reject' : 'confirm'}`}
            onClick={onConfirm}
            disabled={busy}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
