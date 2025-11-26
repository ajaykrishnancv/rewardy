export default function AchievementsPage() {
  const achievements = [
    { name: 'First Star', icon: '⭐', description: 'Earn your first star', unlocked: false },
    { name: 'Early Bird', icon: '🌅', description: 'Complete morning routine 5 days', unlocked: false },
    { name: 'Bookworm', icon: '📚', description: 'Complete 10 reading tasks', unlocked: false },
    { name: 'Streak Master', icon: '🔥', description: '7 day streak', unlocked: false },
    { name: 'Saver', icon: '🏦', description: 'Save 100 stars', unlocked: false },
    { name: 'Big Spender', icon: '💰', description: 'Redeem 5 rewards', unlocked: false },
    { name: 'Gem Collector', icon: '💎', description: 'Earn 10 gems', unlocked: false },
    { name: 'Perfect Week', icon: '🏆', description: 'Complete all tasks for a week', unlocked: false },
  ]

  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <h1 className="text-2xl font-bold text-white mb-1">My Badges 🏆</h1>
        <p className="text-white/70">Collect them all!</p>
      </div>

      {/* Progress */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-white/70">Collection Progress</span>
          <span className="text-white font-bold">0 / {achievements.length}</span>
        </div>
        <div className="progress-bar">
          <div className="progress-bar-fill" style={{ width: '0%' }} />
        </div>
      </div>

      {/* Achievements grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {achievements.map((achievement, index) => (
          <div
            key={index}
            className={`glass-card p-4 text-center card-hover ${
              achievement.unlocked ? '' : 'opacity-50'
            }`}
          >
            <div
              className={`achievement-badge mx-auto mb-3 ${
                achievement.unlocked ? 'unlocked' : 'locked'
              }`}
            >
              <span className="text-3xl">{achievement.icon}</span>
            </div>
            <h3 className="text-white font-semibold text-sm">{achievement.name}</h3>
            <p className="text-white/50 text-xs mt-1">{achievement.description}</p>
            {achievement.unlocked && (
              <span className="badge-gem mt-2 text-xs">+2 💎</span>
            )}
          </div>
        ))}
      </div>

      {/* Locked message */}
      <div className="glass-card p-6 text-center">
        <div className="text-4xl mb-3">🔒</div>
        <p className="text-white/60">Complete quests to unlock achievements!</p>
        <p className="text-sm text-white/40 mt-1">Each badge earns you gems</p>
      </div>
    </div>
  )
}
