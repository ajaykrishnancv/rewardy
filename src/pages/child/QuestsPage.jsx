export default function QuestsPage() {
  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <h1 className="text-2xl font-bold text-white mb-1">My Quests ⚔️</h1>
        <p className="text-white/70">Complete tasks to earn stars!</p>
      </div>

      {/* Today's tasks */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Today's Tasks</h2>
        <div className="text-center py-8">
          <div className="text-5xl mb-4 animate-float">📋</div>
          <p className="text-white/60">No tasks for today</p>
          <p className="text-sm text-white/40 mt-2">Check back later!</p>
        </div>
      </div>

      {/* Bonus quests */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Bonus Quests</h2>
        <div className="text-center py-8">
          <div className="text-5xl mb-4">🌟</div>
          <p className="text-white/60">Extra quests coming soon!</p>
        </div>
      </div>
    </div>
  )
}
