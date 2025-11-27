import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

export default function ParentDashboard() {
  const { user, hasPermission } = useAuthStore()

  // Check permissions for actions
  const canApproveTasks = hasPermission('approveTasks')
  const canAwardCurrency = hasPermission('awardCurrency')
  const canApproveRedemptions = hasPermission('approveRedemptions')
  const canEditSchedule = hasPermission('editSchedule')
  const [loading, setLoading] = useState(true)
  const [childProfile, setChildProfile] = useState(null)
  const [currencyBalance, setCurrencyBalance] = useState(null)
  const [streak, setStreak] = useState(null)
  const [pendingTasks, setPendingTasks] = useState([])
  const [pendingRedemptions, setPendingRedemptions] = useState([])
  const [todayStats, setTodayStats] = useState({
    tasksCompleted: 0,
    tasksTotal: 0,
    starsEarned: 0
  })

  // Award stars modal
  const [showAwardModal, setShowAwardModal] = useState(false)
  const [awardAmount, setAwardAmount] = useState(5)
  const [awardReason, setAwardReason] = useState('')
  const [awarding, setAwarding] = useState(false)

  useEffect(() => {
    if (user?.familyId) {
      loadDashboardData()
    }
  }, [user?.familyId])

  async function loadDashboardData() {
    try {
      setLoading(true)

      // Load child profile
      const { data: child, error: childError } = await supabase
        .from('child_profiles')
        .select('*')
        .eq('family_id', user.familyId)
        .single()

      if (childError && childError.code !== 'PGRST116') {
        console.error('Child error:', childError)
      }
      setChildProfile(child)

      if (child) {
        // Load currency balance
        const { data: balance } = await supabase
          .from('currency_balances')
          .select('*')
          .eq('child_id', child.id)
          .single()
        setCurrencyBalance(balance)

        // Load streak
        const { data: streakData } = await supabase
          .from('streaks')
          .select('*')
          .eq('child_id', child.id)
          .eq('streak_type', 'daily')
          .single()
        setStreak(streakData)

        // Load pending tasks (completed, awaiting approval)
        const { data: tasks } = await supabase
          .from('daily_tasks')
          .select('*')
          .eq('child_id', child.id)
          .eq('status', 'completed')
          .order('completed_at', { ascending: false })
          .limit(10)
        setPendingTasks(tasks || [])

        // Load pending redemptions
        const { data: redemptions } = await supabase
          .from('redemptions')
          .select(`
            *,
            rewards (name, icon, cost_stars, cost_gems)
          `)
          .eq('child_id', child.id)
          .eq('status', 'pending')
          .order('requested_at', { ascending: false })
        setPendingRedemptions(redemptions || [])

        // Calculate today's stats
        const { data: todayTasks } = await supabase
          .from('daily_tasks')
          .select('*')
          .eq('child_id', child.id)
          .eq('task_date', today)

        if (todayTasks) {
          const completed = todayTasks.filter(t => t.status === 'approved').length
          const starsEarned = todayTasks.filter(t => t.status === 'approved').reduce((sum, t) => sum + (t.star_value || 0), 0)
          setTodayStats({
            tasksCompleted: completed,
            tasksTotal: todayTasks.length,
            starsEarned
          })
        }
      }
    } catch (error) {
      console.error('Error loading dashboard:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  async function handleApproveTask(task) {
    try {
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

      // Award stars to child
      if (task.star_value > 0 && currencyBalance) {
        const { error: balanceError } = await supabase
          .from('currency_balances')
          .update({
            wallet_stars: currencyBalance.wallet_stars + task.star_value,
            lifetime_stars_earned: currencyBalance.lifetime_stars_earned + task.star_value,
            updated_at: new Date().toISOString()
          })
          .eq('child_id', childProfile.id)

        if (balanceError) throw balanceError

        // Log transaction
        await supabase.from('transactions').insert({
          child_id: childProfile.id,
          transaction_type: 'earn',
          currency_type: 'stars',
          amount: task.star_value,
          description: `Task approved: ${task.title}`,
          reference_type: 'task',
          reference_id: task.id
        })

        setCurrencyBalance(prev => ({
          ...prev,
          wallet_stars: prev.wallet_stars + task.star_value,
          lifetime_stars_earned: prev.lifetime_stars_earned + task.star_value
        }))
      }

      // Remove from pending list
      setPendingTasks(prev => prev.filter(t => t.id !== task.id))
      toast.success(`Task approved! +${task.star_value} stars`)
      loadDashboardData()
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

      setPendingTasks(prev => prev.filter(t => t.id !== task.id))
      toast.success('Task rejected')
    } catch (error) {
      console.error('Error rejecting task:', error)
      toast.error('Failed to reject task')
    }
  }

  async function handleApproveRedemption(redemption) {
    try {
      const { error } = await supabase
        .from('redemptions')
        .update({
          status: 'approved',
          processed_at: new Date().toISOString(),
          processed_by: user.id
        })
        .eq('id', redemption.id)

      if (error) throw error

      setPendingRedemptions(prev => prev.filter(r => r.id !== redemption.id))
      toast.success('Reward approved!')
    } catch (error) {
      console.error('Error approving redemption:', error)
      toast.error('Failed to approve reward')
    }
  }

  async function handleRejectRedemption(redemption) {
    const reason = prompt('Reason for rejection:')
    if (!reason) return

    try {
      // Refund the stars/gems
      if (redemption.cost_stars > 0) {
        await supabase
          .from('currency_balances')
          .update({
            wallet_stars: currencyBalance.wallet_stars + redemption.cost_stars
          })
          .eq('child_id', childProfile.id)
      }

      const { error } = await supabase
        .from('redemptions')
        .update({
          status: 'rejected',
          processed_at: new Date().toISOString(),
          processed_by: user.id,
          rejection_reason: reason
        })
        .eq('id', redemption.id)

      if (error) throw error

      setPendingRedemptions(prev => prev.filter(r => r.id !== redemption.id))
      toast.success('Reward rejected and refunded')
      loadDashboardData()
    } catch (error) {
      console.error('Error rejecting redemption:', error)
      toast.error('Failed to reject reward')
    }
  }

  async function handleAwardStars() {
    if (!awardAmount || awardAmount <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    try {
      setAwarding(true)

      // Update balance
      const { error: balanceError } = await supabase
        .from('currency_balances')
        .update({
          wallet_stars: currencyBalance.wallet_stars + awardAmount,
          lifetime_stars_earned: currencyBalance.lifetime_stars_earned + awardAmount,
          updated_at: new Date().toISOString()
        })
        .eq('child_id', childProfile.id)

      if (balanceError) throw balanceError

      // Log transaction
      await supabase.from('transactions').insert({
        child_id: childProfile.id,
        transaction_type: 'earn',
        currency_type: 'stars',
        amount: awardAmount,
        description: awardReason || 'Bonus stars from parent'
      })

      toast.success(`Awarded ${awardAmount} stars!`)
      setShowAwardModal(false)
      setAwardAmount(5)
      setAwardReason('')
      loadDashboardData()
    } catch (error) {
      console.error('Error awarding stars:', error)
      toast.error('Failed to award stars')
    } finally {
      setAwarding(false)
    }
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
      {/* Welcome header */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">
              Welcome, {user?.roleLabel || 'Parent'}!
            </h1>
            <p className="text-white/70">
              {user?.familyName} Dashboard
            </p>
          </div>
          {childProfile && (
            <div className="text-right">
              <p className="text-white/60 text-sm">Managing</p>
              <p className="text-white font-semibold">{childProfile.display_name}</p>
            </div>
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4 card-hover">
          <div className="text-2xl mb-2">📋</div>
          <p className="text-2xl font-bold text-white">
            {todayStats.tasksCompleted}/{todayStats.tasksTotal}
          </p>
          <p className="text-sm text-white/60">Tasks Today</p>
        </div>
        <div className="glass-card p-4 card-hover">
          <div className="text-2xl mb-2">⏳</div>
          <p className="text-2xl font-bold text-white">{pendingTasks.length}</p>
          <p className="text-sm text-white/60">Pending Approval</p>
        </div>
        <div className="glass-card p-4 card-hover">
          <div className="text-2xl mb-2">⭐</div>
          <p className="text-2xl font-bold text-star">
            {currencyBalance?.wallet_stars || 0}
          </p>
          <p className="text-sm text-white/60">Child's Stars</p>
        </div>
        <div className="glass-card p-4 card-hover">
          <div className="text-2xl mb-2">🔥</div>
          <p className="text-2xl font-bold text-orange-400">
            {streak?.current_streak || 0}
          </p>
          <p className="text-sm text-white/60">Day Streak</p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {canEditSchedule ? (
            <Link
              to="/dashboard/tasks"
              className="p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-center"
            >
              <div className="text-2xl mb-2">➕</div>
              <p className="text-sm text-white/80">Add Task</p>
            </Link>
          ) : (
            <Link
              to="/dashboard/tasks"
              className="p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-center"
            >
              <div className="text-2xl mb-2">📋</div>
              <p className="text-sm text-white/80">View Tasks</p>
            </Link>
          )}
          <Link
            to="/dashboard/schedule"
            className="p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-center"
          >
            <div className="text-2xl mb-2">📅</div>
            <p className="text-sm text-white/80">View Schedule</p>
          </Link>
          {canAwardCurrency && (
            <button
              onClick={() => setShowAwardModal(true)}
              className="p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-center"
              disabled={!childProfile}
            >
              <div className="text-2xl mb-2">⭐</div>
              <p className="text-sm text-white/80">Award Stars</p>
            </button>
          )}
          <Link
            to="/dashboard/analytics"
            className="p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-center"
          >
            <div className="text-2xl mb-2">📊</div>
            <p className="text-sm text-white/80">Analytics</p>
          </Link>
        </div>
      </div>

      {/* Pending approvals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Tasks */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Pending Task Approvals</h2>
          {pendingTasks.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">✨</div>
              <p className="text-white/60">No pending task approvals</p>
              <p className="text-sm text-white/40">Tasks completed by child will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingTasks.map(task => (
                <div key={task.id} className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-medium text-white">{task.title}</p>
                      <p className="text-sm text-white/60">{task.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="badge-star">+{task.star_value} stars</span>
                        {task.subject && (
                          <span className="text-xs text-white/50">{task.subject}</span>
                        )}
                      </div>
                    </div>
                    {canApproveTasks ? (
                      <div className="flex gap-2">
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
                      </div>
                    ) : (
                      <span className="text-xs text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded-lg">
                        Pending
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending Reward Redemptions */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Pending Reward Requests</h2>
          {pendingRedemptions.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">🎁</div>
              <p className="text-white/60">No pending reward requests</p>
              <p className="text-sm text-white/40">Reward redemptions will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingRedemptions.map(redemption => (
                <div key={redemption.id} className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{redemption.rewards?.icon || '🎁'}</span>
                        <p className="font-medium text-white">{redemption.rewards?.name}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        {redemption.cost_stars > 0 && (
                          <span className="badge-star">{redemption.cost_stars} stars</span>
                        )}
                        {redemption.cost_gems > 0 && (
                          <span className="badge-gem">{redemption.cost_gems} gems</span>
                        )}
                      </div>
                    </div>
                    {canApproveRedemptions ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApproveRedemption(redemption)}
                          className="p-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
                          title="Approve"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleRejectRedemption(redemption)}
                          className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                          title="Reject"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded-lg">
                        Pending
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Child Balance Overview */}
      {childProfile && currencyBalance && (
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            {childProfile.display_name}'s Balance
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-white/5 rounded-xl text-center">
              <p className="text-3xl font-bold text-star">{currencyBalance.wallet_stars}</p>
              <p className="text-sm text-white/60">Wallet Stars</p>
            </div>
            <div className="p-4 bg-white/5 rounded-xl text-center">
              <p className="text-3xl font-bold text-blue-400">{currencyBalance.savings_stars}</p>
              <p className="text-sm text-white/60">Savings Stars</p>
            </div>
            <div className="p-4 bg-white/5 rounded-xl text-center">
              <p className="text-3xl font-bold text-gem">{currencyBalance.gems}</p>
              <p className="text-sm text-white/60">Gems</p>
            </div>
            <div className="p-4 bg-white/5 rounded-xl text-center">
              <p className="text-3xl font-bold text-green-400">{currencyBalance.lifetime_stars_earned}</p>
              <p className="text-sm text-white/60">Lifetime Stars</p>
            </div>
          </div>
        </div>
      )}

      {/* Award Stars Modal */}
      {showAwardModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass-card p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-white mb-4">Award Stars</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-white/70 mb-1">Amount</label>
                <input
                  type="number"
                  value={awardAmount}
                  onChange={(e) => setAwardAmount(parseInt(e.target.value) || 0)}
                  min="1"
                  max="100"
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-star"
                />
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-1">Reason (optional)</label>
                <input
                  type="text"
                  value={awardReason}
                  onChange={(e) => setAwardReason(e.target.value)}
                  placeholder="e.g., Great behavior today!"
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-star"
                />
              </div>

              <div className="flex gap-3 justify-end mt-6">
                <button
                  onClick={() => setShowAwardModal(false)}
                  className="px-4 py-2 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAwardStars}
                  disabled={awarding || awardAmount <= 0}
                  className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {awarding ? 'Awarding...' : `Award ${awardAmount} Stars`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
