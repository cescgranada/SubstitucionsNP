'use client'

import { createContext, useCallback, useContext, useRef, useState } from 'react'

type ToastTipus = 'success' | 'error'

interface Toast {
  id: number
  missatge: string
  tipus: ToastTipus
}

interface ToastContextValue {
  showToast: (missatge: string, tipus?: ToastTipus) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const DURADA_MS = 4000

/**
 * Proveïdor de notificacions "toast". Es munta una sola vegada al layout
 * de l'aplicació, així que un toast disparat abans d'un router.push()
 * segueix visible mentre es navega a la pàgina següent (el layout no
 * es desmunta entre rutes germanes).
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(0)

  const showToast = useCallback((missatge: string, tipus: ToastTipus = 'success') => {
    const id = nextId.current++
    setToasts(prev => [...prev, { id, missatge, tipus }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, DURADA_MS)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        className="fixed top-4 inset-x-0 z-50 flex flex-col items-center gap-2 px-4 pointer-events-none"
        aria-live="polite"
      >
        {toasts.map(t => (
          <div
            key={t.id}
            role="status"
            className="pointer-events-auto flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium shadow-lg animate-toast-in"
            style={{
              backgroundColor: t.tipus === 'success' ? 'var(--color-primary-dark)' : 'var(--color-danger)',
              color: 'white',
              maxWidth: '90vw',
            }}
          >
            {t.tipus === 'success' ? (
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            )}
            <span>{t.missatge}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

/** Cal fer servir aquest hook dins d'un `ToastProvider` (ja muntat al layout). */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast() s\'ha de fer servir dins d\'un <ToastProvider>')
  }
  return ctx
}
