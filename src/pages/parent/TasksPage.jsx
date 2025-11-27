import { useState, useEffect } from 'react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import {
  updateQuestProgress,
  checkAchievements,
  updateSkillProgress
} from '../../services/gamificationService'
import toast from 'react-hot-toast'

const TASK_CATEGORIES = [
  { value: 'academic', label: 'Academic', icon: '📚' },
  { value: 'chores', label: 'Chores', icon: '🧹' },
  { value: 'health', label: 'Health', icon: '💪' },
  { value: 'creative', label: 'Creative', icon: '🎨' },
  { value: 'social', label: 'Social', icon: '👥' },
  { value: 'other', label: 'Other', icon: '📋' }
]

// Helper to get local date string (YYYY-MM-DD) without timezone issues
function getLocalDateString(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function TasksPage() {
  const { user, hasPermission } = useAuthStore()
  const canEditSchedule = hasPermission('editSchedule')
  const canApproveTasks = hasPermission('approveTasks')

  const [loading, setLoading] = useState(true)
  const [childProfile, setChildProfile] = useState(null)
  const [tasks, setTasks] = useState([])
  const [selectedDate, setSelectedDate] = useState(getLocalDateString())
  const [filterStatus, setFilterStatus] = useState('all')
  const [selectedTasks, setSelectedTasks] = useState([])

  // Modal states
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [editingTask, setEditingTask] = useState(null)

  // Task form
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    category: 'academic',
    scheduled_time: '',
    star_value: 5,
    is_bonus: false,
    recurrence_type: 'none', // none, daily, weekly, monthly
    recurrence_count: 4 // number of occurrences to create
  })

  useEffect(() => {
    if (user?.familyId) {
      loadData()
    }
  }, [user?.familyId, selectedDate])

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
        // Load tasks for selected date
        const { data: tasksData } = await supabase
          .from('daily_tasks')
          .select('*')
          .eq('child_id', child.id)
          .eq('task_date', selectedDate)
          .order('created_at', { ascending: true })

        setTasks(tasksData || [])
      }
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }

  function openCreateTask() {
    setEditingTask(null)
    setTaskForm({
      title: '',
      description: '',
      category: 'academic',
      scheduled_time: '',
      star_value: 5,
      is_bonus: false,
      recurrence_type: 'none',
      recurrence_count: 4
    })
    setShowTaskModal(true)
  }

  function openEditTask(task) {
    setEditingTask(task)
    setTaskForm({
      title: task.title,
      description: task.description || '',
      category: task.category || 'other',
      scheduled_time: task.scheduled_time || '',
      star_value: task.star_value || 5,
      is_bonus: task.is_bonus || false,
      recurrence_type: 'none', // Don't show recurrence when editing
      recurrence_count: 4
    })
    setShowTaskModal(true)
  }

  // Helper to calculate next date based on recurrence type
  function getNextDate(baseDate, recurrenceType, offset) {
    const date = new Date(baseDate + 'T12:00:00')
    switch (recurrenceType) {
      case 'daily':
        date.setDate(date.getDate() + offset)
        break
      case 'weekly':
        date.setDate(date.getDate() + (offset * 7))
        break
      case 'monthly':
        date.setMonth(date.getMonth() + offset)
        break
      default:
        break
    }
    return getLocalDateString(date)
  }

  async function handleSaveTask() {
    if (!taskForm.title.trim()) {
      toast.error('Please enter a task title')
      return
    }

    try {
      const baseTaskData = {
        child_id: childProfile.id,
        title: taskForm.title.trim(),
        description: taskForm.description.trim() || null,
        category: taskForm.category,
        scheduled_time: taskForm.scheduled_time || null,
        star_value: taskForm.star_value,
        is_bonus: taskForm.is_bonus,
        status: 'pending'
      }

      if (editingTask) {
        // When editing, just update the single task
        const { error } = await supabase
          .from('daily_tasks')
          .update({ ...baseTaskData, task_date: selectedDate })
          .eq('id', editingTask.id)

        if (error) throw error
        toast.success('Task updated!')
      } else {
        // Creating new task(s)
        if (taskForm.recurrence_type === 'none') {
          // Single task
          const { error } = await supabase
            .from('daily_tasks')
            .insert({ ...baseTaskData, task_date: selectedDate })

          if (error) throw error
          toast.success('Task created!')
        } else {
          // Recurring tasks - create multiple
          const tasksToCreate = []
          const count = Math.min(taskForm.recurrence_count, 52) // Max 52 occurrences

          for (let i = 0; i < count; i++) {
            const taskDate = getNextDate(selectedDate, taskForm.recurrence_type, i)
            tasksToCreate.push({
              ...baseTaskData,
              task_date: taskDate
            })
          }

          const { error } = await supabase
            .from('daily_tasks')
            .insert(tasksToCreate)

          if (error) throw error
          toast.success(`Created ${tasksToCreate.length} recurring tasks!`)
        }
      }

      setShowTaskModal(false)
      loadData()
    } catch (error) {
      console.error('Error saving task:', error)
      toast.error('Failed to save task')
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
      loadData()
    } catch (error) {
      console.error('Error deleting task:', error)
      toast.error('Failed to delete task')
    }
  }

  async function handleApproveTask(task) {
    try {
      const starValue = task.star_value || 0

      // Get current balance
      const { data: balance } = await supabase
        .from('currency_balances')
        .select('*')
        .eq('child_id', childProfile.id)
        .single()

      // Update task status
      const { error: taskError } = await supabase
        .from('daily_tasks')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user.id
        })
        .eq('id', task.id)

      if (taskError) throw taskError

      // Award stars
      if (starValue > 0 && balance) {
        const { error: balanceError } = await supabase
          .from('currency_balances')
          .update({
            wallet_stars: balance.wallet_stars + starValue,
            lifetime_stars_earned: balance.lifetime_stars_earned + starValue,
            updated_at: new Date().toISOString()
          })
          .eq('child_id', childProfile.id)

        if (balanceError) throw balanceError

        // Log transaction
        await supabase.from('transactions').insert({
          child_id: childProfile.id,
          transaction_type: 'earn',
          currency_type: 'stars',
          amount: starValue,
          description: `Task approved: ${task.title}`,
          reference_type: 'task',
          reference_id: task.id
        })
      }

      // Update quest progress (stars earned)
      await updateQuestProgress(childProfile.id, 'task_approved', {
        starsEarned: starValue
      })

      // Update skill progress for the category
      if (task.category) {
        await updateSkillProgress(childProfile.id, task.category, starValue || 1)
      }

      // Check for new achievements
      await checkAchievements(childProfile.id)

      // Check for daily completion quests
      await updateQuestProgress(childProfile.id, 'daily_check', {})

      toast.success(`Task approved! +${starValue} stars`)
      loadData()
    } catch (error) {
      console.error('Error approving task:', error)
      toast.error('Failed to approve task')
    }
  }

  async function handleRejectTask(task) {
    const reason = prompt('Reason for rejection (optional):')

    try {
      const { error } = await supabase
        .from('daily_tasks')
        .update({
          status: 'rejected',
          rejection_reason: reason || null
        })
        .eq('id', task.id)

      if (error) throw error
      toast.success('Task rejected')
      loadData()
    } catch (error) {
      console.error('Error rejecting task:', error)
      toast.error('Failed to reject task')
    }
  }

  async function handleResetTask(task) {
    try {
      const { error } = await supabase
        .from('daily_tasks')
        .update({
          status: 'pending',
          completed_at: null,
          approved_at: null,
          approved_by: null,
          rejection_reason: null
        })
        .eq('id', task.id)

      if (error) throw error
      toast.success('Task reset to pending')
      loadData()
    } catch (error) {
      console.error('Error resetting task:', error)
      toast.error('Failed to reset task')
    }
  }

  // Bulk approve handler
  async function handleBulkApprove() {
    const tasksToApprove = tasks.filter(t =>
      selectedTasks.includes(t.id) && t.status === 'completed'
    )

    if (tasksToApprove.length === 0) {
      toast.error('No completed tasks selected')
      return
    }

    try {
      // Get current balance
      const { data: balance } = await supabase
        .from('currency_balances')
        .select('*')
        .eq('child_id', childProfile.id)
        .single()

      let totalStars = 0

      // Approve each task
      for (const task of tasksToApprove) {
        const starValue = task.star_value || 0

        const { error: taskError } = await supabase
          .from('daily_tasks')
          .update({
            status: 'approved',
            approved_at: new Date().toISOString(),
            approved_by: user.id
          })
          .eq('id', task.id)

        if (taskError) throw taskError
        totalStars += starValue

        // Log transaction for each task
        if (starValue > 0) {
          await supabase.from('transactions').insert({
            child_id: childProfile.id,
            transaction_type: 'earn',
            currency_type: 'stars',
            amount: starValue,
            description: `Task approved: ${task.title}`,
            reference_type: 'task',
            reference_id: task.id
          })
        }
      }

      // Award stars in bulk
      if (totalStars > 0 && balance) {
        const { error: balanceError } = await supabase
          .from('currency_balances')
          .update({
            wallet_stars: balance.wallet_stars + totalStars,
            lifetime_stars_earned: balance.lifetime_stars_earned + totalStars,
            updated_at: new Date().toISOString()
          })
          .eq('child_id', childProfile.id)

        if (balanceError) throw balanceError
      }

      // Update quest progress for all approved tasks
      await updateQuestProgress(childProfile.id, 'task_approved', {
        starsEarned: totalStars
      })

      // Update skill progress for each category
      const categoryPoints = {}
      for (const task of tasksToApprove) {
        if (task.category) {
          categoryPoints[task.category] = (categoryPoints[task.category] || 0) + (task.star_value || 1)
        }
      }
      for (const [category, points] of Object.entries(categoryPoints)) {
        await updateSkillProgress(childProfile.id, category, points)
      }

      // Check for new achievements
      await checkAchievements(childProfile.id)

      // Check for daily completion quests
      await updateQuestProgress(childProfile.id, 'daily_check', {})

      setSelectedTasks([])
      toast.success(`${tasksToApprove.length} tasks approved! +${totalStars} stars`)
      loadData()
    } catch (error) {
      console.error('Error bulk approving tasks:', error)
      toast.error('Failed to approve tasks')
    }
  }

  function toggleTaskSelection(taskId) {
    setSelectedTasks(prev =>
      prev.includes(taskId)
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    )
  }

  function toggleSelectAllCompleted() {
    const completedTaskIds = tasks
      .filter(t => t.status === 'completed')
      .map(t => t.id)

    const allSelected = completedTaskIds.every(id => selectedTasks.includes(id))

    if (allSelected) {
      setSelectedTasks(prev => prev.filter(id => !completedTaskIds.includes(id)))
    } else {
      setSelectedTasks(prev => [...new Set([...prev, ...completedTaskIds])])
    }
  }

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    if (filterStatus === 'all') return true
    return task.status === filterStatus
  })

  // Calculate stats
  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    approved: tasks.filter(t => t.status === 'approved').length,
    rejected: tasks.filter(t => t.status === 'rejected').length
  }

  const getCategoryInfo = (category) => {
    return TASK_CATEGORIES.find(c => c.value === category) || TASK_CATEGORIES[5]
  }

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
            <h1 className="text-2xl font-bold text-white mb-1">Task Management</h1>
            <p className="text-white/70">
              {childProfile?.display_name}'s daily tasks
            </p>
          </div>
          {canEditSchedule && (
            <button
              onClick={openCreateTask}
              className="px-4 py-2 bg-gradient-to-r from-neon-blue to-neon-purple text-white rounded-xl hover:opacity-90 transition-opacity"
            >
              + Add Task
            </button>
          )}
        </div>
      </div>

      {/* Date & Filter Controls */}
      <div className="glass-card p-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          {/* Date Picker */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const d = new Date(selectedDate + 'T12:00:00')
                d.setDate(d.getDate() - 1)
                setSelectedDate(getLocalDateString(d))
              }}
              className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
            >
              ←
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-neon-blue"
            />
            <button
              onClick={() => {
                const d = new Date(selectedDate + 'T12:00:00')
                d.setDate(d.getDate() + 1)
                setSelectedDate(getLocalDateString(d))
              }}
              className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
            >
              →
            </button>
            <button
              onClick={() => setSelectedDate(getLocalDateString())}
              className="px-3 py-2 text-sm bg-white/10 rounded-lg hover:bg-white/20 transition-colors text-white/70"
            >
              Today
            </button>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2 md:ml-auto">
            <span className="text-white/60 text-sm">Filter:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="select-dark"
            >
              <option value="all">All ({stats.total})</option>
              <option value="pending">Pending ({stats.pending})</option>
              <option value="completed">Completed ({stats.completed})</option>
              <option value="approved">Approved ({stats.approved})</option>
              <option value="rejected">Rejected ({stats.rejected})</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-white">{stats.total}</p>
          <p className="text-xs text-white/60">Total Tasks</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-yellow-400">{stats.pending}</p>
          <p className="text-xs text-white/60">Pending</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-blue-400">{stats.completed}</p>
          <p className="text-xs text-white/60">Awaiting Approval</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-green-400">{stats.approved}</p>
          <p className="text-xs text-white/60">Approved</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-red-400">{stats.rejected}</p>
          <p className="text-xs text-white/60">Rejected</p>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {canApproveTasks && stats.completed > 0 && (
        <div className="glass-card p-4 bg-yellow-500/10 border-yellow-500/30">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={tasks.filter(t => t.status === 'completed').every(t => selectedTasks.includes(t.id)) && stats.completed > 0}
                  onChange={toggleSelectAllCompleted}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm text-white/80">Select all awaiting approval ({stats.completed})</span>
              </label>
            </div>
            <div className="flex items-center gap-3">
              {selectedTasks.length > 0 && (
                <>
                  <span className="text-sm text-white/60">
                    {selectedTasks.filter(id => tasks.find(t => t.id === id)?.status === 'completed').length} selected
                  </span>
                  <button
                    onClick={handleBulkApprove}
                    className="px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors font-medium flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Approve Selected
                  </button>
                  <button
                    onClick={() => setSelectedTasks([])}
                    className="px-3 py-2 bg-white/10 text-white/70 rounded-xl hover:bg-white/20 transition-colors text-sm"
                  >
                    Clear
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tasks List */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          Tasks for {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </h2>

        {filteredTasks.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">📋</div>
            <p className="text-white/70 font-medium mb-2">No tasks for this day</p>
            {canEditSchedule && (
              <button
                onClick={openCreateTask}
                className="mt-4 px-4 py-2 bg-gradient-to-r from-neon-blue to-neon-purple text-white rounded-xl hover:opacity-90 transition-opacity"
              >
                + Create First Task
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTasks.map(task => {
              const category = getCategoryInfo(task.category)
              return (
                <div
                  key={task.id}
                  className={`p-4 rounded-xl border transition-all ${
                    task.status === 'approved'
                      ? 'bg-green-500/10 border-green-500/30'
                      : task.status === 'completed'
                      ? 'bg-yellow-500/10 border-yellow-500/30'
                      : task.status === 'rejected'
                      ? 'bg-red-500/10 border-red-500/30'
                      : 'bg-white/5 border-white/10'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Checkbox for bulk selection */}
                    {canApproveTasks && task.status === 'completed' && (
                      <label className="flex items-center cursor-pointer self-center">
                        <input
                          type="checkbox"
                          checked={selectedTasks.includes(task.id)}
                          onChange={() => toggleTaskSelection(task.id)}
                          className="w-5 h-5 rounded"
                        />
                      </label>
                    )}

                    {/* Category Icon */}
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${
                      task.status === 'approved' ? 'bg-green-500/20' :
                      task.status === 'completed' ? 'bg-yellow-500/20' :
                      task.status === 'rejected' ? 'bg-red-500/20' :
                      'bg-white/10'
                    }`}>
                      {task.status === 'approved' ? '✓' :
                       task.status === 'rejected' ? '✗' :
                       category.icon}
                    </div>

                    {/* Task Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className={`font-medium ${
                            task.status === 'approved' ? 'text-green-400 line-through' :
                            task.status === 'rejected' ? 'text-red-400 line-through' :
                            'text-white'
                          }`}>
                            {task.title}
                          </p>
                          {task.description && (
                            <p className="text-sm text-white/60 mt-1">{task.description}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        {task.scheduled_time && (
                          <span className="text-xs text-white/50 bg-white/10 px-2 py-1 rounded">
                            🕐 {task.scheduled_time}
                          </span>
                        )}
                        <span className="text-xs text-white/50 bg-white/10 px-2 py-1 rounded">
                          {category.label}
                        </span>
                        <span className="badge-star text-xs">+{task.star_value}</span>
                        {task.is_bonus && (
                          <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded">
                            Bonus
                          </span>
                        )}
                        {task.rejection_reason && (
                          <span className="text-xs text-red-400" title={task.rejection_reason}>
                            Reason: {task.rejection_reason}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {/* Approval Actions */}
                      {task.status === 'completed' && canApproveTasks && (
                        <>
                          <button
                            onClick={() => handleApproveTask(task)}
                            className="p-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
                            title="Approve"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleRejectTask(task)}
                            className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                            title="Reject"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </>
                      )}

                      {/* Status badges for non-editable states */}
                      {task.status === 'completed' && !canApproveTasks && (
                        <span className="text-xs text-yellow-400 bg-yellow-400/10 px-3 py-1 rounded-lg">
                          Awaiting
                        </span>
                      )}
                      {task.status === 'approved' && (
                        <span className="text-xs text-green-400 bg-green-400/10 px-3 py-1 rounded-lg">
                          Approved
                        </span>
                      )}
                      {task.status === 'rejected' && (
                        <span className="text-xs text-red-400 bg-red-400/10 px-3 py-1 rounded-lg">
                          Rejected
                        </span>
                      )}
                      {task.status === 'pending' && (
                        <span className="text-xs text-white/50 bg-white/10 px-3 py-1 rounded-lg">
                          Pending
                        </span>
                      )}

                      {/* Edit/Delete Actions */}
                      {canEditSchedule && task.status === 'pending' && (
                        <>
                          <button
                            onClick={() => openEditTask(task)}
                            className="p-2 bg-white/10 text-white/70 rounded-lg hover:bg-white/20 transition-colors"
                            title="Edit"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeleteTask(task)}
                            className="p-2 bg-white/10 text-white/70 rounded-lg hover:bg-red-500/20 hover:text-red-400 transition-colors"
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </>
                      )}

                      {/* Reset Action */}
                      {canEditSchedule && (task.status === 'approved' || task.status === 'rejected') && (
                        <button
                          onClick={() => handleResetTask(task)}
                          className="p-2 bg-white/10 text-white/70 rounded-lg hover:bg-white/20 transition-colors"
                          title="Reset to Pending"
                        >
                          🔄
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-white mb-4">
              {editingTask ? 'Edit Task' : 'Create Task'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-white/70 mb-1">Title *</label>
                <input
                  type="text"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  placeholder="e.g., Complete math worksheet"
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-neon-blue"
                />
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-1">Description</label>
                <textarea
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  placeholder="Optional details about the task"
                  rows={2}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-neon-blue resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-white/70 mb-1">Category</label>
                  <select
                    value={taskForm.category}
                    onChange={(e) => setTaskForm({ ...taskForm, category: e.target.value })}
                    className="select-dark"
                  >
                    {TASK_CATEGORIES.map(cat => (
                      <option key={cat.value} value={cat.value}>
                        {cat.icon} {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-white/70 mb-1">Scheduled Time</label>
                  <input
                    type="time"
                    value={taskForm.scheduled_time}
                    onChange={(e) => setTaskForm({ ...taskForm, scheduled_time: e.target.value })}
                    className="input-dark"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-1">Stars Reward</label>
                <input
                  type="number"
                  value={taskForm.star_value}
                  onChange={(e) => setTaskForm({ ...taskForm, star_value: parseInt(e.target.value) || 0 })}
                  min="0"
                  max="50"
                  className="input-dark"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={taskForm.is_bonus}
                  onChange={(e) => setTaskForm({ ...taskForm, is_bonus: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm text-white/70">This is a bonus task (optional extra credit)</span>
              </label>

              {/* Recurring Options - Only show when creating new tasks */}
              {!editingTask && (
                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <label className="block text-sm text-white/70 mb-2">Repeat Task</label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <select
                        value={taskForm.recurrence_type}
                        onChange={(e) => setTaskForm({ ...taskForm, recurrence_type: e.target.value })}
                        className="select-dark"
                      >
                        <option value="none">No Repeat</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                    {taskForm.recurrence_type !== 'none' && (
                      <div>
                        <select
                          value={taskForm.recurrence_count}
                          onChange={(e) => setTaskForm({ ...taskForm, recurrence_count: parseInt(e.target.value) })}
                          className="select-dark"
                        >
                          <option value="2">2 times</option>
                          <option value="4">4 times</option>
                          <option value="7">7 times</option>
                          <option value="14">14 times</option>
                          <option value="30">30 times</option>
                          <option value="52">52 times</option>
                        </select>
                      </div>
                    )}
                  </div>
                  {taskForm.recurrence_type !== 'none' && (
                    <p className="text-xs text-white/50 mt-2">
                      Will create {taskForm.recurrence_count} tasks starting from {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })},
                      repeating {taskForm.recurrence_type === 'daily' ? 'every day' : taskForm.recurrence_type === 'weekly' ? 'every week' : 'every month'}
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-3 justify-end mt-6">
                <button
                  onClick={() => setShowTaskModal(false)}
                  className="px-4 py-2 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveTask}
                  className="px-4 py-2 bg-gradient-to-r from-neon-blue to-neon-purple text-white rounded-xl hover:opacity-90 transition-opacity"
                >
                  {editingTask ? 'Save Changes' : 'Create Task'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
