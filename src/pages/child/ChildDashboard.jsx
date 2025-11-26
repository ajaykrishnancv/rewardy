import { useAuthStore } from '../../stores/authStore'

export default function ChildDashboard() {
  const { user } = useAuthStore()

  return (
    <div className="space-y-6">
      {/* Welcome header with currency */}
      <div className="glass-card p-6 relative overflow-hidden">
        {/* Floating decorations */}
        <div className="absolute top-4 right-4 text-4xl animate-float">⭐</div>
        <div className="absolute bottom-4 right-16 text-3xl animate-float" style={{ animationDelay: '-1s' }}>💎</div>

        <h1 className="text-3xl font-bold text-white mb-2">
          Hey, {user?.childProfile?.display_name || 'Champion'}! 🚀
        </h1>
        <p className="text-white/70 text-lg">Ready for today's adventures?</p>

        {/* Currency display */}
        <div className="flex gap-4 mt-4">
          <div className="star-display">
            <span className="star-icon text-xl">★</span>
            <span className="text-white font-bold">0</span>
          </div>
          <div className="gem-display">
            <span className="gem-icon text-xl">◆</span>
            <span className="text-white font-bold">0</span>
          </div>
          <div className="streak-fire">
            <span className="streak-fire-icon text-xl">🔥</span>
            <span className="text-white font-bold">0 days</span>
          </div>
        </div>
      </div>

      {/* Today's quests */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Today's Quests</h2>
          <span className="badge-success">0/0 Complete</span>
        </div>

        <div className="text-center py-8">
          <div className="text-5xl mb-4 animate-float">🎯</div>
          <p className="text-white/60 text-lg">No quests available yet</p>
          <p className="text-sm text-white/40 mt-2">Your parent will add some soon!</p>
        </div>
      </div>

      {/* Quick nav cards */}
      <div className="grid grid-cols-2 gap-4">
        {[
          {
            title: 'Shop',
            icon: '🛍️',
            description: 'Spend your stars!',
            gradient: 'from-pink-500 to-rose-500'
          },
          {
            title: 'Bank',
            icon: '🏦',
            description: 'Save & earn interest',
            gradient: 'from-blue-500 to-cyan-500'
          },
          {
            title: 'Quests',
            icon: '⚔️',
            description: 'Daily challenges',
            gradient: 'from-orange-500 to-amber-500'
          },
          {
            title: 'Badges',
            icon: '🏆',
            description: 'Your achievements',
            gradient: 'from-purple-500 to-violet-500'
          },
        ].map((card, index) => (
          <button
            key={index}
            className={`relative overflow-hidden p-6 rounded-2xl bg-gradient-to-br ${card.gradient} shadow-lg kid-friendly`}
          >
            <div className="text-4xl mb-2">{card.icon}</div>
            <h3 className="text-xl font-bold text-white">{card.title}</h3>
            <p className="text-white/80 text-sm">{card.description}</p>

            {/* Decorative circles */}
            <div className="absolute -top-4 -right-4 w-20 h-20 bg-white/10 rounded-full" />
            <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-white/10 rounded-full" />
          </button>
        ))}
      </div>

      {/* Active quest preview */}
      <div className="glass-card p-6">
        <h2 className="text-xl font-bold text-white mb-4">Weekly Challenge</h2>
        <div className="quest-card">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-white font-semibold">Complete 10 Tasks</h3>
              <p className="text-white/60 text-sm mt-1">Finish 10 tasks this week</p>
            </div>
            <div className="badge-gem">+5 💎</div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-sm text-white/60 mb-1">
              <span>Progress</span>
              <span>0/10</span>
            </div>
            <div className="progress-bar">
              <div className="progress-bar-fill" style={{ width: '0%' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
