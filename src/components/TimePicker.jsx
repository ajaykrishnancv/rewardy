import { useState, useRef, useEffect } from 'react'

// Generate hours (1-12)
const HOURS = Array.from({ length: 12 }, (_, i) => i + 1)
// Generate minutes (00, 05, 10, ... 55)
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5)
const PERIODS = ['AM', 'PM']

// Convert 24-hour time string to 12-hour format object
function parse24to12(timeStr) {
  if (!timeStr) return { hour: 12, minute: 0, period: 'PM' }
  const [h, m] = timeStr.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  // Round minute to nearest 5
  const minute = Math.round(m / 5) * 5 % 60
  return { hour, minute, period }
}

// Convert 12-hour format object to 24-hour time string
function format12to24(hour, minute, period) {
  let h = hour
  if (period === 'AM') {
    h = hour === 12 ? 0 : hour
  } else {
    h = hour === 12 ? 12 : hour + 12
  }
  return `${String(h).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

// Scroll wheel component for each column
function ScrollWheel({ items, value, onChange, formatItem }) {
  const containerRef = useRef(null)
  const itemHeight = 44 // Height of each item in pixels
  const visibleItems = 5 // Number of visible items
  const [isScrolling, setIsScrolling] = useState(false)
  const scrollTimeoutRef = useRef(null)

  const currentIndex = items.indexOf(value)

  // Center the selected item on mount and value change
  useEffect(() => {
    if (containerRef.current && !isScrolling) {
      const scrollTop = currentIndex * itemHeight
      containerRef.current.scrollTop = scrollTop
    }
  }, [value, currentIndex, isScrolling])

  const handleScroll = (e) => {
    setIsScrolling(true)

    // Clear previous timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }

    // Set new timeout to snap to nearest item
    scrollTimeoutRef.current = setTimeout(() => {
      const scrollTop = e.target.scrollTop
      const index = Math.round(scrollTop / itemHeight)
      const clampedIndex = Math.max(0, Math.min(items.length - 1, index))

      if (items[clampedIndex] !== value) {
        onChange(items[clampedIndex])
      }

      // Smooth scroll to snapped position
      e.target.scrollTo({
        top: clampedIndex * itemHeight,
        behavior: 'smooth'
      })

      setIsScrolling(false)
    }, 100)
  }

  const handleItemClick = (item, index) => {
    onChange(item)
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: index * itemHeight,
        behavior: 'smooth'
      })
    }
  }

  return (
    <div className="relative h-[220px] overflow-hidden">
      {/* Gradient overlays */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-gray-900/90 to-transparent z-10 pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-gray-900/90 to-transparent z-10 pointer-events-none" />

      {/* Selection indicator */}
      <div className="absolute top-1/2 left-0 right-0 h-[44px] -translate-y-1/2 bg-white/10 border-y border-white/20 z-5 pointer-events-none" />

      {/* Scrollable container */}
      <div
        ref={containerRef}
        className="h-full overflow-y-auto scrollbar-hide snap-y snap-mandatory"
        onScroll={handleScroll}
        style={{
          paddingTop: itemHeight * 2,
          paddingBottom: itemHeight * 2,
          scrollSnapType: 'y mandatory'
        }}
      >
        {items.map((item, index) => {
          const isSelected = item === value
          return (
            <div
              key={item}
              className={`h-[44px] flex items-center justify-center cursor-pointer transition-all snap-center
                ${isSelected
                  ? 'text-white text-xl font-bold'
                  : 'text-white/40 text-lg hover:text-white/60'
                }`}
              onClick={() => handleItemClick(item, index)}
            >
              {formatItem ? formatItem(item) : item}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function TimePicker({ value, onChange, label }) {
  const [isOpen, setIsOpen] = useState(false)
  const [tempValue, setTempValue] = useState(() => parse24to12(value))
  const modalRef = useRef(null)

  // Parse value when it changes externally
  useEffect(() => {
    setTempValue(parse24to12(value))
  }, [value])

  const handleOpen = () => {
    setTempValue(parse24to12(value))
    setIsOpen(true)
  }

  const handleConfirm = () => {
    const timeStr = format12to24(tempValue.hour, tempValue.minute, tempValue.period)
    onChange(timeStr)
    setIsOpen(false)
  }

  const handleCancel = () => {
    setTempValue(parse24to12(value))
    setIsOpen(false)
  }

  // Format display value
  const displayValue = value
    ? `${tempValue.hour}:${String(tempValue.minute).padStart(2, '0')} ${tempValue.period}`
    : 'Select time'

  return (
    <>
      {/* Input button */}
      <button
        type="button"
        onClick={handleOpen}
        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white text-left focus:outline-none focus:border-neon-blue hover:bg-white/15 transition-colors flex items-center justify-between"
      >
        <span className={value ? 'text-white' : 'text-white/40'}>
          {displayValue}
        </span>
        <svg className="w-5 h-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      {/* Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-[200] p-0 sm:p-4"
          onClick={(e) => e.target === e.currentTarget && handleCancel()}
        >
          <div
            ref={modalRef}
            className="bg-gray-900 w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl overflow-hidden shadow-2xl border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
              <button
                onClick={handleCancel}
                className="text-white/60 hover:text-white transition-colors px-2 py-1"
              >
                Cancel
              </button>
              <span className="text-white font-medium">{label || 'Select Time'}</span>
              <button
                onClick={handleConfirm}
                className="text-neon-blue font-medium hover:text-neon-purple transition-colors px-2 py-1"
              >
                Done
              </button>
            </div>

            {/* Picker wheels */}
            <div className="flex items-center justify-center px-4 py-2">
              {/* Hour wheel */}
              <div className="flex-1 max-w-[80px]">
                <ScrollWheel
                  items={HOURS}
                  value={tempValue.hour}
                  onChange={(hour) => setTempValue(prev => ({ ...prev, hour }))}
                />
              </div>

              {/* Separator */}
              <div className="text-white text-2xl font-bold px-1">:</div>

              {/* Minute wheel */}
              <div className="flex-1 max-w-[80px]">
                <ScrollWheel
                  items={MINUTES}
                  value={tempValue.minute}
                  onChange={(minute) => setTempValue(prev => ({ ...prev, minute }))}
                  formatItem={(m) => String(m).padStart(2, '0')}
                />
              </div>

              {/* AM/PM wheel */}
              <div className="flex-1 max-w-[80px] ml-2">
                <ScrollWheel
                  items={PERIODS}
                  value={tempValue.period}
                  onChange={(period) => setTempValue(prev => ({ ...prev, period }))}
                />
              </div>
            </div>

            {/* Quick select buttons */}
            <div className="px-4 pb-4 pt-2 border-t border-white/10">
              <p className="text-xs text-white/50 mb-2">Quick Select</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Morning', time: '09:00' },
                  { label: 'Noon', time: '12:00' },
                  { label: 'Afternoon', time: '15:00' },
                  { label: 'Evening', time: '18:00' },
                  { label: 'Night', time: '21:00' },
                ].map(({ label, time }) => (
                  <button
                    key={label}
                    onClick={() => {
                      setTempValue(parse24to12(time))
                    }}
                    className="px-3 py-1.5 text-xs bg-white/10 text-white/70 rounded-lg hover:bg-white/20 hover:text-white transition-colors"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Safe area for mobile */}
            <div className="h-safe-area-inset-bottom bg-gray-900" />
          </div>
        </div>
      )}
    </>
  )
}
