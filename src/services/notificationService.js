// Notification Service for Rewardy
// Handles Web Push notifications, permissions, and scheduling

import { supabase } from '../lib/supabase'

// Check if notifications are supported
export function isNotificationSupported() {
  return 'Notification' in window && 'serviceWorker' in navigator
}

// Get current permission status
export function getNotificationPermission() {
  if (!isNotificationSupported()) return 'unsupported'
  return Notification.permission // 'granted', 'denied', or 'default'
}

// Request notification permission
export async function requestNotificationPermission() {
  if (!isNotificationSupported()) {
    return { success: false, error: 'Notifications not supported' }
  }

  try {
    const permission = await Notification.requestPermission()
    return { success: permission === 'granted', permission }
  } catch (error) {
    console.error('Error requesting notification permission:', error)
    return { success: false, error: error.message }
  }
}

// Show a local notification immediately
export async function showNotification(title, options = {}) {
  if (getNotificationPermission() !== 'granted') {
    console.warn('Notification permission not granted')
    return false
  }

  try {
    // Try to use service worker for better reliability
    const registration = await navigator.serviceWorker.ready
    await registration.showNotification(title, {
      icon: '/Picture1.png',
      badge: '/Picture1.png',
      vibrate: [200, 100, 200],
      requireInteraction: false,
      ...options
    })
    return true
  } catch (error) {
    // Fallback to regular notification
    try {
      new Notification(title, {
        icon: '/Picture1.png',
        ...options
      })
      return true
    } catch (e) {
      console.error('Error showing notification:', e)
      return false
    }
  }
}

// Notification types with templates
export const NotificationTemplates = {
  // Child notifications
  taskReminder: (task, minutesBefore) => ({
    title: `${getCategoryEmoji(task.category)} ${task.title}`,
    body: minutesBefore > 0
      ? `Coming up in ${minutesBefore} minutes!`
      : `It's time for your quest!`,
    tag: `reminder-${task.id}`,
    data: { type: 'task-reminder', taskId: task.id, url: '/child/quests' }
  }),

  taskApproved: (task) => ({
    title: `⭐ Great job!`,
    body: `"${task.title}" approved! You earned ${task.star_value} stars!`,
    tag: `approved-${task.id}`,
    data: { type: 'task-approved', taskId: task.id, url: '/child/quests' }
  }),

  taskRejected: (task, reason) => ({
    title: `📝 Try again!`,
    body: reason || `"${task.title}" needs another attempt.`,
    tag: `rejected-${task.id}`,
    data: { type: 'task-rejected', taskId: task.id, url: '/child/quests' }
  }),

  streakWarning: (tasksRemaining) => ({
    title: `🔥 Keep your streak!`,
    body: `Complete ${tasksRemaining} more task${tasksRemaining > 1 ? 's' : ''} to maintain your streak!`,
    tag: 'streak-warning',
    data: { type: 'streak-warning', url: '/child/quests' }
  }),

  // Parent notifications
  taskCompleted: (childName, task) => ({
    title: `✅ ${childName} completed a task`,
    body: `"${task.title}" is waiting for your approval`,
    tag: `pending-${task.id}`,
    data: { type: 'task-pending', taskId: task.id, url: '/dashboard/tasks' }
  }),

  dailySummary: (childName, completed, total) => ({
    title: `📊 Daily Summary for ${childName}`,
    body: `${completed}/${total} tasks completed today`,
    tag: 'daily-summary',
    data: { type: 'daily-summary', url: '/dashboard/analytics' }
  })
}

function getCategoryEmoji(category) {
  const emojis = {
    academic: '📚',
    chores: '🧹',
    health: '💪',
    creative: '🎨',
    social: '👥',
    other: '📋'
  }
  return emojis[category] || '📋'
}

// Schedule a local notification (client-side, works when app is open)
const scheduledNotifications = new Map()

export function scheduleNotification(id, triggerTime, title, options) {
  // Cancel existing if any
  cancelScheduledNotification(id)

  const now = Date.now()
  const delay = triggerTime - now

  if (delay <= 0) {
    // Already past, show immediately
    showNotification(title, options)
    return
  }

  const timeoutId = setTimeout(() => {
    showNotification(title, options)
    scheduledNotifications.delete(id)
  }, delay)

  scheduledNotifications.set(id, timeoutId)
}

export function cancelScheduledNotification(id) {
  const timeoutId = scheduledNotifications.get(id)
  if (timeoutId) {
    clearTimeout(timeoutId)
    scheduledNotifications.delete(id)
  }
}

export function cancelAllScheduledNotifications() {
  scheduledNotifications.forEach((timeoutId) => clearTimeout(timeoutId))
  scheduledNotifications.clear()
}

// Schedule task reminders for today's tasks
export function scheduleTaskReminders(tasks, reminderMinutes = 15, dayStartTime = '04:00') {
  const now = new Date()

  tasks.forEach(task => {
    if (!task.scheduled_time || task.status !== 'pending') return

    // Parse scheduled time
    const [hours, minutes] = task.scheduled_time.split(':').map(Number)

    // Create reminder time (today at task time minus reminder minutes)
    const taskTime = new Date(now)
    taskTime.setHours(hours, minutes, 0, 0)

    // Handle late-night tasks (after midnight but before day start)
    const [dayStartHour] = dayStartTime.split(':').map(Number)
    if (hours < dayStartHour) {
      // This is a late-night task, so it's for tomorrow's calendar day
      taskTime.setDate(taskTime.getDate() + 1)
    }

    const reminderTime = new Date(taskTime.getTime() - reminderMinutes * 60 * 1000)

    // Only schedule if reminder time is in the future
    if (reminderTime > now) {
      const notification = NotificationTemplates.taskReminder(task, reminderMinutes)
      scheduleNotification(
        `reminder-${task.id}`,
        reminderTime.getTime(),
        notification.title,
        notification
      )
    }

    // Also schedule "it's time" notification
    if (taskTime > now) {
      const notification = NotificationTemplates.taskReminder(task, 0)
      scheduleNotification(
        `time-${task.id}`,
        taskTime.getTime(),
        notification.title,
        notification
      )
    }
  })
}

// Subscribe to push notifications (for server-side push)
export async function subscribeToPush(userId, childId = null) {
  if (!isNotificationSupported()) {
    return { success: false, error: 'Push not supported' }
  }

  try {
    const registration = await navigator.serviceWorker.ready

    // Check if already subscribed
    let subscription = await registration.pushManager.getSubscription()

    if (!subscription) {
      // Create new subscription
      // Note: In production, you'd get this from your server
      const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY

      if (!vapidPublicKey) {
        console.warn('VAPID public key not configured, using local notifications only')
        return { success: true, local: true }
      }

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      })
    }

    // Save subscription to database
    const subscriptionData = subscription.toJSON()
    const { error } = await supabase
      .from('notification_subscriptions')
      .upsert({
        user_id: userId,
        child_id: childId,
        endpoint: subscriptionData.endpoint,
        p256dh: subscriptionData.keys.p256dh,
        auth: subscriptionData.keys.auth,
        device_name: getDeviceName(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'endpoint'
      })

    if (error) {
      console.error('Error saving subscription:', error)
      return { success: false, error: error.message }
    }

    return { success: true, subscription }
  } catch (error) {
    console.error('Error subscribing to push:', error)
    return { success: false, error: error.message }
  }
}

// Unsubscribe from push notifications
export async function unsubscribeFromPush() {
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (subscription) {
      // Remove from database
      await supabase
        .from('notification_subscriptions')
        .delete()
        .eq('endpoint', subscription.endpoint)

      // Unsubscribe from push
      await subscription.unsubscribe()
    }

    return { success: true }
  } catch (error) {
    console.error('Error unsubscribing:', error)
    return { success: false, error: error.message }
  }
}

// Helper to convert VAPID key
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

// Get device name for subscription identification
function getDeviceName() {
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/.test(ua)) return 'iOS Device'
  if (/Android/.test(ua)) return 'Android Device'
  if (/Windows/.test(ua)) return 'Windows PC'
  if (/Mac/.test(ua)) return 'Mac'
  if (/Linux/.test(ua)) return 'Linux'
  return 'Unknown Device'
}

// Default notification settings
export const DEFAULT_NOTIFICATION_SETTINGS = {
  enabled: false,
  taskReminders: true,
  reminderMinutes: 15,
  approvalAlerts: true,
  streakWarnings: true,
  parentAlerts: true,
  dailySummary: false,
  dailySummaryTime: '20:00'
}

// Get notification settings from family settings
export function getNotificationSettings(familySettings = {}) {
  return {
    ...DEFAULT_NOTIFICATION_SETTINGS,
    ...familySettings.notifications
  }
}
