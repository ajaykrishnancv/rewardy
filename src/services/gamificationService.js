import { supabase } from '../lib/supabase'

// Helper to get local date string (YYYY-MM-DD) without timezone issues
function getLocalDateString(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// =====================================================
// QUEST GENERATION
// =====================================================

const DAILY_QUEST_TEMPLATES = [
  {
    title: 'Task Tackler',
    description: 'Complete {target} tasks today',
    targetRange: [3, 5],
    rewardStars: 5,
    rewardGems: 0
  },
  {
    title: 'Star Hunter',
    description: 'Earn {target} stars today',
    targetRange: [10, 20],
    rewardStars: 3,
    rewardGems: 1
  },
  {
    title: 'Early Bird',
    description: 'Complete {target} tasks before noon',
    targetRange: [2, 3],
    rewardStars: 5,
    rewardGems: 0
  },
  {
    title: 'Perfect Start',
    description: 'Complete your first task within 30 minutes of waking',
    targetRange: [1, 1],
    rewardStars: 3,
    rewardGems: 0
  },
  {
    title: 'No Skips',
    description: 'Complete all mandatory tasks today',
    targetRange: [1, 1],
    rewardStars: 10,
    rewardGems: 1
  }
]

const WEEKLY_QUEST_TEMPLATES = [
  {
    title: 'Weekly Warrior',
    description: 'Complete {target} tasks this week',
    targetRange: [15, 25],
    rewardStars: 20,
    rewardGems: 3
  },
  {
    title: 'Savings Star',
    description: 'Save {target} stars to your savings',
    targetRange: [20, 50],
    rewardStars: 10,
    rewardGems: 2
  },
  {
    title: 'Perfect Week',
    description: 'Get all tasks approved for {target} days',
    targetRange: [5, 7],
    rewardStars: 25,
    rewardGems: 5
  },
  {
    title: 'Streak Builder',
    description: 'Maintain a {target} day streak',
    targetRange: [5, 7],
    rewardStars: 15,
    rewardGems: 2
  },
  {
    title: 'Star Collector',
    description: 'Earn {target} total stars this week',
    targetRange: [50, 100],
    rewardStars: 20,
    rewardGems: 3
  }
]

function getRandomTemplate(templates) {
  return templates[Math.floor(Math.random() * templates.length)]
}

function getRandomInRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export async function generateDailyQuests(childId) {
  const today = getLocalDateString()

  // Check if daily quests already exist for today
  const { data: existingQuests } = await supabase
    .from('quests')
    .select('id')
    .eq('child_id', childId)
    .eq('quest_type', 'daily')
    .eq('start_date', today)

  if (existingQuests && existingQuests.length > 0) {
    return existingQuests
  }

  // Generate 2-3 daily quests
  const numQuests = getRandomInRange(2, 3)
  const usedTemplates = new Set()
  const newQuests = []

  for (let i = 0; i < numQuests; i++) {
    let template
    do {
      template = getRandomTemplate(DAILY_QUEST_TEMPLATES)
    } while (usedTemplates.has(template.title) && usedTemplates.size < DAILY_QUEST_TEMPLATES.length)

    usedTemplates.add(template.title)

    const target = getRandomInRange(template.targetRange[0], template.targetRange[1])

    newQuests.push({
      child_id: childId,
      quest_type: 'daily',
      title: template.title,
      description: template.description.replace('{target}', target),
      target_value: target,
      current_value: 0,
      reward_stars: template.rewardStars,
      reward_gems: template.rewardGems,
      start_date: today,
      end_date: today,
      is_completed: false
    })
  }

  const { data, error } = await supabase
    .from('quests')
    .insert(newQuests)
    .select()

  if (error) {
    console.error('Error generating daily quests:', error)
    return []
  }

  return data
}

export async function generateWeeklyQuests(childId) {
  const today = new Date()
  const dayOfWeek = today.getDay()

  // Calculate start of week (Sunday)
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - dayOfWeek)
  const weekStartStr = getLocalDateString(weekStart)

  // Calculate end of week (Saturday)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  const weekEndStr = getLocalDateString(weekEnd)

  // Check if weekly quests already exist for this week
  const { data: existingQuests } = await supabase
    .from('quests')
    .select('id')
    .eq('child_id', childId)
    .eq('quest_type', 'weekly')
    .eq('start_date', weekStartStr)

  if (existingQuests && existingQuests.length > 0) {
    return existingQuests
  }

  // Generate 2 weekly quests
  const usedTemplates = new Set()
  const newQuests = []

  for (let i = 0; i < 2; i++) {
    let template
    do {
      template = getRandomTemplate(WEEKLY_QUEST_TEMPLATES)
    } while (usedTemplates.has(template.title) && usedTemplates.size < WEEKLY_QUEST_TEMPLATES.length)

    usedTemplates.add(template.title)

    const target = getRandomInRange(template.targetRange[0], template.targetRange[1])

    newQuests.push({
      child_id: childId,
      quest_type: 'weekly',
      title: template.title,
      description: template.description.replace('{target}', target),
      target_value: target,
      current_value: 0,
      reward_stars: template.rewardStars,
      reward_gems: template.rewardGems,
      start_date: weekStartStr,
      end_date: weekEndStr,
      is_completed: false
    })
  }

  const { data, error } = await supabase
    .from('quests')
    .insert(newQuests)
    .select()

  if (error) {
    console.error('Error generating weekly quests:', error)
    return []
  }

  return data
}

// =====================================================
// QUEST PROGRESS TRACKING
// =====================================================

export async function updateQuestProgress(childId, eventType, eventData = {}) {
  const today = getLocalDateString()

  // Get active quests
  const { data: activeQuests } = await supabase
    .from('quests')
    .select('*')
    .eq('child_id', childId)
    .eq('is_completed', false)
    .lte('start_date', today)
    .gte('end_date', today)

  if (!activeQuests || activeQuests.length === 0) return []

  const completedQuests = []

  for (const quest of activeQuests) {
    let newValue = quest.current_value
    let shouldUpdate = false

    switch (eventType) {
      case 'task_completed':
        if (quest.title === 'Task Tackler' || quest.title === 'Weekly Warrior') {
          newValue += 1
          shouldUpdate = true
        }
        if (quest.title === 'Early Bird' && eventData.completedBeforeNoon) {
          newValue += 1
          shouldUpdate = true
        }
        if (quest.title === 'No Skips' || quest.title === 'Perfect Week') {
          // These are checked differently - see below
        }
        break

      case 'task_approved':
        if (quest.title === 'Star Hunter' || quest.title === 'Star Collector') {
          newValue += eventData.starsEarned || 0
          shouldUpdate = true
        }
        break

      case 'stars_saved':
        if (quest.title === 'Savings Star') {
          newValue += eventData.amount || 0
          shouldUpdate = true
        }
        break

      case 'streak_updated':
        if (quest.title === 'Streak Builder') {
          newValue = eventData.currentStreak || 0
          shouldUpdate = true
        }
        break

      case 'daily_check':
        // Check if all mandatory tasks are done
        if (quest.title === 'No Skips') {
          const { data: tasks } = await supabase
            .from('daily_tasks')
            .select('status, is_mandatory')
            .eq('child_id', childId)
            .eq('task_date', today)
            .eq('is_mandatory', true)

          const allMandatoryDone = tasks && tasks.length > 0 &&
            tasks.every(t => t.status === 'approved')

          if (allMandatoryDone) {
            newValue = 1
            shouldUpdate = true
          }
        }

        // Check perfect day for Perfect Week quest
        if (quest.title === 'Perfect Week') {
          const { data: tasks } = await supabase
            .from('daily_tasks')
            .select('status')
            .eq('child_id', childId)
            .eq('task_date', today)

          const allApproved = tasks && tasks.length > 0 &&
            tasks.every(t => t.status === 'approved')

          if (allApproved && !eventData.alreadyCountedToday) {
            newValue += 1
            shouldUpdate = true
          }
        }
        break
    }

    if (shouldUpdate) {
      const isCompleted = newValue >= quest.target_value

      const { error } = await supabase
        .from('quests')
        .update({
          current_value: newValue,
          is_completed: isCompleted,
          completed_at: isCompleted ? new Date().toISOString() : null
        })
        .eq('id', quest.id)

      if (!error && isCompleted) {
        completedQuests.push(quest)
        // Award rewards for completed quest
        await awardQuestRewards(childId, quest)
      }
    }
  }

  return completedQuests
}

async function awardQuestRewards(childId, quest) {
  if (quest.reward_stars > 0) {
    await supabase.rpc('award_stars', {
      p_child_id: childId,
      p_amount: quest.reward_stars,
      p_to_wallet: true,
      p_description: `Quest completed: ${quest.title}`,
      p_reference_type: 'quest',
      p_reference_id: quest.id
    })
  }

  if (quest.reward_gems > 0) {
    await supabase.rpc('award_gems', {
      p_child_id: childId,
      p_amount: quest.reward_gems,
      p_description: `Quest completed: ${quest.title}`,
      p_reference_type: 'quest',
      p_reference_id: quest.id
    })
  }
}

// =====================================================
// ACHIEVEMENT CHECKING
// =====================================================

export async function checkAchievements(childId) {
  // Get all achievements and which ones are unlocked
  const { data: allAchievements } = await supabase
    .from('achievements')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')

  const { data: unlockedAchievements } = await supabase
    .from('unlocked_achievements')
    .select('achievement_id')
    .eq('child_id', childId)

  const unlockedIds = new Set((unlockedAchievements || []).map(ua => ua.achievement_id))

  // Get child stats for checking criteria
  const stats = await getChildStats(childId)

  const newlyUnlocked = []

  for (const achievement of allAchievements || []) {
    if (unlockedIds.has(achievement.id)) continue

    const criteria = achievement.criteria
    let isUnlocked = false

    switch (criteria.type) {
      case 'stars_earned':
        isUnlocked = stats.lifetimeStarsEarned >= criteria.value
        break
      case 'tasks_completed':
        isUnlocked = stats.tasksCompleted >= criteria.value
        break
      case 'streak':
        isUnlocked = stats.currentStreak >= criteria.value
        break
      case 'savings':
        isUnlocked = stats.savingsBalance >= criteria.value
        break
      case 'rewards_redeemed':
        isUnlocked = stats.rewardsRedeemed >= criteria.value
        break
      case 'goals_completed':
        isUnlocked = stats.goalsCompleted >= criteria.value
        break
      case 'gems_earned':
        isUnlocked = stats.lifetimeGemsEarned >= criteria.value
        break
    }

    if (isUnlocked) {
      // Unlock the achievement
      const { error } = await supabase
        .from('unlocked_achievements')
        .insert({
          child_id: childId,
          achievement_id: achievement.id
        })

      if (!error) {
        newlyUnlocked.push(achievement)

        // Award gems for achievement
        if (achievement.reward_gems > 0) {
          await supabase.rpc('award_gems', {
            p_child_id: childId,
            p_amount: achievement.reward_gems,
            p_description: `Achievement unlocked: ${achievement.name}`,
            p_reference_type: 'achievement',
            p_reference_id: achievement.id
          })
        }
      }
    }
  }

  return newlyUnlocked
}

async function getChildStats(childId) {
  // Get currency balance
  const { data: balance } = await supabase
    .from('currency_balances')
    .select('*')
    .eq('child_id', childId)
    .single()

  // Get tasks completed count
  const { count: tasksCompleted } = await supabase
    .from('daily_tasks')
    .select('*', { count: 'exact', head: true })
    .eq('child_id', childId)
    .eq('status', 'approved')

  // Get streak
  const { data: streak } = await supabase
    .from('streaks')
    .select('current_streak, longest_streak')
    .eq('child_id', childId)
    .eq('streak_type', 'daily')
    .single()

  // Get rewards redeemed count
  const { count: rewardsRedeemed } = await supabase
    .from('redemptions')
    .select('*', { count: 'exact', head: true })
    .eq('child_id', childId)
    .in('status', ['approved', 'fulfilled'])

  // Get goals completed count
  const { count: goalsCompleted } = await supabase
    .from('savings_goals')
    .select('*', { count: 'exact', head: true })
    .eq('child_id', childId)
    .eq('is_completed', true)

  return {
    lifetimeStarsEarned: balance?.lifetime_stars_earned || 0,
    lifetimeGemsEarned: balance?.lifetime_gems_earned || 0,
    savingsBalance: balance?.savings_stars || 0,
    walletBalance: balance?.wallet_stars || 0,
    gemsBalance: balance?.gems || 0,
    tasksCompleted: tasksCompleted || 0,
    currentStreak: streak?.current_streak || 0,
    longestStreak: streak?.longest_streak || 0,
    rewardsRedeemed: rewardsRedeemed || 0,
    goalsCompleted: goalsCompleted || 0
  }
}

// =====================================================
// STREAK TRACKING
// =====================================================

export async function updateStreak(childId) {
  const today = getLocalDateString()

  // Check if any task was completed today
  const { data: todaysTasks } = await supabase
    .from('daily_tasks')
    .select('status')
    .eq('child_id', childId)
    .eq('task_date', today)
    .in('status', ['completed', 'approved'])

  if (!todaysTasks || todaysTasks.length === 0) {
    return null
  }

  // Get current streak record
  const { data: existingStreak } = await supabase
    .from('streaks')
    .select('*')
    .eq('child_id', childId)
    .eq('streak_type', 'daily')
    .single()

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = getLocalDateString(yesterday)

  if (!existingStreak) {
    // Create new streak
    const { data } = await supabase
      .from('streaks')
      .insert({
        child_id: childId,
        streak_type: 'daily',
        current_streak: 1,
        longest_streak: 1,
        last_activity_date: today
      })
      .select()
      .single()

    return data
  }

  // Already updated today
  if (existingStreak.last_activity_date === today) {
    return existingStreak
  }

  let newStreak

  // Check if last activity was yesterday (continue streak)
  if (existingStreak.last_activity_date === yesterdayStr) {
    newStreak = existingStreak.current_streak + 1
  } else {
    // Streak broken, start fresh
    newStreak = 1
  }

  const newLongest = Math.max(newStreak, existingStreak.longest_streak)

  const { data } = await supabase
    .from('streaks')
    .update({
      current_streak: newStreak,
      longest_streak: newLongest,
      last_activity_date: today,
      updated_at: new Date().toISOString()
    })
    .eq('id', existingStreak.id)
    .select()
    .single()

  // Update quest progress for streak
  await updateQuestProgress(childId, 'streak_updated', { currentStreak: newStreak })

  return data
}

// =====================================================
// SKILL/SUBJECT PROGRESS
// =====================================================

export async function updateSkillProgress(childId, category, pointsEarned) {
  const familyId = await getChildFamilyId(childId)
  if (!familyId) return null

  // Find or create subject
  let { data: subject } = await supabase
    .from('subjects')
    .select('*')
    .eq('family_id', familyId)
    .eq('name', category)
    .single()

  if (!subject) {
    // Create default subject
    const { data: newSubject } = await supabase
      .from('subjects')
      .insert({
        family_id: familyId,
        name: category,
        icon: getCategoryIcon(category),
        color: getCategoryColor(category)
      })
      .select()
      .single()

    subject = newSubject
  }

  if (!subject) return null

  // Get or create skill progress
  let { data: progress } = await supabase
    .from('skill_progress')
    .select('*')
    .eq('child_id', childId)
    .eq('subject_id', subject.id)
    .single()

  if (!progress) {
    const { data: newProgress } = await supabase
      .from('skill_progress')
      .insert({
        child_id: childId,
        subject_id: subject.id,
        total_points: pointsEarned,
        current_level: 1
      })
      .select()
      .single()

    return newProgress
  }

  // Update points and calculate level
  const newTotalPoints = progress.total_points + pointsEarned
  const newLevel = calculateLevel(newTotalPoints)
  const leveledUp = newLevel > progress.current_level

  const { data: updatedProgress } = await supabase
    .from('skill_progress')
    .update({
      total_points: newTotalPoints,
      current_level: newLevel,
      updated_at: new Date().toISOString()
    })
    .eq('id', progress.id)
    .select()
    .single()

  return { ...updatedProgress, leveledUp, previousLevel: progress.current_level }
}

function calculateLevel(totalPoints) {
  // Level formula: each level requires more points
  // Level 1: 0 points
  // Level 2: 10 points
  // Level 3: 25 points
  // Level 4: 50 points
  // Level 5: 100 points
  // etc.
  const thresholds = [0, 10, 25, 50, 100, 175, 275, 400, 550, 750, 1000]

  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (totalPoints >= thresholds[i]) {
      return i + 1
    }
  }
  return 1
}

function getPointsForLevel(level) {
  const thresholds = [0, 10, 25, 50, 100, 175, 275, 400, 550, 750, 1000]
  return thresholds[level - 1] || thresholds[thresholds.length - 1]
}

export function getPointsToNextLevel(totalPoints, currentLevel) {
  const thresholds = [0, 10, 25, 50, 100, 175, 275, 400, 550, 750, 1000]
  const nextLevelPoints = thresholds[currentLevel] || thresholds[thresholds.length - 1]
  return nextLevelPoints - totalPoints
}

async function getChildFamilyId(childId) {
  const { data } = await supabase
    .from('child_profiles')
    .select('family_id')
    .eq('id', childId)
    .single()

  return data?.family_id
}

function getCategoryIcon(category) {
  const icons = {
    academic: '📚',
    chores: '🧹',
    health: '💪',
    creative: '🎨',
    social: '👥',
    other: '📋'
  }
  return icons[category] || '📋'
}

function getCategoryColor(category) {
  const colors = {
    academic: 'blue',
    chores: 'green',
    health: 'red',
    creative: 'purple',
    social: 'yellow',
    other: 'gray'
  }
  return colors[category] || 'gray'
}

// =====================================================
// EXPIRE OLD QUESTS
// =====================================================

export async function expireOldQuests(childId) {
  const today = getLocalDateString()

  // Mark expired quests as completed (but not achieved)
  const { data } = await supabase
    .from('quests')
    .update({
      is_completed: true
    })
    .eq('child_id', childId)
    .eq('is_completed', false)
    .lt('end_date', today)
    .select()

  return data || []
}
