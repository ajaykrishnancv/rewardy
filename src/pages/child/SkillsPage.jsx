import { useState, useEffect } from 'react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { getPointsToNextLevel } from '../../services/gamificationService'
import toast from 'react-hot-toast'

const LEVEL_TITLES = {
  1: 'Beginner',
  2: 'Apprentice',
  3: 'Learner',
  4: 'Student',
  5: 'Skilled',
  6: 'Proficient',
  7: 'Expert',
  8: 'Master',
  9: 'Grandmaster',
  10: 'Legend'
}

const LEVEL_COLORS = {
  1: 'from-gray-500 to-gray-600',
  2: 'from-green-500 to-green-600',
  3: 'from-blue-500 to-blue-600',
  4: 'from-purple-500 to-purple-600',
  5: 'from-yellow-500 to-yellow-600',
  6: 'from-orange-500 to-orange-600',
  7: 'from-red-500 to-red-600',
  8: 'from-pink-500 to-pink-600',
  9: 'from-indigo-500 to-indigo-600',
  10: 'from-amber-400 to-amber-500'
}

const DEFAULT_ICONS = {
  academic: '📚',
  chores: '🧹',
  health: '💪',
  creative: '🎨',
  social: '👥',
  other: '📋'
}

export default function SkillsPage() {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [skills, setSkills] = useState([])
  const [totalPoints, setTotalPoints] = useState(0)
  const [overallLevel, setOverallLevel] = useState(1)

  useEffect(() => {
    if (user?.childProfile?.id) {
      loadSkills()
    }
  }, [user?.childProfile?.id])

  async function loadSkills() {
    try {
      setLoading(true)
      const childId = user.childProfile.id

      // Get family ID
      const { data: childProfile } = await supabase
        .from('child_profiles')
        .select('family_id')
        .eq('id', childId)
        .single()

      if (!childProfile) return

      // Load subjects
      const { data: subjects } = await supabase
        .from('subjects')
        .select('*')
        .eq('family_id', childProfile.family_id)
        .eq('is_active', true)
        .order('sort_order')

      // Load skill progress
      const { data: progress } = await supabase
        .from('skill_progress')
        .select('*')
        .eq('child_id', childId)

      // Also check for categories from completed tasks to auto-create subjects
      const { data: taskCategories } = await supabase
        .from('daily_tasks')
        .select('category')
        .eq('child_id', childId)
        .eq('status', 'approved')

      // Get unique categories that have approved tasks
      const uniqueCategories = [...new Set((taskCategories || []).map(t => t.category).filter(Boolean))]

      // Merge subjects with progress
      const existingSubjectNames = new Set((subjects || []).map(s => s.name.toLowerCase()))
      const progressMap = new Map((progress || []).map(p => [p.subject_id, p]))

      // Create subjects from task categories if they don't exist
      for (const category of uniqueCategories) {
        if (!existingSubjectNames.has(category.toLowerCase())) {
          const { data: newSubject } = await supabase
            .from('subjects')
            .insert({
              family_id: childProfile.family_id,
              name: category.charAt(0).toUpperCase() + category.slice(1),
              icon: DEFAULT_ICONS[category] || '📋',
              color: getColorForCategory(category)
            })
            .select()
            .single()

          if (newSubject) {
            subjects.push(newSubject)
          }
        }
      }

      // Calculate points from approved tasks per category
      const { data: approvedTasks } = await supabase
        .from('daily_tasks')
        .select('category, star_value')
        .eq('child_id', childId)
        .eq('status', 'approved')

      const categoryPoints = {}
      ;(approvedTasks || []).forEach(task => {
        if (task.category) {
          categoryPoints[task.category.toLowerCase()] = (categoryPoints[task.category.toLowerCase()] || 0) + (task.star_value || 1)
        }
      })

      // Combine everything
      const skillsData = (subjects || []).map(subject => {
        const existingProgress = progressMap.get(subject.id)
        const calculatedPoints = categoryPoints[subject.name.toLowerCase()] || 0
        const points = existingProgress?.total_points || calculatedPoints
        const level = calculateLevel(points)

        return {
          ...subject,
          total_points: points,
          current_level: level,
          icon: subject.icon || DEFAULT_ICONS[subject.name.toLowerCase()] || '📋'
        }
      })

      // Sort by points (highest first)
      skillsData.sort((a, b) => b.total_points - a.total_points)

      setSkills(skillsData)

      // Calculate overall stats
      const total = skillsData.reduce((sum, s) => sum + s.total_points, 0)
      setTotalPoints(total)
      setOverallLevel(calculateLevel(Math.floor(total / Math.max(skillsData.length, 1))))

    } catch (error) {
      console.error('Error loading skills:', error)
      toast.error('Failed to load skills')
    } finally {
      setLoading(false)
    }
  }

  function calculateLevel(points) {
    const thresholds = [0, 10, 25, 50, 100, 175, 275, 400, 550, 750]
    for (let i = thresholds.length - 1; i >= 0; i--) {
      if (points >= thresholds[i]) {
        return i + 1
      }
    }
    return 1
  }

  function getProgressToNextLevel(points, level) {
    const thresholds = [0, 10, 25, 50, 100, 175, 275, 400, 550, 750, 1000]
    const currentThreshold = thresholds[level - 1] || 0
    const nextThreshold = thresholds[level] || thresholds[thresholds.length - 1]
    const progress = ((points - currentThreshold) / (nextThreshold - currentThreshold)) * 100
    return Math.min(Math.max(progress, 0), 100)
  }

  function getColorForCategory(category) {
    const colors = {
      academic: 'blue',
      chores: 'green',
      health: 'red',
      creative: 'purple',
      social: 'yellow',
      other: 'gray'
    }
    return colors[category.toLowerCase()] || 'gray'
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
        <h1 className="text-2xl font-bold text-white mb-1">My Skills 🎯</h1>
        <p className="text-white/70">Level up by completing tasks in each category!</p>
      </div>

      {/* Overall Progress */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-6">
          <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${LEVEL_COLORS[overallLevel]} flex items-center justify-center text-3xl font-bold text-white shadow-lg`}>
            {overallLevel}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white mb-1">
              {LEVEL_TITLES[overallLevel]} Adventurer
            </h2>
            <p className="text-white/60 mb-2">{totalPoints} total skill points earned</p>
            <div className="flex gap-2">
              <span className="px-3 py-1 bg-white/10 rounded-full text-sm text-white/70">
                {skills.length} skills tracked
              </span>
              <span className="px-3 py-1 bg-white/10 rounded-full text-sm text-white/70">
                Level {overallLevel}/10
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Skills List */}
      {skills.length > 0 ? (
        <div className="space-y-4">
          {skills.map(skill => {
            const progress = getProgressToNextLevel(skill.total_points, skill.current_level)
            const levelColor = LEVEL_COLORS[skill.current_level] || LEVEL_COLORS[1]

            return (
              <div key={skill.id} className="glass-card p-5">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${levelColor} flex items-center justify-center text-2xl shadow-md`}>
                    {skill.icon}
                  </div>

                  {/* Info */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-white text-lg">{skill.name}</h3>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r ${levelColor} text-white`}>
                        Level {skill.current_level}
                      </span>
                    </div>

                    <p className="text-white/60 text-sm mb-3">
                      {LEVEL_TITLES[skill.current_level]} - {skill.total_points} points
                    </p>

                    {/* Progress bar */}
                    <div className="relative">
                      <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r ${levelColor} transition-all duration-500`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      {skill.current_level < 10 && (
                        <p className="text-xs text-white/50 mt-1">
                          {Math.round(progress)}% to Level {skill.current_level + 1}
                        </p>
                      )}
                      {skill.current_level >= 10 && (
                        <p className="text-xs text-yellow-400 mt-1">
                          Max level reached!
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="glass-card p-8 text-center">
          <div className="text-5xl mb-4">📊</div>
          <h3 className="text-lg font-semibold text-white mb-2">No skills tracked yet</h3>
          <p className="text-white/60">Complete tasks to start building your skills!</p>
          <p className="text-sm text-white/40 mt-2">Each completed task earns you skill points in its category.</p>
        </div>
      )}

      {/* Level Guide */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span>📖</span> Level Guide
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Object.entries(LEVEL_TITLES).map(([level, title]) => (
            <div
              key={level}
              className={`p-3 rounded-xl text-center ${
                parseInt(level) <= overallLevel
                  ? `bg-gradient-to-br ${LEVEL_COLORS[level]} text-white`
                  : 'bg-white/5 text-white/50'
              }`}
            >
              <div className="font-bold text-lg">{level}</div>
              <div className="text-xs">{title}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tips */}
      <div className="glass-card p-6 bg-gradient-to-r from-blue-500/10 to-purple-500/10">
        <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <span>💡</span> Pro Tips
        </h2>
        <ul className="space-y-2 text-white/70 text-sm">
          <li className="flex items-start gap-2">
            <span className="text-green-400">✓</span>
            Complete tasks in different categories to level up multiple skills
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-400">✓</span>
            Higher star tasks give more skill points
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-400">✓</span>
            Balance your skills to become a well-rounded adventurer
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-400">✓</span>
            Each level requires more points than the last - keep going!
          </li>
        </ul>
      </div>
    </div>
  )
}
