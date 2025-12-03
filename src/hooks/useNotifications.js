// Hook for managing notifications in Rewardy
import { useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import {
  showNotification,
  NotificationTemplates,
  scheduleTaskReminders,
  cancelAllScheduledNotifications,
  getNotificationPermission,
  getNotificationSettings
} from '../services/notificationService'
import { getTimeSettings } from '../lib/timeSettings'

// Hook for child view notifications (reminders + approval alerts)
export function useChildNotifications(childId, familyId, tasks = []) {
  const subscriptionRef = useRef(null)
  const settingsRef = useRef({ notifications: {}, time: {} })

  // Load settings
  useEffect(() => {
    if (!familyId) return

    async function loadSettings() {
      const { data: family } = await supabase
        .from('families')
        .select('settings')
        .eq('id', familyId)
        .single()

      if (family?.settings) {
        settingsRef.current = {
          notifications: getNotificationSettings(family.settings),
          time: getTimeSettings(family.settings)
        }
      }
    }

    loadSettings()
  }, [familyId])

  // Schedule task reminders when tasks change
  useEffect(() => {
    if (!tasks.length) return
    if (getNotificationPermission() !== 'granted') return

    const { notifications, time } = settingsRef.current
    if (!notifications.enabled || !notifications.taskReminders) return

    // Cancel previous schedules and set new ones
    cancelAllScheduledNotifications()
    scheduleTaskReminders(tasks, notifications.reminderMinutes, time.dayStartTime)

    return () => {
      cancelAllScheduledNotifications()
    }
  }, [tasks])

  // Subscribe to real-time task status updates (for approval/rejection alerts)
  useEffect(() => {
    if (!childId) return
    if (getNotificationPermission() !== 'granted') return

    // Subscribe to task status changes
    const channel = supabase
      .channel(`task-updates-${childId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'daily_tasks',
          filter: `child_id=eq.${childId}`
        },
        (payload) => {
          const { notifications } = settingsRef.current
          if (!notifications.enabled || !notifications.approvalAlerts) return

          const task = payload.new
          const oldTask = payload.old

          // Check if status changed to approved or rejected
          if (oldTask.status !== task.status) {
            if (task.status === 'approved') {
              const notification = NotificationTemplates.taskApproved(task)
              showNotification(notification.title, notification)
            } else if (task.status === 'rejected') {
              const notification = NotificationTemplates.taskRejected(task, task.rejection_reason)
              showNotification(notification.title, notification)
            }
          }
        }
      )
      .subscribe()

    subscriptionRef.current = channel

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current)
      }
    }
  }, [childId])

  return null
}

// Hook for parent view notifications (pending task alerts)
export function useParentNotifications(familyId, childId) {
  const subscriptionRef = useRef(null)
  const settingsRef = useRef({ notifications: {}, childName: '' })

  // Load settings and child name
  useEffect(() => {
    if (!familyId || !childId) return

    async function loadSettings() {
      const [familyResult, childResult] = await Promise.all([
        supabase.from('families').select('settings').eq('id', familyId).single(),
        supabase.from('child_profiles').select('display_name').eq('id', childId).single()
      ])

      settingsRef.current = {
        notifications: getNotificationSettings(familyResult.data?.settings || {}),
        childName: childResult.data?.display_name || 'Your child'
      }
    }

    loadSettings()
  }, [familyId, childId])

  // Subscribe to real-time task completions
  useEffect(() => {
    if (!childId) return
    if (getNotificationPermission() !== 'granted') return

    const channel = supabase
      .channel(`parent-alerts-${childId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'daily_tasks',
          filter: `child_id=eq.${childId}`
        },
        (payload) => {
          const { notifications, childName } = settingsRef.current
          if (!notifications.enabled || !notifications.parentAlerts) return

          const task = payload.new
          const oldTask = payload.old

          // Notify parent when child completes a task
          if (oldTask.status === 'pending' && task.status === 'completed') {
            const notification = NotificationTemplates.taskCompleted(childName, task)
            showNotification(notification.title, notification)
          }
        }
      )
      .subscribe()

    subscriptionRef.current = channel

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current)
      }
    }
  }, [childId])

  return null
}

// Function to send streak warning notification
export async function sendStreakWarning(tasksRemaining) {
  if (getNotificationPermission() !== 'granted') return

  const notification = NotificationTemplates.streakWarning(tasksRemaining)
  await showNotification(notification.title, notification)
}

// Function to check and send streak warning if needed
export async function checkAndSendStreakWarning(childId, familyId) {
  if (getNotificationPermission() !== 'granted') return

  // Load settings
  const { data: family } = await supabase
    .from('families')
    .select('settings')
    .eq('id', familyId)
    .single()

  const notifications = getNotificationSettings(family?.settings || {})
  if (!notifications.enabled || !notifications.streakWarnings) return

  // Get today's tasks
  const today = new Date().toISOString().split('T')[0]
  const { data: tasks } = await supabase
    .from('daily_tasks')
    .select('status')
    .eq('child_id', childId)
    .eq('task_date', today)
    .eq('is_bonus', false)

  if (!tasks || tasks.length === 0) return

  const pendingTasks = tasks.filter(t => t.status === 'pending').length
  const completedOrApproved = tasks.filter(t => t.status === 'completed' || t.status === 'approved').length

  // If there are pending tasks and not all are done, send warning
  if (pendingTasks > 0 && completedOrApproved > 0) {
    await sendStreakWarning(pendingTasks)
  }
}
