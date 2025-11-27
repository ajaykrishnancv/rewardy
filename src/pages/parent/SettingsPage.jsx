import { useState, useEffect } from 'react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [childProfile, setChildProfile] = useState(null)
  const [salaryConfig, setSalaryConfig] = useState(null)
  const [salaryPayments, setSalaryPayments] = useState([])
  const [showPayModal, setShowPayModal] = useState(false)
  const [currentWeekStats, setCurrentWeekStats] = useState(null)

  const [salaryForm, setSalaryForm] = useState({
    is_enabled: false,
    base_amount: 50,
    min_completion_rate: 70,
    bonus_per_percent: 1,
    max_bonus: 30,
    pay_day: 0 // 0 = Sunday
  })

  const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  useEffect(() => {
    if (user?.familyId) {
      loadSettings()
    }
  }, [user?.familyId])

  async function loadSettings() {
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
        // Load salary config
        const { data: config } = await supabase
          .from('salary_config')
          .select('*')
          .eq('child_id', child.id)
          .single()

        if (config) {
          setSalaryConfig(config)
          setSalaryForm({
            is_enabled: config.is_enabled,
            base_amount: config.base_amount,
            min_completion_rate: config.min_completion_rate,
            bonus_per_percent: config.bonus_per_percent,
            max_bonus: config.max_bonus,
            pay_day: config.pay_day
          })
        }

        // Load recent salary payments
        const { data: payments } = await supabase
          .from('salary_payments')
          .select('*')
          .eq('child_id', child.id)
          .order('week_start', { ascending: false })
          .limit(10)

        setSalaryPayments(payments || [])

        // Calculate current week stats
        await loadCurrentWeekStats(child.id)
      }
    } catch (error) {
      console.error('Error loading settings:', error)
      toast.error('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  async function loadCurrentWeekStats(childId) {
    const now = new Date()
    const dayOfWeek = now.getDay()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - dayOfWeek)
    weekStart.setHours(0, 0, 0, 0)

    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)

    const weekStartStr = weekStart.toISOString().split('T')[0]
    const weekEndStr = weekEnd.toISOString().split('T')[0]

    // Check if already paid for this week
    const { data: existingPayment } = await supabase
      .from('salary_payments')
      .select('id')
      .eq('child_id', childId)
      .eq('week_start', weekStartStr)
      .single()

    // Get tasks for the week
    const { data: tasks } = await supabase
      .from('daily_tasks')
      .select('status')
      .eq('child_id', childId)
      .gte('task_date', weekStartStr)
      .lte('task_date', weekEndStr)

    const totalTasks = (tasks || []).length
    const completedTasks = (tasks || []).filter(t => t.status === 'approved').length
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

    setCurrentWeekStats({
      weekStart: weekStartStr,
      weekEnd: weekEndStr,
      totalTasks,
      completedTasks,
      completionRate,
      isPaid: !!existingPayment
    })
  }

  async function handleSaveSalaryConfig() {
    if (!childProfile) return

    try {
      setSaving(true)

      const configData = {
        child_id: childProfile.id,
        is_enabled: salaryForm.is_enabled,
        base_amount: salaryForm.base_amount,
        min_completion_rate: salaryForm.min_completion_rate,
        bonus_per_percent: salaryForm.bonus_per_percent,
        max_bonus: salaryForm.max_bonus,
        pay_day: salaryForm.pay_day,
        updated_at: new Date().toISOString()
      }

      if (salaryConfig?.id) {
        const { error } = await supabase
          .from('salary_config')
          .update(configData)
          .eq('id', salaryConfig.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('salary_config')
          .insert(configData)

        if (error) throw error
      }

      toast.success('Salary settings saved!')
      loadSettings()
    } catch (error) {
      console.error('Error saving salary config:', error)
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  function calculateSalary(completionRate) {
    if (!salaryForm.is_enabled) return 0
    if (completionRate < salaryForm.min_completion_rate) return 0

    const overMinimum = completionRate - salaryForm.min_completion_rate
    const bonus = Math.min(overMinimum * salaryForm.bonus_per_percent, salaryForm.max_bonus)

    return Math.round(salaryForm.base_amount + bonus)
  }

  async function handlePaySalary() {
    if (!childProfile || !currentWeekStats || currentWeekStats.isPaid) return

    const amount = calculateSalary(currentWeekStats.completionRate)
    if (amount === 0) {
      toast.error(`Minimum ${salaryForm.min_completion_rate}% completion required`)
      return
    }

    try {
      setSaving(true)

      // Get current balance
      const { data: balance } = await supabase
        .from('currency_balances')
        .select('wallet_stars, lifetime_stars_earned')
        .eq('child_id', childProfile.id)
        .single()

      // Update wallet balance
      const { error: balanceError } = await supabase
        .from('currency_balances')
        .update({
          wallet_stars: (balance?.wallet_stars || 0) + amount,
          lifetime_stars_earned: (balance?.lifetime_stars_earned || 0) + amount,
          updated_at: new Date().toISOString()
        })
        .eq('child_id', childProfile.id)

      if (balanceError) throw balanceError

      // Record payment
      const { error: paymentError } = await supabase
        .from('salary_payments')
        .insert({
          child_id: childProfile.id,
          week_start: currentWeekStats.weekStart,
          week_end: currentWeekStats.weekEnd,
          completion_rate: currentWeekStats.completionRate,
          base_amount: salaryForm.base_amount,
          bonus_amount: amount - salaryForm.base_amount,
          total_amount: amount,
          paid_by: user.id
        })

      if (paymentError) throw paymentError

      // Log transaction
      await supabase.from('transactions').insert({
        child_id: childProfile.id,
        transaction_type: 'earn',
        currency_type: 'stars',
        amount: amount,
        description: `Weekly salary (${currentWeekStats.completionRate}% completion)`
      })

      toast.success(`Salary paid! +${amount} stars`)
      setShowPayModal(false)
      loadSettings()
    } catch (error) {
      console.error('Error paying salary:', error)
      toast.error('Failed to pay salary')
    } finally {
      setSaving(false)
    }
  }

  const projectedSalary = currentWeekStats ? calculateSalary(currentWeekStats.completionRate) : 0

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
        <h1 className="text-2xl font-bold text-white mb-1">Settings</h1>
        <p className="text-white/70">Configure family preferences and salary system</p>
      </div>

      {/* Salary Configuration */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <span>💰</span> Weekly Salary
          </h2>
          <label className="flex items-center gap-3 cursor-pointer">
            <span className="text-sm text-white/70">
              {salaryForm.is_enabled ? 'Enabled' : 'Disabled'}
            </span>
            <div className="relative">
              <input
                type="checkbox"
                checked={salaryForm.is_enabled}
                onChange={(e) => setSalaryForm({ ...salaryForm, is_enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
            </div>
          </label>
        </div>

        <div className={`space-y-6 ${!salaryForm.is_enabled ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm text-white/70 mb-2">Base Amount (stars)</label>
              <input
                type="number"
                value={salaryForm.base_amount}
                onChange={(e) => setSalaryForm({ ...salaryForm, base_amount: parseInt(e.target.value) || 0 })}
                min="0"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-neon-blue"
              />
              <p className="text-xs text-white/50 mt-1">Base stars earned if minimum is met</p>
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-2">Minimum Completion Rate (%)</label>
              <input
                type="number"
                value={salaryForm.min_completion_rate}
                onChange={(e) => setSalaryForm({ ...salaryForm, min_completion_rate: parseInt(e.target.value) || 0 })}
                min="0"
                max="100"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-neon-blue"
              />
              <p className="text-xs text-white/50 mt-1">Required to earn any salary</p>
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-2">Bonus per % Above Minimum</label>
              <input
                type="number"
                value={salaryForm.bonus_per_percent}
                onChange={(e) => setSalaryForm({ ...salaryForm, bonus_per_percent: parseFloat(e.target.value) || 0 })}
                min="0"
                step="0.5"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-neon-blue"
              />
              <p className="text-xs text-white/50 mt-1">Extra stars for each % above minimum</p>
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-2">Maximum Bonus (stars)</label>
              <input
                type="number"
                value={salaryForm.max_bonus}
                onChange={(e) => setSalaryForm({ ...salaryForm, max_bonus: parseInt(e.target.value) || 0 })}
                min="0"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-neon-blue"
              />
              <p className="text-xs text-white/50 mt-1">Cap on bonus stars</p>
            </div>
          </div>

          <div>
            <label className="block text-sm text-white/70 mb-2">Pay Day</label>
            <select
              value={salaryForm.pay_day}
              onChange={(e) => setSalaryForm({ ...salaryForm, pay_day: parseInt(e.target.value) })}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-neon-blue"
            >
              {DAYS_OF_WEEK.map((day, index) => (
                <option key={index} value={index}>{day}</option>
              ))}
            </select>
          </div>

          {/* Preview */}
          <div className="p-4 bg-white/5 rounded-xl border border-white/10">
            <p className="text-sm text-white/70 mb-3">Salary Preview</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-white/60">At {salaryForm.min_completion_rate}% (minimum):</span>
                <span className="text-white font-medium">{salaryForm.base_amount} ⭐</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">At 100% completion:</span>
                <span className="text-green-400 font-medium">
                  {calculateSalary(100)} ⭐
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Below {salaryForm.min_completion_rate}%:</span>
                <span className="text-red-400 font-medium">0 ⭐</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={handleSaveSalaryConfig}
            disabled={saving}
            className="px-6 py-3 bg-gradient-to-r from-neon-blue to-neon-purple text-white rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      {/* Current Week Status */}
      {salaryForm.is_enabled && currentWeekStats && (
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span>📅</span> This Week
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-white/5 rounded-xl text-center">
              <p className="text-2xl font-bold text-white">{currentWeekStats.completedTasks}</p>
              <p className="text-xs text-white/60">Tasks Completed</p>
            </div>
            <div className="p-4 bg-white/5 rounded-xl text-center">
              <p className="text-2xl font-bold text-white">{currentWeekStats.totalTasks}</p>
              <p className="text-xs text-white/60">Total Tasks</p>
            </div>
            <div className="p-4 bg-white/5 rounded-xl text-center">
              <p className={`text-2xl font-bold ${
                currentWeekStats.completionRate >= salaryForm.min_completion_rate
                  ? 'text-green-400'
                  : 'text-red-400'
              }`}>
                {currentWeekStats.completionRate}%
              </p>
              <p className="text-xs text-white/60">Completion Rate</p>
            </div>
            <div className="p-4 bg-white/5 rounded-xl text-center">
              <p className="text-2xl font-bold text-yellow-400">{projectedSalary} ⭐</p>
              <p className="text-xs text-white/60">Projected Salary</p>
            </div>
          </div>

          {currentWeekStats.isPaid ? (
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-center">
              <span className="text-green-400 font-medium">
                ✓ Salary already paid for this week
              </span>
            </div>
          ) : (
            <button
              onClick={() => setShowPayModal(true)}
              disabled={projectedSalary === 0}
              className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {projectedSalary === 0
                ? `Need ${salaryForm.min_completion_rate}% to earn salary`
                : `Pay Salary Now (+${projectedSalary} ⭐)`}
            </button>
          )}
        </div>
      )}

      {/* Payment History */}
      {salaryPayments.length > 0 && (
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span>📜</span> Payment History
          </h2>

          <div className="space-y-3">
            {salaryPayments.map(payment => (
              <div key={payment.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                <div>
                  <p className="text-white font-medium">
                    Week of {new Date(payment.week_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                  <p className="text-sm text-white/60">
                    {payment.completion_rate}% completion
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-yellow-400">{payment.total_amount} ⭐</p>
                  <p className="text-xs text-white/50">
                    {payment.base_amount} base + {payment.bonus_amount} bonus
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pay Confirmation Modal */}
      {showPayModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-white mb-4">Confirm Salary Payment</h3>

            <div className="space-y-4">
              <div className="p-4 bg-white/5 rounded-xl">
                <div className="flex justify-between mb-2">
                  <span className="text-white/70">Base Amount</span>
                  <span className="text-white">{salaryForm.base_amount} ⭐</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-white/70">Completion Bonus</span>
                  <span className="text-green-400">+{projectedSalary - salaryForm.base_amount} ⭐</span>
                </div>
                <div className="border-t border-white/10 pt-2 mt-2 flex justify-between">
                  <span className="font-medium text-white">Total</span>
                  <span className="font-bold text-yellow-400">{projectedSalary} ⭐</span>
                </div>
              </div>

              <p className="text-sm text-white/60 text-center">
                {childProfile?.display_name} earned {currentWeekStats?.completionRate}% completion this week
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowPayModal(false)}
                  disabled={saving}
                  className="flex-1 px-4 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePaySalary}
                  disabled={saving}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {saving ? 'Paying...' : 'Pay Salary'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
