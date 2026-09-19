import { useEffect, useRef } from 'react'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function getFocusable(root) {
  return Array.from(root.querySelectorAll(FOCUSABLE_SELECTOR))
    .filter((element) => element.getClientRects().length > 0)
}

// Sets `inert` on every sibling along the path from the dialog up to <body>, so the
// background stops being tabbable and drops out of the accessibility tree. Only
// siblings are touched, never an ancestor, so the dialog itself stays live.
function inertBackground(element) {
  const restored = []
  let node = element

  while (node && node !== document.body && node.parentElement) {
    for (const sibling of Array.from(node.parentElement.children)) {
      if (sibling !== node && !sibling.inert && !sibling.hasAttribute('aria-hidden')) {
        sibling.inert = true
        restored.push(sibling)
      }
    }
    node = node.parentElement
  }

  return () => {
    restored.forEach((sibling) => {
      sibling.inert = false
    })
  }
}

export function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function scrollBehavior() {
  return prefersReducedMotion() ? 'auto' : 'smooth'
}

export function useModalDialog({ open = true, dialogRef, onClose, restoreFocus = true }) {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return undefined
    const dialog = dialogRef.current
    if (!dialog) return undefined

    // Captured as the dialog opens, before any focus move below. Dialogs must not
    // use autoFocus: React applies it during commit, which would overwrite the
    // trigger before this effect runs.
    const trigger = document.activeElement
    const releaseInert = inertBackground(dialog)

    const focusTarget = dialog.querySelector('[data-autofocus]') || getFocusable(dialog)[0] || dialog
    focusTarget.focus?.()

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (typeof onCloseRef.current !== 'function') return
        event.preventDefault()
        onCloseRef.current()
        return
      }

      if (event.key !== 'Tab' || !dialog.isConnected) return

      const items = getFocusable(dialog)
      if (items.length === 0) {
        event.preventDefault()
        dialog.focus()
        return
      }

      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      const outside = !dialog.contains(active)

      if (event.shiftKey && (active === first || active === dialog || outside)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (active === last || outside)) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown, true)

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true)
      releaseInert()
      if (restoreFocus && trigger && trigger.isConnected && typeof trigger.focus === 'function') {
        trigger.focus()
      }
    }
  }, [open, dialogRef, restoreFocus])
}
