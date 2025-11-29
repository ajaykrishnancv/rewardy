import { useState, useEffect } from 'react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

const DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// Helper to get local date string (YYYY-MM-DD) without timezone issues
function getLocalDateString(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Helper to format 24-hour time to 12-hour AM/PM
function formatTimeToAMPM(timeStr) {
  if (!timeStr) return ''
  const [hours, minutes] = timeStr.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`
}

// Helper to check if a task is overdue (by day only)
function isTaskOverdue(task) {
  if (task.status !== 'pending') return false
  if (!task.task_date) return false

  const today = getLocalDateString()
  return task.task_date < today
}

const TIME_SLOTS = [
  '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00',
  '00:00', '01:00', '02:00', '03:00', '04:00'
]

const TASK_CATEGORIES = [
  { value: 'academic', label: 'Academic', icon: '📚', color: 'bg-blue-500/20 border-blue-500/40' },
  { value: 'chores', label: 'Chores', icon: '🧹', color: 'bg-orange-500/20 border-orange-500/40' },
  { value: 'health', label: 'Health', icon: '💪', color: 'bg-green-500/20 border-green-500/40' },
  { value: 'creative', label: 'Creative', icon: '🎨', color: 'bg-purple-500/20 border-purple-500/40' },
  { value: 'social', label: 'Social', icon: '👥', color: 'bg-pink-500/20 border-pink-500/40' },
  { value: 'other', label: 'Other', icon: '📋', color: 'bg-gray-500/20 border-gray-500/40' }
]

export default function SchedulePage() {
  const { user, hasPermission } = useAuthStore()
  const canEditSchedule = hasPermission('editSchedule')

  const [loading, setLoading] = useState(true)
  const [childProfile, setChildProfile] = useState(null)
  const [scheduleItems, setScheduleItems] = useState([]) // schedule_blocks (templates)
  const [weekTasks, setWeekTasks] = useState([]) // actual daily_tasks for the week
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const monday = new Date(today)
    monday.setDate(today.getDate() + diff)
    monday.setHours(0, 0, 0, 0)
    return monday
  })

  // Modal state
  const [showItemModal, setShowItemModal] = useState(false)
  const [showCopyDayModal, setShowCopyDayModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [editingTask, setEditingTask] = useState(null) // For editing actual tasks
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [copyFromDay, setCopyFromDay] = useState('monday')
  const [copyToDay, setCopyToDay] = useState('tuesday')
  const [modalKey, setModalKey] = useState(0)

  // Form state
  const [itemForm, setItemForm] = useState({
    title: '',
    description: '',
    category: 'academic',
    day_of_week: 'monday',
    start_time: '09:00',
    end_time: '10:00',
    star_value: 5,
    recurrence_type: 'weekly' // none, daily, weekly, monthly
  })

  useEffect(() => {
    if (user?.familyId) {
      loadData()
    }
  }, [user?.familyId, currentWeekStart])

  async function loadData() {
    try {
      setLoading(true)

      // Load child profile
      const { data: child } = await supabase
        .from('child_profiles')
        .select('*')
        .eq('family_id', user.familyId)
        .single()

      setChildProfile(child)

      if (child) {
        // Load schedule blocks (templates)
        const { data: items } = await supabase
          .from('schedule_blocks')
          .select('*')
          .eq('child_id', child.id)
          .eq('is_active', true)
          .order('start_time')

        setScheduleItems(items || [])

        // Load actual tasks for the current week (excluding bonus tasks)
        const weekDates = getWeekDates()
        const startDate = getLocalDateString(weekDates[0])
        const endDate = getLocalDateString(weekDates[6])

        const { data: tasks } = await supabase
          .from('daily_tasks')
          .select('*')
          .eq('child_id', child.id)
          .eq('is_bonus', false)
          .gte('task_date', startDate)
          .lte('task_date', endDate)
          .order('scheduled_time')

        setWeekTasks(tasks || [])
      }
    } catch (error) {
      console.error('Error loading schedule:', error)
      toast.error('Failed to load schedule')
    } finally {
      setLoading(false)
    }
  }

  function getWeekDates() {
    return DAYS_OF_WEEK.map((_, index) => {
      const date = new Date(currentWeekStart)
      date.setDate(currentWeekStart.getDate() + index)
      return date
    })
  }

  function navigateWeek(direction) {
    const newDate = new Date(currentWeekStart)
    newDate.setDate(currentWeekStart.getDate() + (direction * 7))
    setCurrentWeekStart(newDate)
  }

  function goToCurrentWeek() {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const monday = new Date(today)
    monday.setDate(today.getDate() + diff)
    monday.setHours(0, 0, 0, 0)
    setCurrentWeekStart(monday)
  }

  function openCreateItem(day, time) {
    setEditingItem(null)
    setEditingTask(null)
    setSelectedSlot({ day, time })
    setItemForm({
      title: '',
      description: '',
      category: 'academic',
      day_of_week: day,
      start_time: time,
      end_time: incrementTime(time),
      star_value: 5,
      recurrence_type: 'weekly'
    })
    setModalKey(k => k + 1)
    setShowItemModal(true)
  }

  function openEditItem(item) {
    setEditingItem(item)
    setEditingTask(null)
    setSelectedSlot(null)
    setItemForm({
      title: item.title,
      description: item.description || '',
      category: item.category || 'other',
      day_of_week: item.day_of_week,
      start_time: item.start_time,
      end_time: item.end_time || incrementTime(item.start_time),
      star_value: item.star_value || 5,
      recurrence_type: item.recurrence_type || (item.is_recurring ? 'weekly' : 'none')
    })
    setModalKey(k => k + 1)
    setShowItemModal(true)
  }

  // Open edit modal for an actual task
  function openEditTask(task) {
    setEditingTask(task)
    setEditingItem(null)
    setSelectedSlot(null)
    setItemForm({
      title: task.title,
      description: task.description || '',
      category: task.category || 'other',
      day_of_week: '', // Not used for tasks
      start_time: task.scheduled_time || '09:00',
      end_time: incrementTime(task.scheduled_time || '09:00'),
      star_value: task.star_value || 5,
      recurrence_type: 'none' // Tasks are single instances
    })
    setModalKey(k => k + 1)
    setShowItemModal(true)
  }

  function incrementTime(time) {
    const [hours, minutes] = time.split(':').map(Number)
    const newHours = (hours + 1) % 24
    return `${String(newHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  }

  async function handleSaveItem() {
    if (!itemForm.title.trim()) {
      toast.error('Please enter a title')
      return
    }

    try {
      // If editing an actual task
      if (editingTask) {
        const { error } = await supabase
          .from('daily_tasks')
          .update({
            title: itemForm.title.trim(),
            description: itemForm.description.trim() || null,
            category: itemForm.category,
            scheduled_time: itemForm.start_time,
            star_value: itemForm.star_value
          })
          .eq('id', editingTask.id)

        if (error) throw error
        toast.success('Task updated!')
        setShowItemModal(false)
        loadData()
        return
      }

      // Creating/editing a schedule block (template)
      const itemData = {
        child_id: childProfile.id,
        family_id: user.familyId,
        title: itemForm.title.trim(),
        description: itemForm.description.trim() || null,
        category: itemForm.category,
        day_of_week: itemForm.day_of_week,
        start_time: itemForm.start_time,
        end_time: itemForm.end_time,
        star_value: itemForm.star_value,
        recurrence_type: itemForm.recurrence_type,
        is_recurring: itemForm.recurrence_type !== 'none',
        is_active: true
      }

      let scheduleBlockId = editingItem?.id

      if (editingItem) {
        const { error } = await supabase
          .from('schedule_blocks')
          .update(itemData)
          .eq('id', editingItem.id)

        if (error) throw error
        toast.success('Schedule template updated!')
      } else {
        const { data, error } = await supabase
          .from('schedule_blocks')
          .insert(itemData)
          .select('id')
          .single()

        if (error) throw error
        scheduleBlockId = data.id

        // Auto-generate task for the current week
        const weekDates = getWeekDates()
        const dayIndex = DAYS_OF_WEEK.indexOf(itemForm.day_of_week)

        if (dayIndex !== -1) {
          const taskDate = getLocalDateString(weekDates[dayIndex])

          // Check if task already exists for this date
          const { data: existing } = await supabase
            .from('daily_tasks')
            .select('id')
            .eq('child_id', childProfile.id)
            .eq('task_date', taskDate)
            .eq('title', itemForm.title.trim())
            .maybeSingle()

          if (!existing) {
            const { error: taskError } = await supabase
              .from('daily_tasks')
              .insert({
                child_id: childProfile.id,
                title: itemForm.title.trim(),
                description: itemForm.description.trim() || null,
                category: itemForm.category,
                scheduled_time: itemForm.start_time,
                star_value: itemForm.star_value,
                task_date: taskDate,
                status: 'pending',
                schedule_block_id: scheduleBlockId,
                is_bonus: false
              })

            if (taskError) throw taskError
          }
        }

        toast.success('Schedule item created & task added!')
      }

      setShowItemModal(false)
      loadData()
    } catch (error) {
      console.error('Error saving schedule item:', error)
      toast.error('Failed to save schedule item')
    }
  }

  async function handleDeleteItem(item) {
    if (!confirm('Are you sure you want to delete this schedule template?')) return

    try {
      const { error } = await supabase
        .from('schedule_blocks')
        .update({ is_active: false })
        .eq('id', item.id)

      if (error) throw error
      toast.success('Schedule template deleted')
      loadData()
    } catch (error) {
      console.error('Error deleting item:', error)
      toast.error('Failed to delete item')
    }
  }

  async function handleDeleteTask(task) {
    if (!confirm('Are you sure you want to delete this task?')) return

    try {
      const { error } = await supabase
        .from('daily_tasks')
        .delete()
        .eq('id', task.id)

      if (error) throw error
      toast.success('Task deleted')
      setShowItemModal(false)
      loadData()
    } catch (error) {
      console.error('Error deleting task:', error)
      toast.error('Failed to delete task')
    }
  }

  async function generateTasksForWeek() {
    if (!confirm('Generate daily tasks for this week based on the schedule? Existing tasks will not be duplicated.')) return

    try {
      const weekDates = getWeekDates()
      const tasksToCreate = []

      for (const item of scheduleItems) {
        const recurrenceType = item.recurrence_type || 'weekly'
        let datesToCreate = []

        if (recurrenceType === 'daily') {
          // Create task for every day of the week
          datesToCreate = weekDates.map(d => getLocalDateString(d))
        } else if (recurrenceType === 'weekly') {
          // Create task only for the specified day of the week
          const dayIndex = DAYS_OF_WEEK.indexOf(item.day_of_week)
          if (dayIndex !== -1) {
            datesToCreate = [getLocalDateString(weekDates[dayIndex])]
          }
        } else if (recurrenceType === 'monthly') {
          // For monthly, check if the day_of_week matches any day in this week
          // Create task on that day (essentially once per month on this day)
          const dayIndex = DAYS_OF_WEEK.indexOf(item.day_of_week)
          if (dayIndex !== -1) {
            const taskDate = weekDates[dayIndex]
            // Only create if it's roughly the same week of the month as when schedule was created
            // For simplicity, we'll create it once per week view (user controls when to generate)
            datesToCreate = [getLocalDateString(taskDate)]
          }
        } else if (recurrenceType === 'none') {
          // One-time task - only create if this is the first time
          const dayIndex = DAYS_OF_WEEK.indexOf(item.day_of_week)
          if (dayIndex !== -1) {
            datesToCreate = [getLocalDateString(weekDates[dayIndex])]
          }
        }

        // Check for each date and create if not exists
        for (const taskDate of datesToCreate) {
          const { data: existing } = await supabase
            .from('daily_tasks')
            .select('id')
            .eq('child_id', childProfile.id)
            .eq('task_date', taskDate)
            .eq('title', item.title)
            .maybeSingle()

          if (!existing) {
            tasksToCreate.push({
              child_id: childProfile.id,
              title: item.title,
              description: item.description,
              category: item.category,
              scheduled_time: item.start_time,
              star_value: item.star_value,
              task_date: taskDate,
              status: 'pending',
              schedule_block_id: item.id,
              is_bonus: false
            })
          }
        }
      }

      if (tasksToCreate.length > 0) {
        const { error } = await supabase
          .from('daily_tasks')
          .insert(tasksToCreate)

        if (error) throw error
        toast.success(`Created ${tasksToCreate.length} tasks for this week!`)
      } else {
        toast.success('All tasks for this week already exist!')
      }
    } catch (error) {
      console.error('Error generating tasks:', error)
      toast.error('Failed to generate tasks')
    }
  }

  // Get actual tasks for a specific day and time slot
  function getTasksForDayAndTime(dayIndex, time) {
    const weekDates = getWeekDates()
    const dateStr = getLocalDateString(weekDates[dayIndex])

    return weekTasks.filter(task => {
      if (task.task_date !== dateStr) return false
      if (!task.scheduled_time) return false
      const taskHour = parseInt(task.scheduled_time.split(':')[0])
      const slotHour = parseInt(time.split(':')[0])
      return taskHour === slotHour
    })
  }

  // Get schedule blocks for a specific day and time (for reference/templates)
  function getItemsForDayAndTime(day, time) {
    return scheduleItems.filter(item => {
      if (item.day_of_week !== day) return false
      const itemHour = parseInt(item.start_time.split(':')[0])
      const slotHour = parseInt(time.split(':')[0])
      return itemHour === slotHour
    })
  }

  // Copy day functionality
  async function handleCopyDay() {
    if (copyFromDay === copyToDay) {
      toast.error('Source and destination days must be different')
      return
    }

    const itemsToCopy = scheduleItems.filter(item => item.day_of_week === copyFromDay)

    if (itemsToCopy.length === 0) {
      toast.error(`No schedule items found for ${DAY_LABELS[DAYS_OF_WEEK.indexOf(copyFromDay)]}`)
      return
    }

    try {
      const newItems = itemsToCopy.map(item => ({
        child_id: childProfile.id,
        family_id: user.familyId,
        title: item.title,
        description: item.description,
        category: item.category,
        day_of_week: copyToDay,
        start_time: item.start_time,
        end_time: item.end_time,
        star_value: item.star_value,
        is_recurring: item.is_recurring,
        is_active: true
      }))

      const { error } = await supabase
        .from('schedule_blocks')
        .insert(newItems)

      if (error) throw error

      toast.success(`Copied ${itemsToCopy.length} items from ${DAY_LABELS[DAYS_OF_WEEK.indexOf(copyFromDay)]} to ${DAY_LABELS[DAYS_OF_WEEK.indexOf(copyToDay)]}`)
      setShowCopyDayModal(false)
      loadData()
    } catch (error) {
      console.error('Error copying day:', error)
      toast.error('Failed to copy schedule')
    }
  }

  // Conflict detection
  function checkForConflicts(newItem) {
    const conflicts = []
    const newStart = timeToMinutes(newItem.start_time)
    const newEnd = timeToMinutes(newItem.end_time)

    for (const item of scheduleItems) {
      if (item.day_of_week !== newItem.day_of_week) continue
      if (editingItem && item.id === editingItem.id) continue

      const itemStart = timeToMinutes(item.start_time)
      const itemEnd = timeToMinutes(item.end_time)

      // Check for overlap
      if (newStart < itemEnd && newEnd > itemStart) {
        conflicts.push(item)
      }
    }

    return conflicts
  }

  function timeToMinutes(time) {
    const [hours, minutes] = time.split(':').map(Number)
    return hours * 60 + minutes
  }

  function getConflictWarning() {
    if (!itemForm.start_time || !itemForm.end_time) return null
    const conflicts = checkForConflicts(itemForm)
    if (conflicts.length === 0) return null
    return conflicts
  }

  const getCategoryInfo = (category) => {
    return TASK_CATEGORIES.find(c => c.value === category) || TASK_CATEGORIES[5]
  }

  const weekDates = getWeekDates()
  const isCurrentWeek = weekDates[0].toDateString() === new Date(currentWeekStart).toDateString()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="spinner" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Weekly Schedule</h1>
            <p className="text-white/70">
              {childProfile?.display_name}'s recurring timetable
            </p>
          </div>
          {canEditSchedule && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={generateTasksForWeek}
                className="px-4 py-2 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors"
                title="Generate tasks for this week from schedule templates"
              >
                📋 Sync Week
              </button>
              <button
                onClick={() => setShowCopyDayModal(true)}
                className="px-4 py-2 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors"
              >
                📑 Copy Day
              </button>
              <button
                onClick={() => openCreateItem('monday', '15:00')}
                className="px-4 py-2 bg-gradient-to-r from-neon-blue to-neon-purple text-white rounded-xl hover:opacity-90 transition-opacity"
              >
                + New Schedule
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Week Navigation */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigateWeek(-1)}
            className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
          >
            ← Previous
          </button>
          <div className="text-center">
            <p className="text-white font-medium">
              {weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
            {!isCurrentWeek && (
              <button
                onClick={goToCurrentWeek}
                className="text-sm text-neon-blue hover:underline mt-1"
              >
                Back to current week
              </button>
            )}
          </div>
          <button
            onClick={() => navigateWeek(1)}
            className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
          >
            Next →
          </button>
        </div>
      </div>

      {/* Schedule Grid */}
      <div className="glass-card p-4 overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr>
              <th className="w-20 p-2 text-left text-white/60 text-sm">Time</th>
              {DAYS_OF_WEEK.map((day, index) => {
                const date = weekDates[index]
                const isToday = date.toDateString() === new Date().toDateString()
                return (
                  <th key={day} className={`p-2 text-center ${isToday ? 'text-neon-blue' : 'text-white/80'}`}>
                    <div className="font-medium">{DAY_LABELS[index]}</div>
                    <div className={`text-sm ${isToday ? 'text-neon-blue' : 'text-white/50'}`}>
                      {date.getDate()}
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {TIME_SLOTS.map(time => (
              <tr key={time} className="border-t border-white/10">
                <td className="p-2 text-white/50 text-sm">{formatTimeToAMPM(time)}</td>
                {DAYS_OF_WEEK.map((day, dayIndex) => {
                  const tasks = getTasksForDayAndTime(dayIndex, time)
                  return (
                    <td key={`${day}-${time}`} className="p-1 align-top min-h-[60px]">
                      <div className="min-h-[50px]">
                        {tasks.map(task => {
                          const category = getCategoryInfo(task.category)
                          const overdue = isTaskOverdue(task)
                          const statusColors = {
                            pending: overdue ? 'border-pink-500/50 bg-pink-500/20' : 'border-orange-500/50 bg-orange-500/20',
                            completed: 'border-green-500/50 bg-green-500/20',
                            approved: 'border-green-500/50 bg-green-500/20',
                            rejected: 'border-red-500/50 bg-red-500/20'
                          }
                          return (
                            <div
                              key={task.id}
                              onClick={() => canEditSchedule && openEditTask(task)}
                              className={`p-2 rounded-lg border text-xs mb-1 ${statusColors[task.status] || category.color} ${canEditSchedule ? 'cursor-pointer hover:opacity-80' : ''} transition-opacity`}
                            >
                              <div className="flex items-center gap-1">
                                <span>{category.icon}</span>
                                <span className={`font-medium truncate ${
                                  task.status === 'approved' ? 'text-green-400 line-through' :
                                  task.status === 'rejected' ? 'text-red-400 line-through' :
                                  'text-white'
                                }`}>{task.title}</span>
                              </div>
                              <div className="text-white/60 mt-1">
                                {formatTimeToAMPM(task.scheduled_time)}
                              </div>
                              <div className="flex items-center justify-between mt-1">
                                <span className="text-yellow-400">+{task.star_value}⭐</span>
                                {overdue && <span className="text-pink-400 text-[10px] font-medium">Overdue</span>}
                                {task.status === 'completed' && <span className="text-yellow-400 text-[10px]">Awaiting</span>}
                                {task.status === 'approved' && <span className="text-green-400 text-[10px]">Done</span>}
                              </div>
                            </div>
                          )
                        })}
                        {tasks.length === 0 && canEditSchedule && (
                          <button
                            onClick={() => openCreateItem(day, time)}
                            className="w-full h-full min-h-[50px] rounded-lg border border-dashed border-white/10 hover:border-white/30 hover:bg-white/5 transition-all flex items-center justify-center text-white/30 hover:text-white/50"
                          >
                            +
                          </button>
                        )}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="glass-card p-4">
        <p className="text-sm text-white/60 mb-3">Categories:</p>
        <div className="flex flex-wrap gap-3">
          {TASK_CATEGORIES.map(cat => (
            <div key={cat.value} className={`px-3 py-1 rounded-lg border ${cat.color} flex items-center gap-2`}>
              <span>{cat.icon}</span>
              <span className="text-sm text-white">{cat.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Schedule Item / Task Modal */}
      {showItemModal && (
        <div
          key={`modal-${modalKey}`}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
          onClick={(e) => e.target === e.currentTarget && setShowItemModal(false)}
        >
          <div className="glass-card p-6 max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-4">
              {editingTask ? 'Edit Task' : editingItem ? 'Edit Schedule Template' : 'New Schedule Template'}
            </h3>

            {/* Info badge for task vs template */}
            {editingTask && (
              <div className="mb-4 p-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="text-blue-400 text-xs">
                  Editing this task for {new Date(editingTask.task_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                </p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-white/70 mb-1">Title *</label>
                <input
                  type="text"
                  value={itemForm.title}
                  onChange={(e) => setItemForm({ ...itemForm, title: e.target.value })}
                  placeholder="e.g., Math Lesson"
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-neon-blue"
                />
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-1">Description</label>
                <textarea
                  value={itemForm.description}
                  onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                  placeholder="Optional details"
                  rows={2}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-neon-blue resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Day selector - only for schedule templates, not tasks */}
                {!editingTask && (
                  <div>
                    <label className="block text-sm text-white/70 mb-1">Day</label>
                    <select
                      value={itemForm.day_of_week}
                      onChange={(e) => setItemForm({ ...itemForm, day_of_week: e.target.value })}
                      className="select-dark"
                    >
                      {DAYS_OF_WEEK.map((day, i) => (
                        <option key={day} value={day}>{DAY_LABELS[i]}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className={editingTask ? 'col-span-2' : ''}>
                  <label className="block text-sm text-white/70 mb-1">Category</label>
                  <select
                    value={itemForm.category}
                    onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}
                    className="select-dark"
                  >
                    {TASK_CATEGORIES.map(cat => (
                      <option key={cat.value} value={cat.value}>
                        {cat.icon} {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-white/70 mb-1">{editingTask ? 'Time' : 'Start Time'}</label>
                  <input
                    type="time"
                    value={itemForm.start_time}
                    onChange={(e) => setItemForm({ ...itemForm, start_time: e.target.value })}
                    className="input-dark"
                  />
                </div>

                {!editingTask && (
                  <div>
                    <label className="block text-sm text-white/70 mb-1">End Time</label>
                    <input
                      type="time"
                      value={itemForm.end_time}
                      onChange={(e) => setItemForm({ ...itemForm, end_time: e.target.value })}
                      className="input-dark"
                    />
                  </div>
                )}

                <div className={editingTask ? '' : 'col-span-2'}>
                  <label className="block text-sm text-white/70 mb-1">Stars Reward</label>
                  <input
                    type="number"
                    value={itemForm.star_value}
                    onChange={(e) => setItemForm({ ...itemForm, star_value: parseInt(e.target.value) || 0 })}
                    min="0"
                    max="50"
                    className="input-dark"
                  />
                </div>
              </div>

              {/* Repeat options - only for new schedule templates */}
              {!editingTask && !editingItem && (
                <div>
                  <label className="block text-sm text-white/70 mb-1">Repeat</label>
                  <select
                    value={itemForm.recurrence_type}
                    onChange={(e) => setItemForm({ ...itemForm, recurrence_type: e.target.value })}
                    className="select-dark"
                  >
                    <option value="none">One-time</option>
                    <option value="daily">Every Day</option>
                    <option value="weekly">Every Week</option>
                    <option value="monthly">Every Month</option>
                  </select>
                </div>
              )}

              {/* Recurrence Info */}
              {!editingTask && itemForm.recurrence_type !== 'none' && (
                <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                  <p className="text-blue-400 text-sm">
                    {itemForm.recurrence_type === 'daily' && '📅 Creates a task every day when you sync the week'}
                    {itemForm.recurrence_type === 'weekly' && `📅 Creates a task every ${DAY_LABELS[DAYS_OF_WEEK.indexOf(itemForm.day_of_week)]} when you sync the week`}
                    {itemForm.recurrence_type === 'monthly' && `📅 Creates a task on ${DAY_LABELS[DAYS_OF_WEEK.indexOf(itemForm.day_of_week)]} once per month`}
                  </p>
                </div>
              )}

              {/* Conflict Warning - only for schedule templates */}
              {!editingTask && getConflictWarning() && (
                <div className="p-3 bg-yellow-500/20 border border-yellow-500/40 rounded-xl">
                  <p className="text-yellow-400 text-sm font-medium mb-1">Time Conflict</p>
                  <p className="text-yellow-400/80 text-xs">
                    Overlaps with: {getConflictWarning().map(c => c.title).join(', ')}
                  </p>
                </div>
              )}

              <div className="flex gap-3 justify-between mt-6">
                {/* Delete button */}
                {(editingItem || editingTask) && (
                  <button
                    onClick={() => {
                      if (editingTask) {
                        handleDeleteTask(editingTask)
                      } else if (editingItem) {
                        handleDeleteItem(editingItem)
                        setShowItemModal(false)
                      }
                    }}
                    className="px-4 py-2 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 transition-colors"
                  >
                    Delete
                  </button>
                )}
                <div className="flex gap-3 ml-auto">
                  <button
                    onClick={() => setShowItemModal(false)}
                    className="px-4 py-2 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveItem}
                    className="px-4 py-2 bg-gradient-to-r from-neon-blue to-neon-purple text-white rounded-xl hover:opacity-90 transition-opacity"
                  >
                    {editingTask ? 'Save Task' : editingItem ? 'Save Template' : 'Create'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Copy Day Modal */}
      {showCopyDayModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="glass-card p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-white mb-4">Copy Day Schedule</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-white/70 mb-1">Copy from</label>
                <select
                  value={copyFromDay}
                  onChange={(e) => setCopyFromDay(e.target.value)}
                  className="select-dark"
                >
                  {DAYS_OF_WEEK.map((day, i) => (
                    <option key={day} value={day}>
                      {DAY_LABELS[i]} ({scheduleItems.filter(item => item.day_of_week === day).length} items)
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-center text-white/40">↓</div>

              <div>
                <label className="block text-sm text-white/70 mb-1">Copy to</label>
                <select
                  value={copyToDay}
                  onChange={(e) => setCopyToDay(e.target.value)}
                  className="select-dark"
                >
                  {DAYS_OF_WEEK.map((day, i) => (
                    <option key={day} value={day}>
                      {DAY_LABELS[i]} ({scheduleItems.filter(item => item.day_of_week === day).length} items)
                    </option>
                  ))}
                </select>
              </div>

              {copyFromDay === copyToDay && (
                <p className="text-yellow-400 text-sm">Source and destination must be different</p>
              )}

              <div className="flex gap-3 justify-end mt-6">
                <button
                  onClick={() => setShowCopyDayModal(false)}
                  className="px-4 py-2 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCopyDay}
                  disabled={copyFromDay === copyToDay}
                  className="px-4 py-2 bg-gradient-to-r from-neon-blue to-neon-purple text-white rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Copy Schedule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
