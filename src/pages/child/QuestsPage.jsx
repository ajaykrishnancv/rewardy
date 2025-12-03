import { useState, useEffect, useRef } from 'react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import {
  generateDailyQuests,
  generateWeeklyQuests,
  updateStreak,
  checkAchievements,
  expireOldQuests
} from '../../services/gamificationService'
import { getTimeSettings, getLogicalDate, formatTime as formatTimeUtil, sortTasksChronologically, getChronologicalSortValue, timeToMinutes as timeToMinutesUtil } from '../../lib/timeSettings'
import { useChildNotifications } from '../../hooks/useNotifications'
import toast from 'react-hot-toast'

// Text-to-Speech helper with young girl voice
function speakText(text) {
  if ('speechSynthesis' in window) {
    // Cancel any ongoing speech
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.9 // Natural pace
    utterance.pitch = 1.5 // Higher pitch to sound like a young girl
    utterance.volume = 1

    // Try to find a female voice (will sound like a girl with high pitch)
    const voices = window.speechSynthesis.getVoices()

    // Priority order for voices that work well with high pitch
    const preferredVoice =
      voices.find(v => v.name.includes('Samantha')) || // iOS/macOS
      voices.find(v => v.name.includes('Google UK English Female')) ||
      voices.find(v => v.name.includes('Google US English Female')) ||
      voices.find(v => v.name.includes('Microsoft Zira')) || // Windows
      voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('female')) ||
      voices.find(v => v.lang.startsWith('en') && !v.name.toLowerCase().includes('male')) ||
      voices.find(v => v.lang.startsWith('en'))

    if (preferredVoice) {
      utterance.voice = preferredVoice
    }

    window.speechSynthesis.speak(utterance)
  } else {
    toast.error('Text-to-speech not supported in this browser')
  }
}

// TTS Button Component - Speaker icon button
function TTSButton({ text, className = '', size = 'normal' }) {
  const [isSpeaking, setIsSpeaking] = useState(false)

  const handleSpeak = (e) => {
    e.stopPropagation()
    if (isSpeaking) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
    } else {
      setIsSpeaking(true)
      speakText(text)
      // Reset speaking state when done
      const checkSpeaking = setInterval(() => {
        if (!window.speechSynthesis.speaking) {
          setIsSpeaking(false)
          clearInterval(checkSpeaking)
        }
      }, 100)
    }
  }

  // Small size for list items, normal size for main task
  const sizeClasses = size === 'small'
    ? 'px-3 py-1.5 text-base'
    : 'px-4 py-2 text-lg'

  return (
    <button
      onClick={handleSpeak}
      className={`${sizeClasses} rounded-xl transition-opacity hover:opacity-90 ${
        isSpeaking
          ? 'bg-gradient-to-r from-gray-500 to-gray-600'
          : 'bg-gradient-to-r from-red-500 to-orange-500'
      } ${className}`}
      title={isSpeaking ? 'Stop' : 'Listen'}
    >
      {isSpeaking ? '⏹️' : '🔊'}
    </button>
  )
}

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

// Convert time string to minutes for comparison
function timeToMinutes(timeStr) {
  if (!timeStr) return 0
  const [hours, minutes] = timeStr.split(':').map(Number)
  return hours * 60 + minutes
}

// Get current time in minutes
function getCurrentTimeInMinutes() {
  const now = new Date()
  return now.getHours() * 60 + now.getMinutes()
}

export default function QuestsPage() {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [todaysTasks, setTodaysTasks] = useState([])
  const [activeQuests, setActiveQuests] = useState([])
  const [streak, setStreak] = useState(null)
  const [showCelebration, setShowCelebration] = useState(false)
  const [celebrationData, setCelebrationData] = useState(null)
  const [currentTime, setCurrentTime] = useState(getCurrentTimeInMinutes())
  const [timeSettings, setTimeSettings] = useState(null)
  const initializedRef = useRef(false)

  // Enable notifications for this child
  useChildNotifications(
    user?.childProfile?.id,
    user?.familyId,
    todaysTasks
  )

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(getCurrentTimeInMinutes())
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (user?.childProfile?.id && !initializedRef.current) {
      initializedRef.current = true
      initializeAndLoad()
    }
  }, [user?.childProfile?.id])

  async function initializeAndLoad() {
    const childId = user.childProfile.id

    // Generate quests if needed (only on initial load)
    await expireOldQuests(childId)
    await generateDailyQuests(childId)
    await generateWeeklyQuests(childId)

    await loadData()
  }

  async function loadData() {
    try {
      setLoading(true)
      const childId = user.childProfile.id

      // Load family time settings
      const { data: family } = await supabase
        .from('families')
        .select('settings')
        .eq('id', user.familyId)
        .single()

      const settings = getTimeSettings(family?.settings || {})
      setTimeSettings(settings)

      // Use logical date based on time settings
      const today = getLogicalDate(new Date(), settings.dayStartTime)

      // Load tasks for today
      const { data: tasks } = await supabase
        .from('daily_tasks')
        .select('*')
        .eq('child_id', childId)
        .eq('task_date', today)

      // Sort tasks chronologically based on time settings
      const sortedTasks = sortTasksChronologically(tasks || [], settings.dayStartTime)
      setTodaysTasks(sortedTasks)

      // Load active quests/challenges
      const { data: quests } = await supabase
        .from('quests')
        .select('*')
        .eq('child_id', childId)
        .eq('is_completed', false)
        .lte('start_date', today)
        .gte('end_date', today)
        .order('end_date', { ascending: true })
      setActiveQuests(quests || [])

      // Load streak
      const { data: streakData } = await supabase
        .from('streaks')
        .select('*')
        .eq('child_id', childId)
        .eq('streak_type', 'daily')
        .single()
      setStreak(streakData)

    } catch (error) {
      console.error('Error loading quests:', error)
      toast.error('Failed to load quests')
    } finally {
      setLoading(false)
    }
  }

  async function handleCompleteTask(task) {
    try {
      const { error } = await supabase
        .from('daily_tasks')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', task.id)

      if (error) throw error

      // Update local state
      setTodaysTasks(prev =>
        prev.map(t =>
          t.id === task.id ? { ...t, status: 'completed', completed_at: new Date().toISOString() } : t
        )
      )

      const childId = user.childProfile.id

      // Update streak
      await updateStreak(childId)

      // Check for new achievements
      const newAchievements = await checkAchievements(childId)

      // Show celebration for achievements (quest progress updates on approval)
      if (newAchievements.length > 0) {
        setCelebrationData({
          quests: [],
          achievements: newAchievements
        })
        setShowCelebration(true)
      }

      // Refresh data
      await loadData()

      toast.success('Quest completed! Waiting for approval.')
    } catch (error) {
      console.error('Error completing task:', error)
      toast.error('Failed to complete quest')
    }
  }

  const getCategoryInfo = (category) => {
    return TASK_CATEGORIES.find(c => c.value === category) || TASK_CATEGORIES[5]
  }

  // Categorize tasks for timeline view
  const scheduledTasks = todaysTasks.filter(t => !t.is_bonus && t.scheduled_time)
  const bonusTasks = todaysTasks.filter(t => t.is_bonus)
  const unscheduledTasks = todaysTasks.filter(t => !t.is_bonus && !t.scheduled_time)

  // Get current time's chronological position based on day start time
  const dayStartTime = timeSettings?.dayStartTime || '04:00'
  const currentTimeStr = `${String(Math.floor(currentTime / 60)).padStart(2, '0')}:${String(currentTime % 60).padStart(2, '0')}`
  const currentChronoValue = getChronologicalSortValue(currentTimeStr, dayStartTime)

  // Find current task (pending task closest to or past current time in chronological order)
  const pendingScheduled = scheduledTasks.filter(t => t.status === 'pending')
  const currentTask = pendingScheduled.find(t => {
    const taskChronoValue = getChronologicalSortValue(t.scheduled_time, dayStartTime)
    // Current task is one that's within 30 minutes (in chronological time) or has passed
    return taskChronoValue <= currentChronoValue + 30
  }) || pendingScheduled[0]

  // Up next tasks (pending tasks after current)
  const upNextTasks = pendingScheduled.filter(t => t.id !== currentTask?.id).slice(0, 3)

  // Completed tasks (approved or completed)
  const completedTasks = todaysTasks.filter(t =>
    t.status === 'approved' || t.status === 'completed'
  )

  // Calculate stats
  const stats = {
    total: todaysTasks.filter(t => !t.is_bonus).length,
    completed: todaysTasks.filter(t => !t.is_bonus && (t.status === 'completed' || t.status === 'approved')).length,
    approved: todaysTasks.filter(t => t.status === 'approved').length,
    potentialStars: todaysTasks.reduce((sum, t) => sum + (t.star_value || 0), 0),
    earnedStars: todaysTasks.filter(t => t.status === 'approved').reduce((sum, t) => sum + (t.star_value || 0), 0)
  }

  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0

  // Format time for display
  function formatTime(timeStr) {
    if (!timeStr) return 'Anytime'
    const [hours, minutes] = timeStr.split(':').map(Number)
    const period = hours >= 12 ? 'PM' : 'AM'
    const displayHours = hours % 12 || 12
    return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`
  }

  // Get time remaining for current task (respects day start time)
  function getTimeStatus(timeStr) {
    if (!timeStr) return null
    const taskChronoValue = getChronologicalSortValue(timeStr, dayStartTime)
    const diff = taskChronoValue - currentChronoValue

    if (diff <= 0) {
      return { text: 'Due now!', urgent: true }
    } else if (diff <= 30) {
      return { text: `In ${diff} min`, urgent: true }
    } else if (diff <= 60) {
      return { text: `In ${diff} min`, urgent: false }
    }
    return null
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="spinner" />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-6">
      {/* Header with streak and progress */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white">My Timeline</h1>
            <p className="text-white/60 text-sm">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-3 py-2 bg-orange-500/20 border border-orange-500/30 rounded-xl flex items-center gap-2">
              <span className="text-xl">🔥</span>
              <span className="text-white font-bold">{streak?.current_streak || 0}</span>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="progress-bar h-3">
              <div
                className="progress-bar-fill"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>
          <span className="text-white font-bold text-sm">{completionRate}%</span>
        </div>
        <p className="text-white/50 text-xs mt-2">{stats.completed} of {stats.total} quests done</p>
      </div>

      {/* Current Quest - Large Card */}
      {currentTask && (
        <div className="relative">
          <div className="absolute -left-2 top-0 bottom-0 w-1 bg-gradient-to-b from-neon-blue to-neon-purple rounded-full" />
          <div className="glass-card p-6 ml-4 border-2 border-neon-blue/50 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-neon-blue/20 rounded-full blur-2xl" />

            <div className="flex items-center gap-2 mb-3">
              <span className="px-2 py-1 bg-neon-blue/20 text-neon-blue text-xs font-bold rounded-lg uppercase">
                Current Quest
              </span>
              {getTimeStatus(currentTask.scheduled_time) && (
                <span className={`px-2 py-1 text-xs font-bold rounded-lg ${
                  getTimeStatus(currentTask.scheduled_time).urgent
                    ? 'bg-red-500/20 text-red-400 animate-pulse'
                    : 'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {getTimeStatus(currentTask.scheduled_time).text}
                </span>
              )}
            </div>

            <div className="flex items-start gap-4">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl bg-white/10`}>
                {getCategoryInfo(currentTask.category).icon}
              </div>

              <div className="flex-1">
                <h2 className="text-xl font-bold text-white mb-1">{currentTask.title}</h2>
                {currentTask.description && (
                  <p className="text-white/60 text-sm mb-2">{currentTask.description}</p>
                )}
                <div className="flex items-center gap-3">
                  <span className="text-white/50 text-sm">
                    🕐 {formatTime(currentTask.scheduled_time)}
                  </span>
                  <span className="badge-star">+{currentTask.star_value} ⭐</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-4">
              <TTSButton
                text={`${currentTask.title}. ${currentTask.description || ''}`}
              />
              <button
                onClick={() => handleCompleteTask(currentTask)}
                className="flex-1 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold text-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-3"
              >
                <span>Mark as Done!</span>
                <span className="w-8 h-8 rounded-full bg-gradient-to-r from-pink-400 to-purple-500 flex items-center justify-center text-white text-lg font-bold shadow-md">✓</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* No Current Quest */}
      {!currentTask && stats.total > 0 && stats.completed < stats.total && (
        <div className="glass-card p-6 text-center">
          <div className="text-4xl mb-2">⏰</div>
          <p className="text-white font-medium">No quest right now</p>
          <p className="text-white/60 text-sm">Check your upcoming quests below</p>
        </div>
      )}

      {/* All done message */}
      {stats.total > 0 && stats.completed === stats.total && (
        <div className="glass-card p-6 text-center bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30">
          <div className="text-5xl mb-3">🏆</div>
          <h2 className="text-xl font-bold text-green-400">All Quests Complete!</h2>
          <p className="text-white/60">Amazing work today! You've earned {stats.potentialStars} ⭐</p>
        </div>
      )}

      {/* Up Next Section */}
      {upNextTasks.length > 0 && (
        <div>
          <h3 className="text-white/70 font-medium mb-3 ml-1 flex items-center gap-2">
            <span>📋</span> Up Next
          </h3>
          <div className="space-y-2">
            {upNextTasks.map(task => {
              const category = getCategoryInfo(task.category)
              return (
                <div
                  key={task.id}
                  className="glass-card p-4 flex items-center gap-4"
                >
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-xl">
                    {category.icon}
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium">{task.title}</p>
                    <p className="text-white/50 text-xs">{formatTime(task.scheduled_time)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <TTSButton
                      text={`${task.title}. ${task.description || ''}`}
                      size="small"
                    />
                    <span className="badge-star text-xs">+{task.star_value}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Unscheduled Tasks */}
      {unscheduledTasks.filter(t => t.status === 'pending').length > 0 && (
        <div>
          <h3 className="text-white/70 font-medium mb-3 ml-1 flex items-center gap-2">
            <span>📝</span> Anytime Today
          </h3>
          <div className="space-y-2">
            {unscheduledTasks.filter(t => t.status === 'pending').map(task => {
              const category = getCategoryInfo(task.category)
              return (
                <div
                  key={task.id}
                  className="glass-card p-4 flex items-center gap-4"
                >
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-xl">
                    {category.icon}
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium">{task.title}</p>
                    <span className="badge-star text-xs">+{task.star_value}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <TTSButton
                      text={`${task.title}. ${task.description || ''}`}
                      size="small"
                    />
                    <button
                      onClick={() => handleCompleteTask(task)}
                      className="px-4 py-2 bg-green-500/20 text-green-400 rounded-xl text-sm font-medium hover:bg-green-500/30 transition-colors flex items-center gap-2"
                    >
                      <span>Done!</span>
                      <span className="w-5 h-5 rounded-full bg-gradient-to-r from-pink-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">✓</span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Completed Today Section */}
      {completedTasks.length > 0 && (
        <div>
          <h3 className="text-white/70 font-medium mb-3 ml-1 flex items-center gap-2">
            <span>✅</span> Completed ({completedTasks.length})
          </h3>
          <div className="space-y-2">
            {completedTasks.map(task => {
              const category = getCategoryInfo(task.category)
              return (
                <div
                  key={task.id}
                  className={`glass-card p-4 flex items-center gap-4 ${
                    task.status === 'approved'
                      ? 'bg-green-500/10 border-green-500/20'
                      : 'bg-yellow-500/10 border-yellow-500/20'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${
                    task.status === 'approved' ? 'bg-green-500/20' : 'bg-yellow-500/20'
                  }`}>
                    {task.status === 'approved' ? '✓' : '⏳'}
                  </div>
                  <div className="flex-1">
                    <p className={`font-medium ${
                      task.status === 'approved' ? 'text-green-400 line-through' : 'text-yellow-400'
                    }`}>
                      {task.title}
                    </p>
                    {task.scheduled_time && (
                      <p className="text-white/40 text-xs">{formatTime(task.scheduled_time)}</p>
                    )}
                  </div>
                  {task.status === 'approved' ? (
                    <span className="text-green-400 text-xs font-medium">+{task.star_value} ⭐</span>
                  ) : (
                    <span className="text-yellow-400 text-xs">Awaiting...</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Bonus Quests Section */}
      {bonusTasks.length > 0 && (
        <div>
          <h3 className="text-white/70 font-medium mb-3 ml-1 flex items-center gap-2">
            <span>🎁</span> Bonus Quests
          </h3>
          <div className="space-y-2">
            {bonusTasks.map(task => {
              const category = getCategoryInfo(task.category)
              const isDone = task.status === 'approved' || task.status === 'completed'
              return (
                <div
                  key={task.id}
                  className={`glass-card p-4 border-2 border-dashed ${
                    isDone
                      ? 'border-purple-500/30 bg-purple-500/10'
                      : 'border-purple-500/30'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-xl">
                      {isDone ? (task.status === 'approved' ? '✓' : '⏳') : category.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className={`font-medium ${isDone ? 'text-purple-400' : 'text-white'}`}>
                          {task.title}
                        </p>
                        <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded">
                          BONUS
                        </span>
                      </div>
                      {task.description && (
                        <p className="text-white/50 text-xs">{task.description}</p>
                      )}
                    </div>
                    {task.status === 'pending' ? (
                      <button
                        onClick={() => handleCompleteTask(task)}
                        className="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-xl text-sm font-medium hover:bg-purple-500/30 transition-colors"
                      >
                        Done!
                      </button>
                    ) : task.status === 'approved' ? (
                      <span className="text-purple-400 text-xs">+{task.star_value} ⭐</span>
                    ) : (
                      <span className="text-yellow-400 text-xs">Awaiting...</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Active Challenges */}
      {activeQuests.length > 0 && (
        <div>
          <h3 className="text-white/70 font-medium mb-3 ml-1 flex items-center gap-2">
            <span>🏆</span> Active Challenges
          </h3>
          <div className="space-y-3">
            {activeQuests.map(quest => {
              const progress = quest.target_value > 0
                ? Math.min((quest.current_value / quest.target_value) * 100, 100)
                : 0

              return (
                <div key={quest.id} className="glass-card p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-white">{quest.title}</p>
                      <p className="text-xs text-white/50">{quest.description}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      quest.quest_type === 'daily' ? 'bg-blue-500/20 text-blue-400' :
                      quest.quest_type === 'weekly' ? 'bg-purple-500/20 text-purple-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {quest.quest_type}
                    </span>
                  </div>
                  <div className="progress-bar h-2 mb-2">
                    <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/50">
                      {quest.current_value} / {quest.target_value}
                    </span>
                    <div className="flex gap-2">
                      {quest.reward_stars > 0 && (
                        <span className="text-yellow-400">+{quest.reward_stars} ⭐</span>
                      )}
                      {quest.reward_gems > 0 && (
                        <span className="text-purple-400">+{quest.reward_gems} 💎</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {todaysTasks.length === 0 && (
        <div className="glass-card p-8 text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-xl font-bold text-white mb-2">No Quests Today!</h2>
          <p className="text-white/60">Enjoy your free time!</p>
        </div>
      )}

      {/* Celebration Modal */}
      {showCelebration && celebrationData && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="glass-card p-8 max-w-md mx-4 text-center relative overflow-hidden">
            {/* Confetti animation */}
            <div className="absolute inset-0 pointer-events-none">
              {['🎉', '✨', '🌟', '💫', '🎊', '⭐', '💎'].map((emoji, i) => (
                <span
                  key={i}
                  className="absolute text-2xl animate-bounce"
                  style={{
                    left: `${10 + i * 12}%`,
                    top: `${Math.random() * 30}%`,
                    animationDelay: `${i * 0.1}s`,
                    animationDuration: `${0.5 + Math.random() * 0.5}s`
                  }}
                >
                  {emoji}
                </span>
              ))}
            </div>

            <div className="relative">
              <div className="text-6xl mb-4 animate-bounce">🏆</div>
              <h2 className="text-2xl font-bold text-white mb-4">Congratulations!</h2>

              {celebrationData.quests?.length > 0 && (
                <div className="mb-4">
                  <p className="text-white/80 mb-2">Quest Completed!</p>
                  {celebrationData.quests.map(quest => (
                    <div key={quest.id} className="p-3 bg-white/10 rounded-xl mb-2">
                      <p className="font-semibold text-white">{quest.title}</p>
                      <div className="flex justify-center gap-2 mt-2">
                        {quest.reward_stars > 0 && (
                          <span className="badge-star">+{quest.reward_stars} ⭐</span>
                        )}
                        {quest.reward_gems > 0 && (
                          <span className="badge-gem">+{quest.reward_gems} 💎</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {celebrationData.achievements?.length > 0 && (
                <div className="mb-4">
                  <p className="text-white/80 mb-2">Achievement Unlocked!</p>
                  {celebrationData.achievements.map(achievement => (
                    <div key={achievement.id} className="p-3 bg-purple-500/20 rounded-xl mb-2">
                      <div className="text-3xl mb-1">{achievement.icon}</div>
                      <p className="font-semibold text-white">{achievement.name}</p>
                      <p className="text-sm text-white/60">{achievement.description}</p>
                      {achievement.reward_gems > 0 && (
                        <span className="badge-gem mt-2">+{achievement.reward_gems} 💎</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => {
                  setShowCelebration(false)
                  setCelebrationData(null)
                }}
                className="btn-primary px-8 py-3"
              >
                Awesome!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
