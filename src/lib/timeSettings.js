// Time Settings Utilities for Rewardy
// Handles custom day boundaries and time format preferences

// Default settings
export const DEFAULT_TIME_SETTINGS = {
  dayStartTime: '04:00', // 4 AM default start of day
  use24HourFormat: false, // Use 12-hour format by default
  timezone: 'Asia/Kolkata'
}

// Get time settings from family settings or use defaults
export function getTimeSettings(familySettings = {}) {
  return {
    dayStartTime: familySettings.dayStartTime || DEFAULT_TIME_SETTINGS.dayStartTime,
    use24HourFormat: familySettings.use24HourFormat ?? DEFAULT_TIME_SETTINGS.use24HourFormat,
    timezone: familySettings.timezone || DEFAULT_TIME_SETTINGS.timezone
  }
}

// Convert time string "HH:MM" to minutes since midnight
export function timeToMinutes(timeStr) {
  if (!timeStr) return 0
  const [hours, minutes] = timeStr.split(':').map(Number)
  return hours * 60 + minutes
}

// Convert minutes since midnight to time string "HH:MM"
export function minutesToTime(minutes) {
  const hours = Math.floor(minutes / 60) % 24
  const mins = minutes % 60
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
}

// Format time to 12-hour or 24-hour format based on settings
export function formatTime(timeStr, use24HourFormat = false) {
  if (!timeStr) return ''
  const [hours, minutes] = timeStr.split(':').map(Number)

  if (use24HourFormat) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  }

  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`
}

// Get the "logical date" for a given datetime based on day start time
// For example, if dayStartTime is 04:00 (4 AM), then:
// - 3:00 AM on Dec 2 is considered Dec 1's day
// - 5:00 AM on Dec 2 is considered Dec 2's day
export function getLogicalDate(datetime = new Date(), dayStartTime = '04:00') {
  const date = new Date(datetime)
  const startMinutes = timeToMinutes(dayStartTime)
  const currentMinutes = date.getHours() * 60 + date.getMinutes()

  // If current time is before the day start, we're still in "yesterday"
  if (currentMinutes < startMinutes) {
    date.setDate(date.getDate() - 1)
  }

  return getLocalDateString(date)
}

// Get local date string (YYYY-MM-DD) without timezone issues
export function getLocalDateString(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Get the date range for a "logical day" based on day start time
// Returns { start: Date, end: Date } for the given logical date
export function getLogicalDayRange(logicalDate, dayStartTime = '04:00') {
  const startMinutes = timeToMinutes(dayStartTime)
  const startHours = Math.floor(startMinutes / 60)
  const startMins = startMinutes % 60

  // Parse the date string
  const [year, month, day] = logicalDate.split('-').map(Number)

  // Start of the logical day
  const start = new Date(year, month - 1, day, startHours, startMins, 0, 0)

  // End is 24 hours later (start of next logical day)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)

  return { start, end }
}

// Check if a given time falls within the current logical day
export function isTimeInLogicalDay(timeStr, logicalDate, dayStartTime = '04:00') {
  if (!timeStr) return true // No scheduled time means anytime

  const timeMinutes = timeToMinutes(timeStr)
  const dayStartMinutes = timeToMinutes(dayStartTime)

  // A time before dayStartTime belongs to the previous calendar day
  // but the same logical day
  // For example: if dayStartTime is 04:00
  // - 03:00 on the calendar is part of the previous logical day
  // - 05:00 on the calendar is part of the current logical day

  // If the task time is before day start, it's scheduled for the "late night" portion
  // of the logical day (which is technically the next calendar day)
  if (timeMinutes < dayStartMinutes) {
    // This is a late-night task (e.g., 1 AM task when day starts at 4 AM)
    // It belongs to the previous logical day
    return true // We consider it part of the current logical day view
  }

  return true
}

// Get the greeting based on time of day and time settings
export function getGreeting(dayStartTime = '04:00') {
  const now = new Date()
  const hours = now.getHours()

  if (hours < 12) return 'Good Morning'
  if (hours < 17) return 'Good Afternoon'
  return 'Good Evening'
}

// Get available time slots based on day start time
export function getTimeSlots(dayStartTime = '04:00') {
  const startMinutes = timeToMinutes(dayStartTime)
  const slots = []

  // Generate 24 hours of slots starting from dayStartTime
  for (let i = 0; i < 24; i++) {
    const minutes = (startMinutes + i * 60) % (24 * 60)
    slots.push(minutesToTime(minutes))
  }

  return slots
}

// Parse time from different formats
export function parseTime(input) {
  if (!input) return null

  // Already in HH:MM format
  if (/^\d{2}:\d{2}$/.test(input)) {
    return input
  }

  // Handle "3:30 PM" style
  const match = input.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i)
  if (match) {
    let hours = parseInt(match[1])
    const minutes = parseInt(match[2])
    const period = match[3]?.toUpperCase()

    if (period === 'PM' && hours !== 12) hours += 12
    if (period === 'AM' && hours === 12) hours = 0

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  }

  return null
}

// Get chronological sort value for a time based on day start
// Times after dayStartTime come first, times before dayStartTime come later
// This ensures proper chronological order for a "logical day"
export function getChronologicalSortValue(timeStr, dayStartTime = '04:00') {
  if (!timeStr) return 9999 // Unscheduled tasks go to the end

  const timeMinutes = timeToMinutes(timeStr)
  const dayStartMinutes = timeToMinutes(dayStartTime)

  // If time is >= dayStart, it's in the "main" part of the day (earlier in sort order)
  // If time is < dayStart, it's in the "late night" part (later in sort order)
  if (timeMinutes >= dayStartMinutes) {
    return timeMinutes - dayStartMinutes
  } else {
    // Add 24 hours worth of minutes to push it after the main day times
    return (24 * 60) + timeMinutes - dayStartMinutes
  }
}

// Sort tasks chronologically based on day start time
export function sortTasksChronologically(tasks, dayStartTime = '04:00') {
  return [...tasks].sort((a, b) => {
    const aValue = getChronologicalSortValue(a.scheduled_time, dayStartTime)
    const bValue = getChronologicalSortValue(b.scheduled_time, dayStartTime)
    return aValue - bValue
  })
}
