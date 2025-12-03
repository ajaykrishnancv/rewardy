import { useState, useEffect } from 'react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { DEFAULT_TIME_SETTINGS, formatTime } from '../../lib/timeSettings'
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  showNotification,
  DEFAULT_NOTIFICATION_SETTINGS,
  getNotificationSettings
} from '../../services/notificationService'
import toast from 'react-hot-toast'

// Helper to get local date string (YYYY-MM-DD) without timezone issues
function getLocalDateString(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const DAILY_QUEST_TEMPLATES = [
  { id: 'task_tackler', title: 'Task Tackler', description: 'Complete tasks today', defaultTarget: 3, rewardStars: 5, rewardGems: 0 },
  { id: 'star_hunter', title: 'Star Hunter', description: 'Earn stars today', defaultTarget: 15, rewardStars: 3, rewardGems: 1 },
  { id: 'early_bird', title: 'Early Bird', description: 'Complete tasks before noon', defaultTarget: 2, rewardStars: 5, rewardGems: 0 },
  { id: 'no_skips', title: 'No Skips', description: 'Complete all mandatory tasks', defaultTarget: 1, rewardStars: 10, rewardGems: 1 }
]

const WEEKLY_QUEST_TEMPLATES = [
  { id: 'weekly_warrior', title: 'Weekly Warrior', description: 'Complete tasks this week', defaultTarget: 20, rewardStars: 20, rewardGems: 3 },
  { id: 'savings_star', title: 'Savings Star', description: 'Save stars to savings', defaultTarget: 30, rewardStars: 10, rewardGems: 2 },
  { id: 'perfect_week', title: 'Perfect Week', description: 'Get all tasks approved for days', defaultTarget: 5, rewardStars: 25, rewardGems: 5 },
  { id: 'streak_builder', title: 'Streak Builder', description: 'Maintain a day streak', defaultTarget: 5, rewardStars: 15, rewardGems: 2 }
]

export default function SettingsPage() {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [childProfile, setChildProfile] = useState(null)
  const [salaryConfig, setSalaryConfig] = useState(null)
  const [salaryPayments, setSalaryPayments] = useState([])
  const [showPayModal, setShowPayModal] = useState(false)
  const [currentWeekStats, setCurrentWeekStats] = useState(null)

  // Challenges state
  const [activeQuests, setActiveQuests] = useState([])
  const [showChallengeModal, setShowChallengeModal] = useState(false)
  const [challengeForm, setChallengeForm] = useState({
    quest_type: 'daily',
    title: '',
    description: '',
    target_value: 3,
    reward_stars: 5,
    reward_gems: 0
  })

  // Time settings state
  const [timeSettings, setTimeSettings] = useState({
    dayStartTime: DEFAULT_TIME_SETTINGS.dayStartTime,
    use24HourFormat: DEFAULT_TIME_SETTINGS.use24HourFormat
  })
  const [savingTimeSettings, setSavingTimeSettings] = useState(false)

  // Notification settings state
  const [notificationSettings, setNotificationSettings] = useState(DEFAULT_NOTIFICATION_SETTINGS)
  const [notificationPermission, setNotificationPermission] = useState(getNotificationPermission())
  const [savingNotificationSettings, setSavingNotificationSettings] = useState(false)

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

      // Load family settings (including time settings)
      const { data: family } = await supabase
        .from('families')
        .select('settings')
        .eq('id', user.familyId)
        .single()

      if (family?.settings) {
        setTimeSettings({
          dayStartTime: family.settings.dayStartTime || DEFAULT_TIME_SETTINGS.dayStartTime,
          use24HourFormat: family.settings.use24HourFormat ?? DEFAULT_TIME_SETTINGS.use24HourFormat
        })
        // Load notification settings
        setNotificationSettings(getNotificationSettings(family.settings))
      }

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

        // Load active quests
        const today = getLocalDateString()
        const { data: quests } = await supabase
          .from('quests')
          .select('*')
          .eq('child_id', child.id)
          .gte('end_date', today)
          .order('created_at', { ascending: false })

        setActiveQuests(quests || [])
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

    const weekStartStr = getLocalDateString(weekStart)
    const weekEndStr = getLocalDateString(weekEnd)

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

  // Challenge management functions
  async function handleCreateChallenge() {
    if (!childProfile || !challengeForm.title.trim()) {
      toast.error('Please enter a title')
      return
    }

    try {
      setSaving(true)
      const today = getLocalDateString()

      // Calculate end date based on quest type
      const endDate = new Date()
      if (challengeForm.quest_type === 'daily') {
        // Daily quests end today
      } else if (challengeForm.quest_type === 'weekly') {
        // Weekly quests end in 7 days
        endDate.setDate(endDate.getDate() + 6)
      } else {
        // Special quests end in 30 days
        endDate.setDate(endDate.getDate() + 30)
      }

      const { error } = await supabase
        .from('quests')
        .insert({
          child_id: childProfile.id,
          quest_type: challengeForm.quest_type,
          title: challengeForm.title.trim(),
          description: challengeForm.description.trim() || null,
          target_value: challengeForm.target_value,
          current_value: 0,
          reward_stars: challengeForm.reward_stars,
          reward_gems: challengeForm.reward_gems,
          start_date: today,
          end_date: getLocalDateString(endDate),
          is_completed: false
        })

      if (error) throw error

      toast.success('Challenge created!')
      setShowChallengeModal(false)
      setChallengeForm({
        quest_type: 'daily',
        title: '',
        description: '',
        target_value: 3,
        reward_stars: 5,
        reward_gems: 0
      })
      loadSettings()
    } catch (error) {
      console.error('Error creating challenge:', error)
      toast.error('Failed to create challenge')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteChallenge(questId) {
    if (!confirm('Delete this challenge?')) return

    try {
      const { error } = await supabase
        .from('quests')
        .delete()
        .eq('id', questId)

      if (error) throw error

      toast.success('Challenge deleted')
      setActiveQuests(prev => prev.filter(q => q.id !== questId))
    } catch (error) {
      console.error('Error deleting challenge:', error)
      toast.error('Failed to delete challenge')
    }
  }

  function handleUseTemplate(template, type) {
    setChallengeForm({
      quest_type: type,
      title: template.title,
      description: template.description,
      target_value: template.defaultTarget,
      reward_stars: template.rewardStars,
      reward_gems: template.rewardGems
    })
    setShowChallengeModal(true)
  }

  // Save time settings
  async function handleSaveTimeSettings() {
    try {
      setSavingTimeSettings(true)

      // Get current family settings
      const { data: family } = await supabase
        .from('families')
        .select('settings')
        .eq('id', user.familyId)
        .single()

      const currentSettings = family?.settings || {}
      const updatedSettings = {
        ...currentSettings,
        dayStartTime: timeSettings.dayStartTime,
        use24HourFormat: timeSettings.use24HourFormat
      }

      const { error } = await supabase
        .from('families')
        .update({
          settings: updatedSettings,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.familyId)

      if (error) throw error

      toast.success('Time settings saved!')
    } catch (error) {
      console.error('Error saving time settings:', error)
      toast.error('Failed to save time settings')
    } finally {
      setSavingTimeSettings(false)
    }
  }

  // Enable notifications
  async function handleEnableNotifications() {
    const result = await requestNotificationPermission()
    setNotificationPermission(getNotificationPermission())

    if (result.success) {
      setNotificationSettings(prev => ({ ...prev, enabled: true }))
      toast.success('Notifications enabled!')

      // Show a test notification
      setTimeout(() => {
        showNotification('Notifications Enabled!', {
          body: 'You will now receive task reminders and updates.',
          tag: 'test-notification'
        })
      }, 500)
    } else if (result.permission === 'denied') {
      toast.error('Notifications blocked. Please enable in browser settings.')
    }
  }

  // Save notification settings
  async function handleSaveNotificationSettings() {
    try {
      setSavingNotificationSettings(true)

      // Get current family settings
      const { data: family } = await supabase
        .from('families')
        .select('settings')
        .eq('id', user.familyId)
        .single()

      const currentSettings = family?.settings || {}
      const updatedSettings = {
        ...currentSettings,
        notifications: notificationSettings
      }

      const { error } = await supabase
        .from('families')
        .update({
          settings: updatedSettings,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.familyId)

      if (error) throw error

      toast.success('Notification settings saved!')
    } catch (error) {
      console.error('Error saving notification settings:', error)
      toast.error('Failed to save notification settings')
    } finally {
      setSavingNotificationSettings(false)
    }
  }

  // Test notification
  async function handleTestNotification() {
    const success = await showNotification('Test Notification', {
      body: 'This is how your reminders will appear!',
      tag: 'test-notification'
    })

    if (!success) {
      toast.error('Could not show notification. Check permissions.')
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
      {/* Header */}
      <div className="glass-card p-6">
        <h1 className="text-2xl font-bold text-white mb-1">Settings</h1>
        <p className="text-white/70">Configure family preferences and salary system</p>
      </div>

      {/* Time & Day Settings */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span>🕐</span> Time & Day Settings
        </h2>
        <p className="text-sm text-white/60 mb-6">
          Configure when your day starts and how time is displayed. This is useful if your schedule spans past midnight (e.g., 3 PM to 4 AM next day).
        </p>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm text-white/70 mb-2">Day Start Time</label>
              <select
                value={timeSettings.dayStartTime}
                onChange={(e) => setTimeSettings({ ...timeSettings, dayStartTime: e.target.value })}
                className="select-dark"
              >
                <option value="00:00">12:00 AM (Midnight)</option>
                <option value="01:00">1:00 AM</option>
                <option value="02:00">2:00 AM</option>
                <option value="03:00">3:00 AM</option>
                <option value="04:00">4:00 AM</option>
                <option value="05:00">5:00 AM</option>
                <option value="06:00">6:00 AM</option>
                <option value="07:00">7:00 AM</option>
                <option value="08:00">8:00 AM</option>
                <option value="09:00">9:00 AM</option>
                <option value="10:00">10:00 AM</option>
                <option value="11:00">11:00 AM</option>
                <option value="12:00">12:00 PM (Noon)</option>
              </select>
              <p className="text-xs text-white/50 mt-1">
                Tasks before this time will be counted as part of the previous day
              </p>
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-2">Time Format</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="timeFormat"
                    checked={!timeSettings.use24HourFormat}
                    onChange={() => setTimeSettings({ ...timeSettings, use24HourFormat: false })}
                    className="w-4 h-4"
                  />
                  <span className="text-white">12-hour (3:00 PM)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="timeFormat"
                    checked={timeSettings.use24HourFormat}
                    onChange={() => setTimeSettings({ ...timeSettings, use24HourFormat: true })}
                    className="w-4 h-4"
                  />
                  <span className="text-white">24-hour (15:00)</span>
                </label>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="p-4 bg-white/5 rounded-xl border border-white/10">
            <p className="text-sm text-white/70 mb-3">Preview</p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-white/60">Day starts at: </span>
                <span className="text-white font-medium">
                  {formatTime(timeSettings.dayStartTime, timeSettings.use24HourFormat)}
                </span>
              </div>
              <div>
                <span className="text-white/60">Day ends at: </span>
                <span className="text-white font-medium">
                  {formatTime(timeSettings.dayStartTime, timeSettings.use24HourFormat)} (next day)
                </span>
              </div>
            </div>
            <p className="text-xs text-white/40 mt-3">
              Example: If day starts at {formatTime(timeSettings.dayStartTime, timeSettings.use24HourFormat)},
              then a task at 2:00 AM on Dec 2nd belongs to Dec 1st's schedule.
            </p>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSaveTimeSettings}
              disabled={savingTimeSettings}
              className="px-6 py-3 bg-gradient-to-r from-neon-blue to-neon-purple text-white rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {savingTimeSettings ? 'Saving...' : 'Save Time Settings'}
            </button>
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span>🔔</span> Notifications
        </h2>

        {!isNotificationSupported() ? (
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
            <p className="text-yellow-400">
              Notifications are not supported in this browser. Try using Chrome, Firefox, or Edge.
            </p>
          </div>
        ) : notificationPermission === 'denied' ? (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
            <p className="text-red-400 mb-2">
              Notifications are blocked. To enable them:
            </p>
            <ol className="text-sm text-white/70 list-decimal list-inside space-y-1">
              <li>Click the lock/info icon in your browser's address bar</li>
              <li>Find "Notifications" and change it to "Allow"</li>
              <li>Refresh this page</li>
            </ol>
          </div>
        ) : notificationPermission !== 'granted' ? (
          <div className="space-y-4">
            <p className="text-white/70">
              Enable notifications to receive task reminders, approval alerts, and more.
            </p>
            <button
              onClick={handleEnableNotifications}
              className="px-6 py-3 bg-gradient-to-r from-neon-blue to-neon-purple text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
            >
              Enable Notifications
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Master toggle */}
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
              <div>
                <p className="font-medium text-white">Notifications</p>
                <p className="text-sm text-white/60">Receive reminders and alerts</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationSettings.enabled}
                  onChange={(e) => setNotificationSettings({ ...notificationSettings, enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
              </label>
            </div>

            <div className={`space-y-4 ${!notificationSettings.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
              {/* Reminder time */}
              <div>
                <label className="block text-sm text-white/70 mb-2">Reminder Time (minutes before task)</label>
                <select
                  value={notificationSettings.reminderMinutes}
                  onChange={(e) => setNotificationSettings({ ...notificationSettings, reminderMinutes: parseInt(e.target.value) })}
                  className="select-dark"
                >
                  <option value="5">5 minutes before</option>
                  <option value="10">10 minutes before</option>
                  <option value="15">15 minutes before</option>
                  <option value="30">30 minutes before</option>
                  <option value="60">1 hour before</option>
                </select>
              </div>

              {/* Notification types */}
              <div className="space-y-3">
                <p className="text-sm text-white/70">Notification Types</p>

                <label className="flex items-center justify-between p-3 bg-white/5 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">⏰</span>
                    <div>
                      <p className="text-white font-medium">Task Reminders</p>
                      <p className="text-xs text-white/50">Get reminded before scheduled tasks</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationSettings.taskReminders}
                    onChange={(e) => setNotificationSettings({ ...notificationSettings, taskReminders: e.target.checked })}
                    className="w-5 h-5 rounded"
                  />
                </label>

                <label className="flex items-center justify-between p-3 bg-white/5 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">✅</span>
                    <div>
                      <p className="text-white font-medium">Approval Alerts</p>
                      <p className="text-xs text-white/50">Notify child when tasks are approved/rejected</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationSettings.approvalAlerts}
                    onChange={(e) => setNotificationSettings({ ...notificationSettings, approvalAlerts: e.target.checked })}
                    className="w-5 h-5 rounded"
                  />
                </label>

                <label className="flex items-center justify-between p-3 bg-white/5 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">🔥</span>
                    <div>
                      <p className="text-white font-medium">Streak Warnings</p>
                      <p className="text-xs text-white/50">Remind to complete tasks to keep streak</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationSettings.streakWarnings}
                    onChange={(e) => setNotificationSettings({ ...notificationSettings, streakWarnings: e.target.checked })}
                    className="w-5 h-5 rounded"
                  />
                </label>

                <label className="flex items-center justify-between p-3 bg-white/5 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">👨‍👩‍👧</span>
                    <div>
                      <p className="text-white font-medium">Parent Alerts</p>
                      <p className="text-xs text-white/50">Notify parents when child completes tasks</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationSettings.parentAlerts}
                    onChange={(e) => setNotificationSettings({ ...notificationSettings, parentAlerts: e.target.checked })}
                    className="w-5 h-5 rounded"
                  />
                </label>
              </div>

              {/* Test button */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleTestNotification}
                  className="px-4 py-2 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors text-sm"
                >
                  Send Test Notification
                </button>
                <span className="text-xs text-white/50">Test how notifications will appear</span>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSaveNotificationSettings}
                disabled={savingNotificationSettings}
                className="px-6 py-3 bg-gradient-to-r from-neon-blue to-neon-purple text-white rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {savingNotificationSettings ? 'Saving...' : 'Save Notification Settings'}
              </button>
            </div>
          </div>
        )}
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
              className="select-dark"
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

      {/* Challenges Management */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <span>🏆</span> Challenges
          </h2>
          <button
            onClick={() => {
              setChallengeForm({
                quest_type: 'daily',
                title: '',
                description: '',
                target_value: 3,
                reward_stars: 5,
                reward_gems: 0
              })
              setShowChallengeModal(true)
            }}
            className="px-4 py-2 bg-gradient-to-r from-neon-blue to-neon-purple text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
          >
            + New Challenge
          </button>
        </div>

        {/* Quick Templates */}
        <div className="mb-6">
          <p className="text-sm text-white/70 mb-3">Quick Add from Templates:</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
            {DAILY_QUEST_TEMPLATES.slice(0, 4).map(template => (
              <button
                key={template.id}
                onClick={() => handleUseTemplate(template, 'daily')}
                className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl text-left hover:bg-blue-500/20 transition-colors"
              >
                <p className="text-white text-sm font-medium">{template.title}</p>
                <p className="text-blue-400 text-xs">Daily • +{template.rewardStars}⭐</p>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {WEEKLY_QUEST_TEMPLATES.slice(0, 4).map(template => (
              <button
                key={template.id}
                onClick={() => handleUseTemplate(template, 'weekly')}
                className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl text-left hover:bg-purple-500/20 transition-colors"
              >
                <p className="text-white text-sm font-medium">{template.title}</p>
                <p className="text-purple-400 text-xs">Weekly • +{template.rewardStars}⭐ +{template.rewardGems}💎</p>
              </button>
            ))}
          </div>
        </div>

        {/* Active Challenges */}
        <div>
          <p className="text-sm text-white/70 mb-3">Active Challenges ({activeQuests.filter(q => !q.is_completed).length})</p>
          {activeQuests.length === 0 ? (
            <div className="text-center py-8 text-white/50">
              <p>No active challenges</p>
              <p className="text-sm">Create one using the templates above or click "New Challenge"</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeQuests.map(quest => {
                const progress = quest.target_value > 0
                  ? Math.min((quest.current_value / quest.target_value) * 100, 100)
                  : 0

                return (
                  <div
                    key={quest.id}
                    className={`p-4 rounded-xl border ${
                      quest.is_completed
                        ? 'bg-green-500/10 border-green-500/30'
                        : 'bg-white/5 border-white/10'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className={`font-medium ${quest.is_completed ? 'text-green-400' : 'text-white'}`}>
                            {quest.title}
                          </p>
                          <span className={`px-2 py-0.5 rounded-full text-xs ${
                            quest.quest_type === 'daily' ? 'bg-blue-500/20 text-blue-400' :
                            quest.quest_type === 'weekly' ? 'bg-purple-500/20 text-purple-400' :
                            'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {quest.quest_type}
                          </span>
                          {quest.is_completed && (
                            <span className="text-green-400 text-xs">✓ Complete</span>
                          )}
                        </div>
                        <p className="text-sm text-white/60">{quest.description}</p>
                      </div>
                      {!quest.is_completed && (
                        <button
                          onClick={() => handleDeleteChallenge(quest.id)}
                          className="text-red-400/60 hover:text-red-400 p-1"
                          title="Delete challenge"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    <div className="progress-bar h-2 mb-2">
                      <div
                        className={`h-full rounded-full transition-all ${
                          quest.is_completed ? 'bg-green-500' : 'bg-gradient-to-r from-neon-blue to-neon-purple'
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/60">
                        {quest.current_value} / {quest.target_value}
                      </span>
                      <div className="flex gap-2">
                        {quest.reward_stars > 0 && (
                          <span className="text-yellow-400">+{quest.reward_stars}⭐</span>
                        )}
                        {quest.reward_gems > 0 && (
                          <span className="text-purple-400">+{quest.reward_gems}💎</span>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-white/40 mt-2">
                      Ends: {new Date(quest.end_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
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

      {/* Challenge Creation Modal */}
      {showChallengeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="glass-card p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-white mb-4">Create Challenge</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-white/70 mb-1">Challenge Type</label>
                <select
                  value={challengeForm.quest_type}
                  onChange={(e) => setChallengeForm({ ...challengeForm, quest_type: e.target.value })}
                  className="select-dark"
                >
                  <option value="daily">Daily (ends today)</option>
                  <option value="weekly">Weekly (7 days)</option>
                  <option value="special">Special (30 days)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-1">Title *</label>
                <input
                  type="text"
                  value={challengeForm.title}
                  onChange={(e) => setChallengeForm({ ...challengeForm, title: e.target.value })}
                  placeholder="e.g., Complete 5 tasks"
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-neon-blue"
                />
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-1">Description</label>
                <input
                  type="text"
                  value={challengeForm.description}
                  onChange={(e) => setChallengeForm({ ...challengeForm, description: e.target.value })}
                  placeholder="e.g., Complete tasks to earn rewards"
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-neon-blue"
                />
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-1">Target (goal number)</label>
                <input
                  type="number"
                  value={challengeForm.target_value}
                  onChange={(e) => setChallengeForm({ ...challengeForm, target_value: parseInt(e.target.value) || 1 })}
                  min="1"
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-neon-blue"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-white/70 mb-1">Star Reward</label>
                  <input
                    type="number"
                    value={challengeForm.reward_stars}
                    onChange={(e) => setChallengeForm({ ...challengeForm, reward_stars: parseInt(e.target.value) || 0 })}
                    min="0"
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-neon-blue"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/70 mb-1">Gem Reward</label>
                  <input
                    type="number"
                    value={challengeForm.reward_gems}
                    onChange={(e) => setChallengeForm({ ...challengeForm, reward_gems: parseInt(e.target.value) || 0 })}
                    min="0"
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-neon-blue"
                  />
                </div>
              </div>

              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                <p className="text-blue-400 text-sm">
                  Challenge progress updates when tasks are <strong>approved</strong> by a parent.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowChallengeModal(false)}
                  disabled={saving}
                  className="flex-1 px-4 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateChallenge}
                  disabled={saving}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-neon-blue to-neon-purple text-white rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {saving ? 'Creating...' : 'Create Challenge'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
