import { useState, useEffect } from 'react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import {
  generateDailyQuests,
  generateWeeklyQuests,
  updateQuestProgress,
  updateStreak,
  checkAchievements,
  expireOldQuests
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

export default function QuestsPage() {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [todaysTasks, setTodaysTasks] = useState([])
  const [activeQuests, setActiveQuests] = useState([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [streak, setStreak] = useState(null)
  const [showCelebration, setShowCelebration] = useState(false)
  const [celebrationData, setCelebrationData] = useState(null)

  useEffect(() => {
    if (user?.childProfile?.id) {
      initializeAndLoad()
    }
  }, [user?.childProfile?.id])

  useEffect(() => {
    if (user?.childProfile?.id) {
      loadData()
    }
  }, [selectedDate])

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

      // Load tasks for selected date
      const { data: tasks } = await supabase
        .from('daily_tasks')
        .select('*')
        .eq('child_id', childId)
        .eq('task_date', selectedDate)
        .order('scheduled_time', { ascending: true, nullsFirst: false })
      setTodaysTasks(tasks || [])

      // Load active quests/challenges
      const today = new Date().toISOString().split('T')[0]
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

      // Update quest progress
      const hour = new Date().getHours()
      const completedQuests = await updateQuestProgress(childId, 'task_completed', {
        completedBeforeNoon: hour < 12
      })

      // Check for new achievements
      const newAchievements = await checkAchievements(childId)

      // Show celebration for completed quests or achievements
      if (completedQuests.length > 0 || newAchievements.length > 0) {
        setCelebrationData({
          quests: completedQuests,
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

  // Calculate stats
  const stats = {
    total: todaysTasks.length,
    pending: todaysTasks.filter(t => t.status === 'pending').length,
    completed: todaysTasks.filter(t => t.status === 'completed' || t.status === 'approved').length,
    approved: todaysTasks.filter(t => t.status === 'approved').length,
    potentialStars: todaysTasks.reduce((sum, t) => sum + (t.stars_reward || 0), 0),
    earnedStars: todaysTasks.filter(t => t.status === 'approved').reduce((sum, t) => sum + (t.stars_reward || 0), 0)
  }

  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0
  const isToday = selectedDate === new Date().toISOString().split('T')[0]

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
            <h1 className="text-2xl font-bold text-white mb-1">My Quests</h1>
            <p className="text-white/70">Complete tasks to earn stars!</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="streak-fire px-4 py-2 bg-orange-500/20 border border-orange-500/30 rounded-xl flex items-center gap-2">
              <span className="text-xl">🔥</span>
              <span className="text-white font-bold">{streak?.current_streak || 0} day streak</span>
            </div>
          </div>
        </div>
      </div>

      {/* Date Navigation */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              const d = new Date(selectedDate)
              d.setDate(d.getDate() - 1)
              setSelectedDate(d.toISOString().split('T')[0])
            }}
            className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
          >
            ← Prev
          </button>
          <div className="text-center">
            <p className="text-white font-medium">
              {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
            {!isToday && (
              <button
                onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                className="text-sm text-neon-blue hover:underline"
              >
                Back to Today
              </button>
            )}
          </div>
          <button
            onClick={() => {
              const d = new Date(selectedDate)
              d.setDate(d.getDate() + 1)
              setSelectedDate(d.toISOString().split('T')[0])
            }}
            className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
          >
            Next →
          </button>
        </div>
      </div>

      {/* Progress */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Daily Progress</h2>
          <div className="flex items-center gap-4">
            <span className="text-neon-blue font-bold text-lg">{completionRate}%</span>
            <div className="badge-star">+{stats.earnedStars}/{stats.potentialStars} ⭐</div>
          </div>
        </div>
        <div className="progress-bar h-4 mb-2">
          <div
            className="progress-bar-fill"
            style={{ width: `${completionRate}%` }}
          />
        </div>
        <div className="flex justify-between text-sm text-white/60">
          <span>{stats.completed} of {stats.total} quests done</span>
          <span>{stats.pending} remaining</span>
        </div>
      </div>

      {/* Today's Tasks */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          {isToday ? "Today's Quests" : 'Quests'}
        </h2>

        {todaysTasks.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4 animate-float">🎉</div>
            <p className="text-white/70 font-medium text-lg mb-2">
              {isToday ? 'No quests for today!' : 'No quests for this day'}
            </p>
            <p className="text-sm text-white/50">
              {isToday ? 'Enjoy your free time!' : 'Check another day'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {todaysTasks.map(task => {
              const category = getCategoryInfo(task.category)
              return (
                <div
                  key={task.id}
                  className={`quest-card p-4 rounded-xl border transition-all ${
                    task.status === 'approved'
                      ? 'bg-green-500/10 border-green-500/30'
                      : task.status === 'completed'
                      ? 'bg-yellow-500/10 border-yellow-500/30'
                      : task.status === 'rejected'
                      ? 'bg-red-500/10 border-red-500/30'
                      : 'bg-white/5 border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {/* Status icon */}
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl ${
                      task.status === 'approved' ? 'bg-green-500/20' :
                      task.status === 'completed' ? 'bg-yellow-500/20' :
                      task.status === 'rejected' ? 'bg-red-500/20' :
                      'bg-white/10'
                    }`}>
                      {task.status === 'approved' ? '✓' :
                       task.status === 'completed' ? '⏳' :
                       task.status === 'rejected' ? '✗' :
                       category.icon}
                    </div>

                    {/* Task info */}
                    <div className="flex-1">
                      <p className={`font-medium text-lg ${
                        task.status === 'approved' ? 'text-green-400 line-through' :
                        task.status === 'rejected' ? 'text-red-400 line-through' :
                        'text-white'
                      }`}>
                        {task.title}
                      </p>
                      {task.description && (
                        <p className="text-sm text-white/60">{task.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        {task.scheduled_time && (
                          <span className="text-xs text-white/50 bg-white/10 px-2 py-1 rounded">
                            🕐 {task.scheduled_time}
                          </span>
                        )}
                        <span className="badge-star text-sm">+{task.stars_reward} ⭐</span>
                        {task.is_bonus && (
                          <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded">
                            Bonus
                          </span>
                        )}
                      </div>
                      {task.rejection_reason && (
                        <p className="text-sm text-red-400 mt-2">
                          Reason: {task.rejection_reason}
                        </p>
                      )}
                    </div>

                    {/* Action button */}
                    <div>
                      {task.status === 'pending' && isToday && (
                        <button
                          onClick={() => handleCompleteTask(task)}
                          className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold hover:opacity-90 transition-opacity"
                        >
                          Done!
                        </button>
                      )}
                      {task.status === 'completed' && (
                        <span className="px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-xl text-sm font-medium">
                          Waiting...
                        </span>
                      )}
                      {task.status === 'approved' && (
                        <span className="px-4 py-2 bg-green-500/20 text-green-400 rounded-xl text-sm font-medium">
                          Approved! ✓
                        </span>
                      )}
                      {task.status === 'rejected' && (
                        <span className="px-4 py-2 bg-red-500/20 text-red-400 rounded-xl text-sm font-medium">
                          Try Again
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Active Challenges */}
      {activeQuests.length > 0 && (
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span>🏆</span>
            Active Challenges
          </h2>
          <div className="space-y-4">
            {activeQuests.map(quest => {
              const progress = quest.target_value > 0
                ? Math.min((quest.current_value / quest.target_value) * 100, 100)
                : 0

              return (
                <div key={quest.id} className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-medium text-white text-lg">{quest.title}</p>
                      <p className="text-sm text-white/60">{quest.description}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      quest.quest_type === 'daily' ? 'bg-blue-500/20 text-blue-400' :
                      quest.quest_type === 'weekly' ? 'bg-purple-500/20 text-purple-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {quest.quest_type}
                    </span>
                  </div>
                  <div className="progress-bar h-3 mb-3">
                    <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/60">
                      {quest.current_value} / {quest.target_value}
                    </span>
                    <div className="flex gap-2">
                      {quest.reward_stars > 0 && (
                        <span className="badge-star">+{quest.reward_stars} ⭐</span>
                      )}
                      {quest.reward_gems > 0 && (
                        <span className="badge-gem">+{quest.reward_gems} 💎</span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-white/50 mt-2">
                    Ends: {new Date(quest.end_date).toLocaleDateString()}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Motivational Section */}
      <div className="glass-card p-6 text-center bg-gradient-to-r from-neon-purple/20 to-neon-blue/20">
        <div className="text-4xl mb-3">
          {completionRate === 100 ? '🏆' :
           completionRate >= 75 ? '🌟' :
           completionRate >= 50 ? '💪' :
           completionRate >= 25 ? '🚀' : '✨'}
        </div>
        <p className="text-lg text-white font-medium">
          {completionRate === 100
            ? "Amazing! You've conquered all your quests!"
            : completionRate >= 75
            ? "Almost there! You're doing great!"
            : completionRate >= 50
            ? "Halfway done! Keep up the momentum!"
            : completionRate >= 25
            ? "Good start! Keep going!"
            : "Ready to begin your adventure?"}
        </p>
      </div>

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
