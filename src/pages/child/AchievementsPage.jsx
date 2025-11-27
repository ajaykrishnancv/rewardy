import { useState, useEffect } from 'react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { checkAchievements } from '../../services/gamificationService'
import toast from 'react-hot-toast'

const CATEGORY_INFO = {
  beginner: { label: 'Beginner', color: 'green' },
  intermediate: { label: 'Intermediate', color: 'blue' },
  advanced: { label: 'Advanced', color: 'purple' },
  streak: { label: 'Streaks', color: 'orange' },
  economy: { label: 'Economy', color: 'yellow' },
  rewards: { label: 'Rewards', color: 'pink' },
  special: { label: 'Special', color: 'red' }
}

export default function AchievementsPage() {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [achievements, setAchievements] = useState([])
  const [unlockedIds, setUnlockedIds] = useState(new Set())
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showCelebration, setShowCelebration] = useState(false)
  const [newlyUnlocked, setNewlyUnlocked] = useState([])

  useEffect(() => {
    if (user?.childProfile?.id) {
      loadAchievements()
    }
  }, [user?.childProfile?.id])

  async function loadAchievements() {
    try {
      setLoading(true)
      const childId = user.childProfile.id

      // Check for any new achievements first
      const newUnlocks = await checkAchievements(childId)
      if (newUnlocks.length > 0) {
        setNewlyUnlocked(newUnlocks)
        setShowCelebration(true)
      }

      // Load all achievements
      const { data: allAchievements } = await supabase
        .from('achievements')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')

      // Load unlocked achievements
      const { data: unlocked } = await supabase
        .from('unlocked_achievements')
        .select('achievement_id, unlocked_at')
        .eq('child_id', childId)

      setAchievements(allAchievements || [])
      setUnlockedIds(new Set((unlocked || []).map(u => u.achievement_id)))

    } catch (error) {
      console.error('Error loading achievements:', error)
      toast.error('Failed to load achievements')
    } finally {
      setLoading(false)
    }
  }

  const categories = ['all', ...new Set(achievements.map(a => a.category).filter(Boolean))]
  const filteredAchievements = selectedCategory === 'all'
    ? achievements
    : achievements.filter(a => a.category === selectedCategory)

  const unlockedCount = achievements.filter(a => unlockedIds.has(a.id)).length
  const totalCount = achievements.length
  const progressPercent = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0

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
        <h1 className="text-2xl font-bold text-white mb-1">My Badges 🏆</h1>
        <p className="text-white/70">Complete challenges to unlock achievements and earn gems!</p>
      </div>

      {/* Progress */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-white/70">Collection Progress</span>
          <span className="text-white font-bold">{unlockedCount} / {totalCount}</span>
        </div>
        <div className="progress-bar h-4">
          <div
            className="progress-bar-fill bg-gradient-to-r from-purple-500 to-pink-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="text-center mt-2 text-white/60 text-sm">
          {progressPercent === 100
            ? "You've collected all badges!"
            : `${totalCount - unlockedCount} more badges to unlock`}
        </p>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map(category => {
          const info = CATEGORY_INFO[category] || { label: category, color: 'gray' }
          return (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                selectedCategory === category
                  ? 'bg-white/20 text-white'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              {category === 'all' ? 'All Badges' : info.label}
            </button>
          )
        })}
      </div>

      {/* Achievements Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredAchievements.map(achievement => {
          const isUnlocked = unlockedIds.has(achievement.id)
          const categoryInfo = CATEGORY_INFO[achievement.category] || { color: 'gray' }

          return (
            <div
              key={achievement.id}
              className={`glass-card p-4 text-center transition-all duration-300 ${
                isUnlocked
                  ? 'ring-2 ring-purple-500/50 bg-purple-500/10'
                  : 'opacity-60 grayscale hover:opacity-80 hover:grayscale-0'
              }`}
            >
              {/* Badge icon */}
              <div className={`w-16 h-16 mx-auto mb-3 rounded-2xl flex items-center justify-center text-3xl ${
                isUnlocked
                  ? 'bg-gradient-to-br from-purple-500/30 to-pink-500/30 shadow-lg shadow-purple-500/20'
                  : 'bg-white/10'
              }`}>
                {isUnlocked ? achievement.icon : '🔒'}
              </div>

              {/* Name */}
              <h3 className="text-white font-semibold text-sm mb-1">
                {achievement.name}
              </h3>

              {/* Description */}
              <p className="text-white/50 text-xs mb-2 line-clamp-2">
                {achievement.description}
              </p>

              {/* Reward or Status */}
              {isUnlocked ? (
                <div className="flex items-center justify-center gap-1">
                  <span className="text-green-400 text-xs font-medium">Unlocked!</span>
                  <span className="text-green-400">✓</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs bg-${categoryInfo.color}-500/20 text-${categoryInfo.color}-400`}>
                    {CATEGORY_INFO[achievement.category]?.label || 'Badge'}
                  </span>
                  {achievement.reward_gems > 0 && (
                    <span className="text-xs text-purple-400">+{achievement.reward_gems} 💎</span>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {filteredAchievements.length === 0 && (
        <div className="glass-card p-8 text-center">
          <div className="text-5xl mb-3">🎯</div>
          <p className="text-white/70">No achievements in this category yet!</p>
        </div>
      )}

      {/* Tips Section */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span>💡</span> How to Earn Badges
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 bg-white/5 rounded-xl">
            <div className="text-2xl mb-2">⭐</div>
            <h3 className="font-medium text-white mb-1">Complete Tasks</h3>
            <p className="text-sm text-white/60">Earn stars by completing your daily tasks and getting them approved.</p>
          </div>
          <div className="p-4 bg-white/5 rounded-xl">
            <div className="text-2xl mb-2">🔥</div>
            <h3 className="font-medium text-white mb-1">Build Streaks</h3>
            <p className="text-sm text-white/60">Complete tasks every day to build up your streak for special badges.</p>
          </div>
          <div className="p-4 bg-white/5 rounded-xl">
            <div className="text-2xl mb-2">💰</div>
            <h3 className="font-medium text-white mb-1">Save Stars</h3>
            <p className="text-sm text-white/60">Transfer stars to your savings to unlock economy badges.</p>
          </div>
          <div className="p-4 bg-white/5 rounded-xl">
            <div className="text-2xl mb-2">🎁</div>
            <h3 className="font-medium text-white mb-1">Redeem Rewards</h3>
            <p className="text-sm text-white/60">Use your earned stars to buy rewards from the shop.</p>
          </div>
        </div>
      </div>

      {/* Celebration Modal */}
      {showCelebration && newlyUnlocked.length > 0 && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="glass-card p-8 max-w-md mx-4 text-center relative overflow-hidden">
            {/* Confetti animation */}
            <div className="absolute inset-0 pointer-events-none">
              {['🎉', '✨', '🌟', '💎', '🏆', '🎊', '💫'].map((emoji, i) => (
                <span
                  key={i}
                  className="absolute text-2xl animate-bounce"
                  style={{
                    left: `${10 + i * 12}%`,
                    top: `${Math.random() * 30}%`,
                    animationDelay: `${i * 0.1}s`,
                    animationDuration: `${0.5 + Math.random() * 0.5}s`
                  }}
                >
                  {emoji}
                </span>
              ))}
            </div>

            <div className="relative">
              <div className="text-6xl mb-4 animate-bounce">🏆</div>
              <h2 className="text-2xl font-bold text-white mb-2">Achievement Unlocked!</h2>
              <p className="text-white/70 mb-4">You've earned a new badge!</p>

              {newlyUnlocked.map(achievement => (
                <div key={achievement.id} className="p-4 bg-purple-500/20 rounded-xl mb-4">
                  <div className="text-4xl mb-2">{achievement.icon}</div>
                  <p className="font-bold text-white text-lg">{achievement.name}</p>
                  <p className="text-sm text-white/70">{achievement.description}</p>
                  {achievement.reward_gems > 0 && (
                    <div className="mt-3 badge-gem inline-block">
                      +{achievement.reward_gems} 💎
                    </div>
                  )}
                </div>
              ))}

              <button
                onClick={() => {
                  setShowCelebration(false)
                  setNewlyUnlocked([])
                }}
                className="btn-primary px-8 py-3"
              >
                Awesome!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
