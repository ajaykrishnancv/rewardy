import { useState, useEffect } from 'react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts'
import toast from 'react-hot-toast'

const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899']

const DATE_RANGES = [
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'Last 30 Days', value: '30days' },
  { label: 'All Time', value: 'all' }
]

export default function AnalyticsPage() {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [childProfile, setChildProfile] = useState(null)
  const [dateRange, setDateRange] = useState('week')
  const [analytics, setAnalytics] = useState({
    dailyStars: [],
    categoryBreakdown: [],
    completionStats: { current: 0, previous: 0, total: 0, completed: 0 },
    streakData: null,
    achievementStats: { unlocked: 0, total: 0 },
    questStats: { completed: 0, total: 0 },
    currencyStats: { wallet: 0, savings: 0, lifetime: 0 }
  })

  useEffect(() => {
    if (user?.familyId) {
      loadAnalytics()
    }
  }, [user?.familyId, dateRange])

  function getDateRange() {
    const now = new Date()
    let startDate, previousStartDate, previousEndDate

    switch (dateRange) {
      case 'week':
        const dayOfWeek = now.getDay()
        startDate = new Date(now)
        startDate.setDate(now.getDate() - dayOfWeek)
        startDate.setHours(0, 0, 0, 0)

        previousEndDate = new Date(startDate)
        previousEndDate.setDate(previousEndDate.getDate() - 1)
        previousStartDate = new Date(previousEndDate)
        previousStartDate.setDate(previousStartDate.getDate() - 6)
        break

      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        previousEndDate = new Date(startDate)
        previousEndDate.setDate(previousEndDate.getDate() - 1)
        previousStartDate = new Date(previousEndDate.getFullYear(), previousEndDate.getMonth(), 1)
        break

      case '30days':
        startDate = new Date(now)
        startDate.setDate(now.getDate() - 30)
        previousEndDate = new Date(startDate)
        previousEndDate.setDate(previousEndDate.getDate() - 1)
        previousStartDate = new Date(previousEndDate)
        previousStartDate.setDate(previousStartDate.getDate() - 30)
        break

      case 'all':
      default:
        startDate = new Date(2020, 0, 1)
        previousStartDate = null
        previousEndDate = null
        break
    }

    return {
      start: startDate.toISOString().split('T')[0],
      end: now.toISOString().split('T')[0],
      previousStart: previousStartDate?.toISOString().split('T')[0],
      previousEnd: previousEndDate?.toISOString().split('T')[0]
    }
  }

  async function loadAnalytics() {
    try {
      setLoading(true)

      // Load child profile
      const { data: child } = await supabase
        .from('child_profiles')
        .select('*')
        .eq('family_id', user.familyId)
        .single()

      if (!child) {
        setLoading(false)
        return
      }

      setChildProfile(child)
      const dates = getDateRange()

      // Load tasks for current period
      const { data: currentTasks } = await supabase
        .from('daily_tasks')
        .select('*')
        .eq('child_id', child.id)
        .gte('task_date', dates.start)
        .lte('task_date', dates.end)

      // Load tasks for previous period (for comparison)
      let previousTasks = []
      if (dates.previousStart) {
        const { data } = await supabase
          .from('daily_tasks')
          .select('status')
          .eq('child_id', child.id)
          .gte('task_date', dates.previousStart)
          .lte('task_date', dates.previousEnd)
        previousTasks = data || []
      }

      // Calculate daily stars
      const dailyStarsMap = {}
      const daysInRange = getDaysInRange(dates.start, dates.end)

      daysInRange.forEach(day => {
        dailyStarsMap[day] = 0
      })

      ;(currentTasks || []).forEach(task => {
        if (task.status === 'approved' && task.star_value) {
          const day = task.task_date
          dailyStarsMap[day] = (dailyStarsMap[day] || 0) + task.star_value
        }
      })

      const dailyStars = Object.entries(dailyStarsMap).map(([date, stars]) => ({
        date: formatDateLabel(date),
        stars,
        fullDate: date
      }))

      // Calculate category breakdown
      const categoryMap = {}
      ;(currentTasks || []).filter(t => t.status === 'approved').forEach(task => {
        const cat = task.category || 'other'
        categoryMap[cat] = (categoryMap[cat] || 0) + (task.star_value || 0)
      })

      const categoryBreakdown = Object.entries(categoryMap).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value
      })).sort((a, b) => b.value - a.value)

      // Calculate completion stats
      const currentCompleted = (currentTasks || []).filter(t => t.status === 'approved').length
      const currentTotal = (currentTasks || []).length
      const previousCompleted = previousTasks.filter(t => t.status === 'approved').length
      const previousTotal = previousTasks.length

      const currentRate = currentTotal > 0 ? (currentCompleted / currentTotal) * 100 : 0
      const previousRate = previousTotal > 0 ? (previousCompleted / previousTotal) * 100 : 0

      // Load streak data
      const { data: streakData } = await supabase
        .from('streaks')
        .select('*')
        .eq('child_id', child.id)
        .eq('streak_type', 'daily')
        .single()

      // Load achievement stats
      const { count: unlockedCount } = await supabase
        .from('unlocked_achievements')
        .select('*', { count: 'exact', head: true })
        .eq('child_id', child.id)

      const { count: totalAchievements } = await supabase
        .from('achievements')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)

      // Load quest stats for current period
      const { data: quests } = await supabase
        .from('quests')
        .select('is_completed')
        .eq('child_id', child.id)
        .gte('start_date', dates.start)
        .lte('end_date', dates.end)

      const completedQuests = (quests || []).filter(q => q.is_completed).length

      // Load currency stats
      const { data: balance } = await supabase
        .from('currency_balances')
        .select('*')
        .eq('child_id', child.id)
        .single()

      setAnalytics({
        dailyStars,
        categoryBreakdown,
        completionStats: {
          current: Math.round(currentRate),
          previous: Math.round(previousRate),
          total: currentTotal,
          completed: currentCompleted
        },
        streakData,
        achievementStats: {
          unlocked: unlockedCount || 0,
          total: totalAchievements || 0
        },
        questStats: {
          completed: completedQuests,
          total: (quests || []).length
        },
        currencyStats: {
          wallet: balance?.wallet_stars || 0,
          savings: balance?.savings_stars || 0,
          lifetime: balance?.lifetime_stars_earned || 0,
          gems: balance?.gems || 0
        }
      })

    } catch (error) {
      console.error('Error loading analytics:', error)
      toast.error('Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  function getDaysInRange(start, end) {
    const days = []
    const current = new Date(start)
    const endDate = new Date(end)

    while (current <= endDate) {
      days.push(current.toISOString().split('T')[0])
      current.setDate(current.getDate() + 1)
    }

    return days
  }

  function formatDateLabel(dateStr) {
    const date = new Date(dateStr)
    if (dateRange === 'week') {
      return date.toLocaleDateString('en-US', { weekday: 'short' })
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const completionChange = analytics.completionStats.current - analytics.completionStats.previous
  const totalStarsEarned = analytics.dailyStars.reduce((sum, d) => sum + d.stars, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="spinner" />
      </div>
    )
  }

  if (!childProfile) {
    return (
      <div className="glass-card p-8 text-center">
        <div className="text-5xl mb-4">👶</div>
        <p className="text-white/70">No child profile found</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Analytics</h1>
            <p className="text-white/70">
              {childProfile.display_name}'s progress and performance
            </p>
          </div>
          <div className="flex gap-2">
            {DATE_RANGES.map(range => (
              <button
                key={range.value}
                onClick={() => setDateRange(range.value)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  dateRange === range.value
                    ? 'bg-neon-blue text-white'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center text-2xl">
              ⭐
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-400">{totalStarsEarned}</p>
              <p className="text-xs text-white/60">Stars Earned</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center text-2xl">
              ✓
            </div>
            <div>
              <p className="text-2xl font-bold text-green-400">
                {analytics.completionStats.completed}/{analytics.completionStats.total}
              </p>
              <p className="text-xs text-white/60">Tasks Completed</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center text-2xl">
              🔥
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-400">
                {analytics.streakData?.current_streak || 0}
              </p>
              <p className="text-xs text-white/60">Day Streak</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-2xl">
              🏆
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-400">
                {analytics.achievementStats.unlocked}/{analytics.achievementStats.total}
              </p>
              <p className="text-xs text-white/60">Badges Unlocked</p>
            </div>
          </div>
        </div>
      </div>

      {/* Completion Rate with Comparison */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Completion Rate</h2>
        <div className="flex items-center gap-6">
          <div className="flex-shrink-0">
            <div className="relative w-32 h-32">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  fill="none"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="12"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  fill="none"
                  stroke="url(#gradient)"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={`${analytics.completionStats.current * 3.52} 352`}
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl font-bold text-white">
                  {analytics.completionStats.current}%
                </span>
              </div>
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {dateRange !== 'all' && (
                <span className={`flex items-center gap-1 text-sm font-medium ${
                  completionChange > 0 ? 'text-green-400' :
                  completionChange < 0 ? 'text-red-400' : 'text-white/60'
                }`}>
                  {completionChange > 0 ? '↑' : completionChange < 0 ? '↓' : '→'}
                  {Math.abs(completionChange)}% vs previous
                </span>
              )}
            </div>
            <p className="text-white/60 text-sm">
              {analytics.completionStats.completed} out of {analytics.completionStats.total} tasks approved
            </p>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="p-3 bg-white/5 rounded-xl">
                <p className="text-xs text-white/50">Best Day</p>
                <p className="font-semibold text-white">
                  {analytics.dailyStars.length > 0
                    ? Math.max(...analytics.dailyStars.map(d => d.stars))
                    : 0} stars
                </p>
              </div>
              <div className="p-3 bg-white/5 rounded-xl">
                <p className="text-xs text-white/50">Daily Average</p>
                <p className="font-semibold text-white">
                  {analytics.dailyStars.length > 0
                    ? Math.round(totalStarsEarned / analytics.dailyStars.length)
                    : 0} stars
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Stars Chart */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Stars Earned</h2>
          {analytics.dailyStars.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.dailyStars}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis
                    dataKey="date"
                    stroke="rgba(255,255,255,0.5)"
                    tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
                  />
                  <YAxis
                    stroke="rgba(255,255,255,0.5)"
                    tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(0,0,0,0.8)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '8px',
                      color: 'white'
                    }}
                  />
                  <Bar
                    dataKey="stars"
                    fill="url(#barGradient)"
                    radius={[4, 4, 0, 0]}
                  />
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" />
                      <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-white/50">
              No data for this period
            </div>
          )}
        </div>

        {/* Category Breakdown */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Category Breakdown</h2>
          {analytics.categoryBreakdown.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.categoryBreakdown}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={50}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {analytics.categoryBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(0,0,0,0.8)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '8px',
                      color: 'white'
                    }}
                    formatter={(value) => [`${value} stars`, 'Stars']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-white/50">
              No data for this period
            </div>
          )}
          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-4 justify-center">
            {analytics.categoryBreakdown.map((cat, index) => (
              <div key={cat.name} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-xs text-white/70">{cat.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quest & Currency Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Quest Performance */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Quest Performance</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-white/70">Quests Completed</span>
              <span className="text-white font-bold">
                {analytics.questStats.completed} / {analytics.questStats.total}
              </span>
            </div>
            <div className="progress-bar h-3">
              <div
                className="progress-bar-fill bg-gradient-to-r from-green-500 to-emerald-500"
                style={{
                  width: `${analytics.questStats.total > 0
                    ? (analytics.questStats.completed / analytics.questStats.total) * 100
                    : 0}%`
                }}
              />
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="p-3 bg-white/5 rounded-xl text-center">
                <p className="text-2xl font-bold text-green-400">
                  {analytics.questStats.completed}
                </p>
                <p className="text-xs text-white/50">Completed</p>
              </div>
              <div className="p-3 bg-white/5 rounded-xl text-center">
                <p className="text-2xl font-bold text-yellow-400">
                  {analytics.questStats.total - analytics.questStats.completed}
                </p>
                <p className="text-xs text-white/50">In Progress</p>
              </div>
            </div>
          </div>
        </div>

        {/* Currency Overview */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Currency Overview</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
              <div className="flex items-center gap-3">
                <span className="text-2xl">👛</span>
                <span className="text-white/70">Wallet</span>
              </div>
              <span className="text-xl font-bold text-yellow-400">
                {analytics.currencyStats.wallet} ⭐
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🏦</span>
                <span className="text-white/70">Savings</span>
              </div>
              <span className="text-xl font-bold text-blue-400">
                {analytics.currencyStats.savings} ⭐
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
              <div className="flex items-center gap-3">
                <span className="text-2xl">💎</span>
                <span className="text-white/70">Gems</span>
              </div>
              <span className="text-xl font-bold text-purple-400">
                {analytics.currencyStats.gems}
              </span>
            </div>
            <div className="pt-4 border-t border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-white/70">Lifetime Stars Earned</span>
                <span className="font-bold text-white">
                  {analytics.currencyStats.lifetime} ⭐
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Streak & Achievement Summary */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Milestones</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-xl text-center">
            <div className="text-3xl mb-2">🔥</div>
            <p className="text-2xl font-bold text-white">
              {analytics.streakData?.current_streak || 0}
            </p>
            <p className="text-xs text-white/60">Current Streak</p>
          </div>
          <div className="p-4 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-xl text-center">
            <div className="text-3xl mb-2">🏆</div>
            <p className="text-2xl font-bold text-white">
              {analytics.streakData?.longest_streak || 0}
            </p>
            <p className="text-xs text-white/60">Longest Streak</p>
          </div>
          <div className="p-4 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl text-center">
            <div className="text-3xl mb-2">🎖️</div>
            <p className="text-2xl font-bold text-white">
              {analytics.achievementStats.unlocked}
            </p>
            <p className="text-xs text-white/60">Badges Earned</p>
          </div>
          <div className="p-4 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl text-center">
            <div className="text-3xl mb-2">💰</div>
            <p className="text-2xl font-bold text-white">
              {analytics.currencyStats.wallet + analytics.currencyStats.savings}
            </p>
            <p className="text-xs text-white/60">Total Stars</p>
          </div>
        </div>
      </div>
    </div>
  )
}
