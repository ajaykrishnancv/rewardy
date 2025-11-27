import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

export default function ChildDashboard() {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [currencyBalance, setCurrencyBalance] = useState(null)
  const [streak, setStreak] = useState(null)
  const [todaysTasks, setTodaysTasks] = useState([])
  const [activeQuests, setActiveQuests] = useState([])
  const [recentAchievements, setRecentAchievements] = useState([])

  useEffect(() => {
    if (user?.childProfile?.id) {
      loadDashboardData()
    }
  }, [user?.childProfile?.id])

  async function loadDashboardData() {
    try {
      setLoading(true)
      const childId = user.childProfile.id

      // Load currency balance
      const { data: balance } = await supabase
        .from('currency_balances')
        .select('*')
        .eq('child_id', childId)
        .single()
      setCurrencyBalance(balance)

      // Load streak
      const { data: streakData } = await supabase
        .from('streaks')
        .select('*')
        .eq('child_id', childId)
        .eq('streak_type', 'daily')
        .single()
      setStreak(streakData)

      // Load today's tasks
      const today = new Date().toISOString().split('T')[0]
      const { data: tasks } = await supabase
        .from('daily_tasks')
        .select('*')
        .eq('child_id', childId)
        .eq('task_date', today)
        .order('scheduled_time', { ascending: true })
      setTodaysTasks(tasks || [])

      // Load active quests
      const { data: quests } = await supabase
        .from('quests')
        .select('*')
        .eq('child_id', childId)
        .eq('is_completed', false)
        .lte('start_date', today)
        .gte('end_date', today)
        .order('end_date', { ascending: true })
        .limit(5)
      setActiveQuests(quests || [])

      // Load recent unlocked achievements
      const { data: achievements } = await supabase
        .from('unlocked_achievements')
        .select(`
          *,
          achievements (name, icon, description)
        `)
        .eq('child_id', childId)
        .order('unlocked_at', { ascending: false })
        .limit(3)
      setRecentAchievements(achievements || [])

    } catch (error) {
      console.error('Error loading dashboard:', error)
      toast.error('Failed to load dashboard')
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

      toast.success('Task submitted for approval!')
    } catch (error) {
      console.error('Error completing task:', error)
      toast.error('Failed to complete task')
    }
  }

  // Calculate task stats
  const tasksCompleted = todaysTasks.filter(t => t.status === 'completed' || t.status === 'approved').length
  const tasksTotal = todaysTasks.length
  const completionRate = tasksTotal > 0 ? Math.round((tasksCompleted / tasksTotal) * 100) : 0

  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 17) return 'Good Afternoon'
    return 'Good Evening'
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
      {/* Welcome Card */}
      <div className="glass-card p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-neon-purple/30 to-neon-blue/30 rounded-full blur-3xl" />
        <div className="relative">
          <h1 className="text-2xl font-bold text-white mb-1">
            {getGreeting()}, {user?.childProfile?.display_name || 'Champion'}!
          </h1>
          <p className="text-white/70">
            Ready to conquer today's quests?
          </p>
        </div>

        {/* Currency display */}
        <div className="flex gap-4 mt-4">
          <div className="star-display">
            <span className="star-icon text-lg">*</span>
            <span className="text-white font-bold">{currencyBalance?.wallet_stars || 0}</span>
          </div>
          <div className="gem-display">
            <span className="gem-icon text-lg">*</span>
            <span className="text-white font-bold">{currencyBalance?.gems || 0}</span>
          </div>
          <div className="streak-fire">
            <span className="streak-fire-icon">*</span>
            <span className="text-white font-bold">{streak?.current_streak || 0}</span>
          </div>
        </div>
      </div>

      {/* Today's Progress */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Today's Progress</h2>
          <span className="text-neon-blue font-bold">{completionRate}%</span>
        </div>
        <div className="progress-bar mb-2">
          <div
            className="progress-bar-fill"
            style={{ width: `${completionRate}%` }}
          />
        </div>
        <p className="text-sm text-white/60">
          {tasksCompleted} of {tasksTotal} tasks completed
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-card p-4 text-center card-hover">
          <div className="text-3xl mb-1">*</div>
          <p className="text-2xl font-bold text-white">{tasksTotal}</p>
          <p className="text-xs text-white/60">Today's Quests</p>
        </div>
        <div className="glass-card p-4 text-center card-hover">
          <div className="text-3xl mb-1">*</div>
          <p className="text-2xl font-bold text-star">{currencyBalance?.lifetime_stars_earned || 0}</p>
          <p className="text-xs text-white/60">Total Stars</p>
        </div>
        <div className="glass-card p-4 text-center card-hover">
          <div className="text-3xl mb-1">*</div>
          <p className="text-2xl font-bold text-blue-400">{currencyBalance?.savings_stars || 0}</p>
          <p className="text-xs text-white/60">Saved Stars</p>
        </div>
      </div>

      {/* Today's Tasks */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Today's Quests</h2>
          <Link to="/child/quests" className="text-neon-blue text-sm hover:underline">
            View All
          </Link>
        </div>

        {todaysTasks.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-5xl mb-3">*</div>
            <p className="text-white/70 font-medium">No quests for today!</p>
            <p className="text-sm text-white/50">Enjoy your free time!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {todaysTasks.slice(0, 5).map(task => (
              <div
                key={task.id}
                className={`quest-card ${
                  task.status === 'approved' ? 'border-green-500/30 bg-green-500/5' :
                  task.status === 'completed' ? 'border-yellow-500/30 bg-yellow-500/5' :
                  ''
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Status icon */}
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    task.status === 'approved' ? 'bg-green-500/20' :
                    task.status === 'completed' ? 'bg-yellow-500/20' :
                    task.status === 'rejected' ? 'bg-red-500/20' :
                    'bg-white/10'
                  }`}>
                    {task.status === 'approved' ? 'Done' :
                     task.status === 'completed' ? '...' :
                     task.status === 'rejected' ? 'X' :
                     task.icon || '*'}
                  </div>

                  {/* Task info */}
                  <div className="flex-1">
                    <p className={`font-medium ${
                      task.status === 'approved' ? 'text-green-400 line-through' :
                      task.status === 'rejected' ? 'text-red-400 line-through' :
                      'text-white'
                    }`}>
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-white/50">
                        {task.scheduled_time || 'Anytime'}
                      </span>
                      <span className="badge-star text-xs">+{task.stars_reward}</span>
                    </div>
                  </div>

                  {/* Action button */}
                  {task.status === 'pending' && (
                    <button
                      onClick={() => handleCompleteTask(task)}
                      className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
                    >
                      Done!
                    </button>
                  )}
                  {task.status === 'completed' && (
                    <span className="text-yellow-400 text-sm">Awaiting...</span>
                  )}
                  {task.status === 'approved' && (
                    <span className="text-green-400 text-sm">Approved!</span>
                  )}
                </div>
              </div>
            ))}

            {todaysTasks.length > 5 && (
              <Link
                to="/child/quests"
                className="block text-center py-3 text-neon-blue hover:underline"
              >
                View {todaysTasks.length - 5} more quests
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Active Quests (Daily/Weekly Challenges) */}
      {activeQuests.length > 0 && (
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Active Challenges</h2>
          <div className="space-y-3">
            {activeQuests.map(quest => {
              const progress = quest.target_value > 0
                ? Math.min((quest.current_value / quest.target_value) * 100, 100)
                : 0

              return (
                <div key={quest.id} className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-white">{quest.title}</p>
                      <p className="text-sm text-white/60">{quest.description}</p>
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
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/60">
                      {quest.current_value} / {quest.target_value}
                    </span>
                    <div className="flex gap-2">
                      {quest.reward_stars > 0 && (
                        <span className="badge-star">+{quest.reward_stars}</span>
                      )}
                      {quest.reward_gems > 0 && (
                        <span className="badge-gem">+{quest.reward_gems}</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link
          to="/child/quests"
          className="glass-card p-4 text-center card-hover"
        >
          <div className="text-3xl mb-2">*</div>
          <p className="text-sm text-white/80">My Quests</p>
        </Link>
        <Link
          to="/child/shop"
          className="glass-card p-4 text-center card-hover"
        >
          <div className="text-3xl mb-2">*</div>
          <p className="text-sm text-white/80">Reward Shop</p>
        </Link>
        <Link
          to="/child/bank"
          className="glass-card p-4 text-center card-hover"
        >
          <div className="text-3xl mb-2">*</div>
          <p className="text-sm text-white/80">Star Bank</p>
        </Link>
        <Link
          to="/child/achievements"
          className="glass-card p-4 text-center card-hover"
        >
          <div className="text-3xl mb-2">*</div>
          <p className="text-sm text-white/80">Badges</p>
        </Link>
      </div>

      {/* Recent Achievements */}
      {recentAchievements.length > 0 && (
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Recent Badges</h2>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {recentAchievements.map(ua => (
              <div
                key={ua.id}
                className="flex-shrink-0 achievement-badge unlocked w-24 h-24"
              >
                <div className="text-center">
                  <span className="text-3xl">{ua.achievements?.icon || '*'}</span>
                  <p className="text-xs text-white mt-1 truncate">
                    {ua.achievements?.name}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Motivational Message */}
      <div className="glass-card p-6 text-center bg-gradient-to-r from-neon-purple/20 to-neon-blue/20">
        <p className="text-lg text-white font-medium">
          {completionRate === 100
            ? "Amazing! You've completed all your quests!"
            : completionRate >= 50
            ? "Great progress! Keep going!"
            : "Every quest completed brings you closer to your goals!"}
        </p>
      </div>
    </div>
  )
}
