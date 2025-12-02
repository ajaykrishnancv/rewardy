import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { updateQuestProgress, checkAchievements } from '../../services/gamificationService'
import toast from 'react-hot-toast'

// Helper to get local date string (YYYY-MM-DD) without timezone issues
function getLocalDateString(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

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

  // Award/Deduct currency modal
  const [showAwardModal, setShowAwardModal] = useState(false)
  const [awardAmount, setAwardAmount] = useState(5)
  const [awardReason, setAwardReason] = useState('')
  const [awardType, setAwardType] = useState('award') // 'award' or 'deduct'
  const [currencyType, setCurrencyType] = useState('stars') // 'stars' or 'gems'
  const [awarding, setAwarding] = useState(false)

  // Common reasons for awards/deductions
  const AWARD_REASONS = [
    { label: 'Good Behavior', value: 'Good behavior' },
    { label: 'Helping Others', value: 'Helping others' },
    { label: 'Charity/Kindness', value: 'Charity or act of kindness' },
    { label: 'Extra Effort', value: 'Going above and beyond' },
    { label: 'Excellent Work', value: 'Excellent work' },
    { label: 'Special Achievement', value: 'Special achievement' }
  ]

  const DEDUCT_REASONS = [
    { label: 'Rule Breaking', value: 'Breaking household rules' },
    { label: 'Not Following Instructions', value: 'Not following instructions' },
    { label: 'Disrespectful Behavior', value: 'Disrespectful behavior' },
    { label: 'Not Completing Chores', value: 'Not completing assigned chores' },
    { label: 'Screen Time Violation', value: 'Screen time violation' }
  ]

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
        const today = getLocalDateString()
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
      const starValue = task.star_value || 0
      const gemValue = task.gem_value || 0

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
      if (starValue > 0 && currencyBalance) {
        const { error: balanceError } = await supabase
          .from('currency_balances')
          .update({
            wallet_stars: currencyBalance.wallet_stars + starValue,
            lifetime_stars_earned: currencyBalance.lifetime_stars_earned + starValue,
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

        setCurrencyBalance(prev => ({
          ...prev,
          wallet_stars: prev.wallet_stars + starValue,
          lifetime_stars_earned: prev.lifetime_stars_earned + starValue
        }))
      }

      // Award gems to child (for bonus tasks)
      if (gemValue > 0 && currencyBalance) {
        const { error: gemError } = await supabase
          .from('currency_balances')
          .update({
            gems: currencyBalance.gems + gemValue,
            lifetime_gems_earned: (currencyBalance.lifetime_gems_earned || 0) + gemValue,
            updated_at: new Date().toISOString()
          })
          .eq('child_id', childProfile.id)

        if (gemError) throw gemError

        // Log gem transaction
        await supabase.from('transactions').insert({
          child_id: childProfile.id,
          transaction_type: 'earn',
          currency_type: 'gems',
          amount: gemValue,
          description: `Bonus task approved: ${task.title}`,
          reference_type: 'task',
          reference_id: task.id
        })

        setCurrencyBalance(prev => ({
          ...prev,
          gems: prev.gems + gemValue,
          lifetime_gems_earned: (prev.lifetime_gems_earned || 0) + gemValue
        }))
      }

      // Update quest progress (on approval)
      await updateQuestProgress(childProfile.id, 'task_approved', {
        starsEarned: starValue
      })

      // Check for new achievements
      await checkAchievements(childProfile.id)

      // Remove from pending list
      setPendingTasks(prev => prev.filter(t => t.id !== task.id))

      // Show appropriate toast message
      const rewardMsg = []
      if (starValue > 0) rewardMsg.push(`+${starValue} stars`)
      if (gemValue > 0) rewardMsg.push(`+${gemValue} gems`)
      toast.success(`Task approved! ${rewardMsg.join(', ')}`)

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

  async function handleAwardCurrency() {
    if (!awardAmount || awardAmount <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    // Check if deducting more than available
    if (awardType === 'deduct') {
      const availableAmount = currencyType === 'stars'
        ? currencyBalance.wallet_stars
        : currencyBalance.gems

      if (awardAmount > availableAmount) {
        toast.error(`Cannot deduct more than available (${availableAmount} ${currencyType})`)
        return
      }
    }

    try {
      setAwarding(true)

      const amount = awardType === 'award' ? awardAmount : -awardAmount
      const transactionType = awardType === 'award' ? 'earn' : 'deduct'
      const descriptionPrefix = awardType === 'award' ? 'Award' : 'Deduction'

      if (currencyType === 'stars') {
        // Update stars balance
        const newWalletStars = currencyBalance.wallet_stars + amount
        const updateData = {
          wallet_stars: Math.max(0, newWalletStars),
          updated_at: new Date().toISOString()
        }

        // Only update lifetime earned if awarding (not deducting)
        if (awardType === 'award') {
          updateData.lifetime_stars_earned = currencyBalance.lifetime_stars_earned + awardAmount
        }

        const { error: balanceError } = await supabase
          .from('currency_balances')
          .update(updateData)
          .eq('child_id', childProfile.id)

        if (balanceError) throw balanceError
      } else {
        // Update gems balance
        const newGems = currencyBalance.gems + amount
        const updateData = {
          gems: Math.max(0, newGems),
          updated_at: new Date().toISOString()
        }

        // Only update lifetime earned if awarding
        if (awardType === 'award') {
          updateData.lifetime_gems_earned = (currencyBalance.lifetime_gems_earned || 0) + awardAmount
        }

        const { error: balanceError } = await supabase
          .from('currency_balances')
          .update(updateData)
          .eq('child_id', childProfile.id)

        if (balanceError) throw balanceError
      }

      // Log transaction
      await supabase.from('transactions').insert({
        child_id: childProfile.id,
        transaction_type: transactionType,
        currency_type: currencyType,
        amount: Math.abs(amount),
        balance_type: currencyType === 'stars' ? 'wallet' : null,
        description: `${descriptionPrefix}: ${awardReason || (awardType === 'award' ? 'Bonus from parent' : 'Deduction by parent')}`
      })

      const emoji = currencyType === 'stars' ? '⭐' : '💎'
      const actionWord = awardType === 'award' ? 'Awarded' : 'Deducted'
      toast.success(`${actionWord} ${awardAmount} ${emoji}!`)

      setShowAwardModal(false)
      setAwardAmount(5)
      setAwardReason('')
      setAwardType('award')
      setCurrencyType('stars')
      loadDashboardData()
    } catch (error) {
      console.error('Error processing currency:', error)
      toast.error(`Failed to ${awardType} ${currencyType}`)
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
              <div className="text-2xl mb-2">💰</div>
              <p className="text-sm text-white/80">Award / Deduct</p>
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
                        <span className="badge-star">+{task.star_value || 0} stars</span>
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

      {/* Award/Deduct Currency Modal */}
      {showAwardModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass-card p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-white mb-4">
              {awardType === 'award' ? 'Award' : 'Deduct'} {currencyType === 'stars' ? 'Stars ⭐' : 'Gems 💎'}
            </h3>

            <div className="space-y-4">
              {/* Action Type Toggle */}
              <div>
                <label className="block text-sm text-white/70 mb-2">Action</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setAwardType('award')}
                    className={`px-4 py-3 rounded-xl font-medium transition-all ${
                      awardType === 'award'
                        ? 'bg-green-500/30 border-2 border-green-500 text-green-400'
                        : 'bg-white/10 border border-white/20 text-white/70 hover:bg-white/20'
                    }`}
                  >
                    + Award
                  </button>
                  <button
                    onClick={() => setAwardType('deduct')}
                    className={`px-4 py-3 rounded-xl font-medium transition-all ${
                      awardType === 'deduct'
                        ? 'bg-red-500/30 border-2 border-red-500 text-red-400'
                        : 'bg-white/10 border border-white/20 text-white/70 hover:bg-white/20'
                    }`}
                  >
                    - Deduct
                  </button>
                </div>
              </div>

              {/* Currency Type Toggle */}
              <div>
                <label className="block text-sm text-white/70 mb-2">Currency</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setCurrencyType('stars')}
                    className={`px-4 py-3 rounded-xl font-medium transition-all ${
                      currencyType === 'stars'
                        ? 'bg-yellow-500/30 border-2 border-yellow-500 text-yellow-400'
                        : 'bg-white/10 border border-white/20 text-white/70 hover:bg-white/20'
                    }`}
                  >
                    ⭐ Stars
                  </button>
                  <button
                    onClick={() => setCurrencyType('gems')}
                    className={`px-4 py-3 rounded-xl font-medium transition-all ${
                      currencyType === 'gems'
                        ? 'bg-purple-500/30 border-2 border-purple-500 text-purple-400'
                        : 'bg-white/10 border border-white/20 text-white/70 hover:bg-white/20'
                    }`}
                  >
                    💎 Gems
                  </button>
                </div>
                <p className="text-xs text-white/50 mt-1">
                  Available: {currencyType === 'stars' ? currencyBalance?.wallet_stars || 0 : currencyBalance?.gems || 0}
                </p>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm text-white/70 mb-1">Amount</label>
                <input
                  type="number"
                  value={awardAmount}
                  onChange={(e) => setAwardAmount(parseInt(e.target.value) || 0)}
                  min="1"
                  max="1000"
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-neon-blue"
                />
              </div>

              {/* Quick Reason Buttons */}
              <div>
                <label className="block text-sm text-white/70 mb-2">Quick Reasons</label>
                <div className="flex flex-wrap gap-2">
                  {(awardType === 'award' ? AWARD_REASONS : DEDUCT_REASONS).map(reason => (
                    <button
                      key={reason.value}
                      onClick={() => setAwardReason(reason.value)}
                      className={`px-3 py-1 text-xs rounded-lg transition-all ${
                        awardReason === reason.value
                          ? awardType === 'award'
                            ? 'bg-green-500/30 text-green-400 border border-green-500'
                            : 'bg-red-500/30 text-red-400 border border-red-500'
                          : 'bg-white/10 text-white/70 hover:bg-white/20'
                      }`}
                    >
                      {reason.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Reason */}
              <div>
                <label className="block text-sm text-white/70 mb-1">Reason (optional)</label>
                <input
                  type="text"
                  value={awardReason}
                  onChange={(e) => setAwardReason(e.target.value)}
                  placeholder={awardType === 'award' ? 'e.g., Great behavior today!' : 'e.g., Did not follow rules'}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-neon-blue"
                />
              </div>

              <div className="flex gap-3 justify-end mt-6">
                <button
                  onClick={() => {
                    setShowAwardModal(false)
                    setAwardType('award')
                    setCurrencyType('stars')
                    setAwardReason('')
                  }}
                  className="px-4 py-2 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAwardCurrency}
                  disabled={awarding || awardAmount <= 0}
                  className={`px-4 py-2 text-white rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 ${
                    awardType === 'award'
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                      : 'bg-gradient-to-r from-red-500 to-orange-500'
                  }`}
                >
                  {awarding
                    ? 'Processing...'
                    : `${awardType === 'award' ? 'Award' : 'Deduct'} ${awardAmount} ${currencyType === 'stars' ? '⭐' : '💎'}`
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
