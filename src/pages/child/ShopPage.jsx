export default function ShopPage() {
  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Reward Shop 🛍️</h1>
            <p className="text-white/70">Spend your hard-earned stars!</p>
          </div>
          <div className="flex gap-3">
            <div className="star-display">
              <span className="star-icon">★</span>
              <span className="text-white font-bold">0</span>
            </div>
            <div className="gem-display">
              <span className="gem-icon">◆</span>
              <span className="text-white font-bold">0</span>
            </div>
          </div>
        </div>
      </div>

      {/* Shop categories */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Available Rewards</h2>
        <div className="text-center py-8">
          <div className="text-5xl mb-4 animate-float">🎁</div>
          <p className="text-white/60">No rewards available yet</p>
          <p className="text-sm text-white/40 mt-2">Your parent will add some awesome rewards soon!</p>
        </div>
      </div>

      {/* Gem exclusives */}
      <div className="glass-card p-6 border border-purple-500/30">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">💎</span>
          <h2 className="text-lg font-semibold text-white">Gem Exclusives</h2>
        </div>
        <div className="text-center py-8">
          <div className="text-5xl mb-4">✨</div>
          <p className="text-white/60">Premium rewards coming soon!</p>
        </div>
      </div>
    </div>
  )
}
