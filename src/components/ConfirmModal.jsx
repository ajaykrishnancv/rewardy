import { create } from 'zustand'

// Global modal store
export const useModalStore = create((set) => ({
  isOpen: false,
  title: '',
  message: '',
  type: 'confirm', // 'confirm', 'alert', 'delete', 'delete-schedule'
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  confirmStyle: 'primary', // 'primary', 'danger'
  onConfirm: null,
  onCancel: null,
  // For delete-schedule type (3 buttons)
  onDeleteInstance: null,
  onDeleteSchedule: null,

  // Show a simple alert (one button)
  showAlert: ({ title, message, buttonText = 'OK', onClose }) => set({
    isOpen: true,
    type: 'alert',
    title,
    message,
    confirmText: buttonText,
    onConfirm: () => {
      set({ isOpen: false })
      onClose?.()
    },
    onCancel: null,
  }),

  // Show a confirm dialog (two buttons)
  showConfirm: ({ title, message, confirmText = 'Confirm', cancelText = 'Cancel', confirmStyle = 'primary', onConfirm, onCancel }) => set({
    isOpen: true,
    type: 'confirm',
    title,
    message,
    confirmText,
    cancelText,
    confirmStyle,
    onConfirm: () => {
      set({ isOpen: false })
      onConfirm?.()
    },
    onCancel: () => {
      set({ isOpen: false })
      onCancel?.()
    },
  }),

  // Show a delete confirmation (two buttons with danger style)
  showDelete: ({ title, message, confirmText = 'Delete', onConfirm, onCancel }) => set({
    isOpen: true,
    type: 'delete',
    title,
    message,
    confirmText,
    cancelText: 'Cancel',
    confirmStyle: 'danger',
    onConfirm: () => {
      set({ isOpen: false })
      onConfirm?.()
    },
    onCancel: () => {
      set({ isOpen: false })
      onCancel?.()
    },
  }),

  // Show delete schedule dialog (three buttons)
  showDeleteSchedule: ({ title, message, onDeleteInstance, onDeleteSchedule, onCancel }) => set({
    isOpen: true,
    type: 'delete-schedule',
    title,
    message,
    onDeleteInstance: () => {
      set({ isOpen: false })
      onDeleteInstance?.()
    },
    onDeleteSchedule: () => {
      set({ isOpen: false })
      onDeleteSchedule?.()
    },
    onCancel: () => {
      set({ isOpen: false })
      onCancel?.()
    },
  }),

  // Show input prompt
  showPrompt: ({ title, message, placeholder = '', defaultValue = '', onSubmit, onCancel }) => set({
    isOpen: true,
    type: 'prompt',
    title,
    message,
    placeholder,
    inputValue: defaultValue,
    onConfirm: (value) => {
      set({ isOpen: false })
      onSubmit?.(value)
    },
    onCancel: () => {
      set({ isOpen: false })
      onCancel?.()
    },
  }),

  setInputValue: (value) => set({ inputValue: value }),

  close: () => set({ isOpen: false }),
}))

// Modal Component
export default function ConfirmModal() {
  const {
    isOpen,
    type,
    title,
    message,
    confirmText,
    cancelText,
    confirmStyle,
    onConfirm,
    onCancel,
    onDeleteInstance,
    onDeleteSchedule,
    placeholder,
    inputValue,
    setInputValue,
  } = useModalStore()

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
      <div className="glass-card p-6 max-w-md w-full animate-in fade-in zoom-in duration-200">
        {/* Icon based on type */}
        <div className="flex justify-center mb-4">
          {type === 'alert' && (
            <div className="w-14 h-14 rounded-full bg-blue-500/20 flex items-center justify-center">
              <span className="text-3xl">ℹ️</span>
            </div>
          )}
          {type === 'confirm' && (
            <div className="w-14 h-14 rounded-full bg-neon-blue/20 flex items-center justify-center">
              <span className="text-3xl">❓</span>
            </div>
          )}
          {(type === 'delete' || type === 'delete-schedule') && (
            <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center">
              <span className="text-3xl">🗑️</span>
            </div>
          )}
          {type === 'prompt' && (
            <div className="w-14 h-14 rounded-full bg-purple-500/20 flex items-center justify-center">
              <span className="text-3xl">✏️</span>
            </div>
          )}
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-white text-center mb-2">{title}</h3>

        {/* Message */}
        <p className="text-white/70 text-center mb-6 whitespace-pre-line">{message}</p>

        {/* Input for prompt type */}
        {type === 'prompt' && (
          <input
            type="text"
            value={inputValue || ''}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={placeholder}
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-neon-blue mb-6"
            autoFocus
          />
        )}

        {/* Buttons */}
        <div className="flex flex-col gap-3">
          {/* Alert - single button */}
          {type === 'alert' && (
            <button
              onClick={onConfirm}
              className="w-full py-3 bg-gradient-to-r from-neon-blue to-neon-purple text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
            >
              {confirmText}
            </button>
          )}

          {/* Confirm - two buttons */}
          {type === 'confirm' && (
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 py-3 bg-white/10 text-white rounded-xl font-medium hover:bg-white/20 transition-colors"
              >
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                className={`flex-1 py-3 text-white rounded-xl font-medium hover:opacity-90 transition-opacity ${
                  confirmStyle === 'danger'
                    ? 'bg-gradient-to-r from-red-500 to-orange-500'
                    : 'bg-gradient-to-r from-neon-blue to-neon-purple'
                }`}
              >
                {confirmText}
              </button>
            </div>
          )}

          {/* Delete - two buttons with danger style */}
          {type === 'delete' && (
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 py-3 bg-white/10 text-white rounded-xl font-medium hover:bg-white/20 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
              >
                {confirmText}
              </button>
            </div>
          )}

          {/* Delete Schedule - three buttons */}
          {type === 'delete-schedule' && (
            <>
              <button
                onClick={onDeleteInstance}
                className="w-full py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                <span>🗓️</span>
                <span>Delete Task (One Instance)</span>
              </button>
              <button
                onClick={onDeleteSchedule}
                className="w-full py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                <span>📅</span>
                <span>Delete Schedule (All Instances)</span>
              </button>
              <button
                onClick={onCancel}
                className="w-full py-3 bg-white/10 text-white rounded-xl font-medium hover:bg-white/20 transition-colors"
              >
                Cancel
              </button>
            </>
          )}

          {/* Prompt - two buttons */}
          {type === 'prompt' && (
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 py-3 bg-white/10 text-white rounded-xl font-medium hover:bg-white/20 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => onConfirm(inputValue)}
                className="flex-1 py-3 bg-gradient-to-r from-neon-blue to-neon-purple text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
              >
                Submit
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
