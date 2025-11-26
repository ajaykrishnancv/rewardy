export default function BankPage() {
  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <h1 className="text-2xl font-bold text-white mb-1">Star Bank 🏦</h1>
        <p className="text-white/70">Save stars and watch them grow!</p>
      </div>

      {/* Account overview */}
      <div className="grid grid-cols-2 gap-4">
        <div className="glass-card p-6">
          <div className="text-3xl mb-2">👛</div>
          <p className="text-white/60 text-sm">Wallet</p>
          <p className="text-3xl font-bold text-white mt-1">0 ⭐</p>
          <p className="text-xs text-white/40 mt-2">Ready to spend</p>
        </div>
        <div className="glass-card p-6 border border-blue-500/30">
          <div className="text-3xl mb-2">🏦</div>
          <p className="text-white/60 text-sm">Savings</p>
          <p className="text-3xl font-bold text-white mt-1">0 ⭐</p>
          <p className="text-xs text-green-400 mt-2">+5% monthly interest</p>
        </div>
      </div>

      {/* Interest info */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Interest Rates</h2>
        <div className="space-y-3">
          {[
            { tier: 'Bronze', range: '0-99 stars', rate: '5%' },
            { tier: 'Silver', range: '100-499 stars', rate: '7%' },
            { tier: 'Gold', range: '500+ stars', rate: '10%' },
          ].map((tier, index) => (
            <div key={index} className="flex items-center justify-between p-3 rounded-xl bg-white/5">
              <div>
                <p className="text-white font-medium">{tier.tier}</p>
                <p className="text-white/50 text-sm">{tier.range}</p>
              </div>
              <span className="badge-success">{tier.rate}/month</span>
            </div>
          ))}
        </div>
      </div>

      {/* Savings goals */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Savings Goals 🎯</h2>
        <div className="text-center py-8">
          <div className="text-5xl mb-4">🏆</div>
          <p className="text-white/60">No savings goals yet</p>
          <button className="btn-primary mt-4">
            Create a Goal
          </button>
        </div>
      </div>
    </div>
  )
}
