import { useState, useEffect } from 'react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

const REWARD_CATEGORIES = [
  { value: 'screen_time', label: 'Screen Time', icon: '📱' },
  { value: 'activity', label: 'Activity', icon: '🎮' },
  { value: 'treat', label: 'Treat', icon: '🍕' },
  { value: 'outing', label: 'Outing', icon: '🎢' },
  { value: 'item', label: 'Physical Item', icon: '🎁' },
  { value: 'privilege', label: 'Privilege', icon: '👑' },
  { value: 'other', label: 'Other', icon: '✨' }
]

export default function ShopPage() {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [rewards, setRewards] = useState([])
  const [currencyBalance, setCurrencyBalance] = useState(null)
  const [pendingRedemptions, setPendingRedemptions] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [selectedReward, setSelectedReward] = useState(null)
  const [redeeming, setRedeeming] = useState(false)
  const [todayRedemptions, setTodayRedemptions] = useState([])

  useEffect(() => {
    if (user?.childProfile?.id) {
      loadData()
    }
  }, [user?.childProfile?.id])

  async function loadData() {
    try {
      setLoading(true)
      const childId = user.childProfile.id

      // Load currency balance
      const { data: balance } = await supabase
        .from('currency_balances')
        .select('*')
        .eq('child_id', childId)
        .single()
      setCurrencyBalance(balance)

      // Load available rewards
      const { data: rewardsData } = await supabase
        .from('rewards')
        .select('*')
        .eq('family_id', user.familyId)
        .eq('is_active', true)
        .order('cost_stars', { ascending: true })
      setRewards(rewardsData || [])

      // Load pending redemptions
      const { data: redemptions } = await supabase
        .from('redemptions')
        .select(`
          *,
          rewards (name, icon)
        `)
        .eq('child_id', childId)
        .eq('status', 'pending')
        .order('requested_at', { ascending: false })
      setPendingRedemptions(redemptions || [])

      // Load today's redemptions for daily limit checking
      const today = new Date().toISOString().split('T')[0]
      const { data: todayData } = await supabase
        .from('redemptions')
        .select('reward_id, requested_at')
        .eq('child_id', childId)
        .gte('requested_at', `${today}T00:00:00`)
        .lte('requested_at', `${today}T23:59:59`)
      setTodayRedemptions(todayData || [])

    } catch (error) {
      console.error('Error loading shop:', error)
      toast.error('Failed to load shop')
    } finally {
      setLoading(false)
    }
  }

  function canAfford(reward) {
    if (!currencyBalance) return false
    const hasStars = (currencyBalance.wallet_stars || 0) >= (reward.cost_stars || 0)
    const hasGems = (currencyBalance.gems || 0) >= (reward.cost_gems || 0)
    return hasStars && hasGems
  }

  function getTodayRedemptionCount(rewardId) {
    return todayRedemptions.filter(r => r.reward_id === rewardId).length
  }

  function isAtDailyLimit(reward) {
    if (!reward.daily_limit) return false
    return getTodayRedemptionCount(reward.id) >= reward.daily_limit
  }

  function canRedeem(reward) {
    return canAfford(reward) && !isAtDailyLimit(reward)
  }

  function openConfirmModal(reward) {
    if (isAtDailyLimit(reward)) {
      toast.error(`Daily limit reached for ${reward.name}`)
      return
    }
    setSelectedReward(reward)
    setShowConfirmModal(true)
  }

  async function handleRedeem() {
    if (!selectedReward || !canAfford(selectedReward)) return

    try {
      setRedeeming(true)

      // Deduct currency
      const updates = {
        updated_at: new Date().toISOString()
      }
      if (selectedReward.cost_stars > 0) {
        updates.wallet_stars = currencyBalance.wallet_stars - selectedReward.cost_stars
      }
      if (selectedReward.cost_gems > 0) {
        updates.gems = currencyBalance.gems - selectedReward.cost_gems
      }

      const { error: balanceError } = await supabase
        .from('currency_balances')
        .update(updates)
        .eq('child_id', user.childProfile.id)

      if (balanceError) throw balanceError

      // Create redemption request - auto-approve if enabled
      const isAutoApprove = selectedReward.auto_approve
      const redemptionData = {
        child_id: user.childProfile.id,
        reward_id: selectedReward.id,
        cost_stars: selectedReward.cost_stars || 0,
        cost_gems: selectedReward.cost_gems || 0,
        status: isAutoApprove ? 'approved' : 'pending',
        requested_at: new Date().toISOString()
      }

      if (isAutoApprove) {
        redemptionData.processed_at = new Date().toISOString()
      }

      const { error: redemptionError } = await supabase
        .from('redemptions')
        .insert(redemptionData)

      if (redemptionError) throw redemptionError

      // Log transaction
      if (selectedReward.cost_stars > 0) {
        await supabase.from('transactions').insert({
          child_id: user.childProfile.id,
          transaction_type: 'spend',
          currency_type: 'stars',
          amount: selectedReward.cost_stars,
          description: `Redeemed: ${selectedReward.name}`,
          reference_type: 'reward',
          reference_id: selectedReward.id
        })
      }

      // Decrement stock if applicable
      if (selectedReward.stock_quantity !== null) {
        await supabase
          .from('rewards')
          .update({ stock_quantity: selectedReward.stock_quantity - 1 })
          .eq('id', selectedReward.id)
      }

      if (isAutoApprove) {
        toast.success('Reward redeemed! Enjoy!')
      } else {
        toast.success('Reward requested! Waiting for parent approval.')
      }
      setShowConfirmModal(false)
      setSelectedReward(null)
      loadData()
    } catch (error) {
      console.error('Error redeeming reward:', error)
      toast.error('Failed to redeem reward')
    } finally {
      setRedeeming(false)
    }
  }

  const getCategoryInfo = (category) => {
    return REWARD_CATEGORIES.find(c => c.value === category) || REWARD_CATEGORIES[6]
  }

  // Filter rewards by category
  const filteredRewards = rewards.filter(r => {
    if (selectedCategory === 'all') return true
    if (selectedCategory === 'gems') return r.cost_gems > 0 && r.cost_stars === 0
    return r.category === selectedCategory
  })

  // Separate star and gem rewards
  const starRewards = filteredRewards.filter(r => r.cost_stars > 0 || r.cost_gems === 0)
  const gemRewards = filteredRewards.filter(r => r.cost_gems > 0 && r.cost_stars === 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="spinner" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Balance */}
      <div className="glass-card p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Reward Shop</h1>
            <p className="text-white/70">Spend your hard-earned stars!</p>
          </div>
          <div className="flex gap-4">
            <div className="star-display px-4 py-2 bg-yellow-500/20 border border-yellow-500/30 rounded-xl flex items-center gap-2">
              <span className="text-xl">⭐</span>
              <span className="text-white font-bold text-lg">{currencyBalance?.wallet_stars || 0}</span>
            </div>
            <div className="gem-display px-4 py-2 bg-purple-500/20 border border-purple-500/30 rounded-xl flex items-center gap-2">
              <span className="text-xl">💎</span>
              <span className="text-white font-bold text-lg">{currencyBalance?.gems || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Requests */}
      {pendingRedemptions.length > 0 && (
        <div className="glass-card p-6 border border-yellow-500/30">
          <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <span>⏳</span>
            Waiting for Approval
          </h2>
          <div className="flex flex-wrap gap-3">
            {pendingRedemptions.map(redemption => (
              <div
                key={redemption.id}
                className="px-4 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-center gap-2"
              >
                <span className="text-xl">{redemption.rewards?.icon || '🎁'}</span>
                <span className="text-white">{redemption.rewards?.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category Filter */}
      <div className="glass-card p-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-xl transition-all ${
              selectedCategory === 'all'
                ? 'bg-gradient-to-r from-neon-blue to-neon-purple text-white'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            All
          </button>
          {REWARD_CATEGORIES.map(cat => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
                selectedCategory === cat.value
                  ? 'bg-gradient-to-r from-neon-blue to-neon-purple text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              <span>{cat.icon}</span>
              <span className="hidden md:inline">{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Star Rewards */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span>⭐</span>
          Star Rewards
        </h2>

        {starRewards.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-5xl mb-4 animate-float">🎁</div>
            <p className="text-white/60">No rewards available yet</p>
            <p className="text-sm text-white/40 mt-2">Your parent will add some awesome rewards soon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {starRewards.map(reward => {
              const affordable = canAfford(reward)
              const atLimit = isAtDailyLimit(reward)
              const redeemable = canRedeem(reward)
              const category = getCategoryInfo(reward.category)
              const todayCount = getTodayRedemptionCount(reward.id)
              return (
                <div
                  key={reward.id}
                  className={`p-4 rounded-xl border transition-all ${
                    redeemable
                      ? 'bg-white/5 border-white/20 hover:border-neon-blue cursor-pointer card-hover'
                      : 'bg-white/5 border-white/10 opacity-60'
                  }`}
                  onClick={() => redeemable && openConfirmModal(reward)}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-4xl">{reward.icon || '🎁'}</span>
                    <div className="flex-1">
                      <p className="font-medium text-white">{reward.name}</p>
                      <p className="text-xs text-white/50">{category.label}</p>
                      {reward.description && (
                        <p className="text-sm text-white/60 mt-2">{reward.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
                    <div className="flex items-center gap-2">
                      {reward.cost_stars > 0 && (
                        <span className={`badge-star ${!affordable ? 'opacity-50' : ''}`}>
                          {reward.cost_stars} stars
                        </span>
                      )}
                      {reward.cost_gems > 0 && (
                        <span className={`badge-gem ${!affordable ? 'opacity-50' : ''}`}>
                          {reward.cost_gems} gems
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {reward.stock_quantity !== null && (
                        <span className="text-xs text-white/50">{reward.stock_quantity} left</span>
                      )}
                    </div>
                  </div>

                  {/* Auto-approve and daily limit badges */}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {reward.auto_approve && (
                      <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
                        Instant
                      </span>
                    )}
                    {reward.daily_limit && (
                      <span className={`text-xs px-2 py-1 rounded ${
                        atLimit ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {todayCount}/{reward.daily_limit} today
                      </span>
                    )}
                  </div>

                  {redeemable ? (
                    <button className="w-full mt-3 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity">
                      Get It!
                    </button>
                  ) : atLimit ? (
                    <div className="w-full mt-3 px-4 py-2 bg-red-500/10 text-red-400 rounded-xl text-center text-sm">
                      Daily limit reached
                    </div>
                  ) : (
                    <div className="w-full mt-3 px-4 py-2 bg-white/5 text-white/50 rounded-xl text-center text-sm">
                      Need more {reward.cost_stars > (currencyBalance?.wallet_stars || 0) ? 'stars' : 'gems'}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Gem Exclusives */}
      {gemRewards.length > 0 && (
        <div className="glass-card p-6 border border-purple-500/30">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span>💎</span>
            Gem Exclusives
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {gemRewards.map(reward => {
              const affordable = canAfford(reward)
              const atLimit = isAtDailyLimit(reward)
              const redeemable = canRedeem(reward)
              const category = getCategoryInfo(reward.category)
              const todayCount = getTodayRedemptionCount(reward.id)
              return (
                <div
                  key={reward.id}
                  className={`p-4 rounded-xl border transition-all ${
                    redeemable
                      ? 'bg-purple-500/10 border-purple-500/30 hover:border-purple-400 cursor-pointer'
                      : 'bg-purple-500/5 border-purple-500/20 opacity-60'
                  }`}
                  onClick={() => redeemable && openConfirmModal(reward)}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-4xl">{reward.icon || '💎'}</span>
                    <div className="flex-1">
                      <p className="font-medium text-white">{reward.name}</p>
                      <p className="text-xs text-purple-300">{category.label}</p>
                      {reward.description && (
                        <p className="text-sm text-white/60 mt-2">{reward.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-purple-500/20">
                    <span className="badge-gem">{reward.cost_gems} gems</span>
                    {reward.stock_quantity !== null && (
                      <span className="text-xs text-purple-300">{reward.stock_quantity} left</span>
                    )}
                  </div>

                  {/* Auto-approve and daily limit badges */}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {reward.auto_approve && (
                      <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
                        Instant
                      </span>
                    )}
                    {reward.daily_limit && (
                      <span className={`text-xs px-2 py-1 rounded ${
                        atLimit ? 'bg-red-500/20 text-red-400' : 'bg-purple-400/20 text-purple-300'
                      }`}>
                        {todayCount}/{reward.daily_limit} today
                      </span>
                    )}
                  </div>

                  {redeemable ? (
                    <button className="w-full mt-3 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity">
                      Get It!
                    </button>
                  ) : atLimit ? (
                    <div className="w-full mt-3 px-4 py-2 bg-red-500/10 text-red-400 rounded-xl text-center text-sm">
                      Daily limit reached
                    </div>
                  ) : (
                    <div className="w-full mt-3 px-4 py-2 bg-white/5 text-white/50 rounded-xl text-center text-sm">
                      Need more gems
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Empty state for gem section */}
      {gemRewards.length === 0 && selectedCategory !== 'gems' && (
        <div className="glass-card p-6 border border-purple-500/30">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span>💎</span>
            Gem Exclusives
          </h2>
          <div className="text-center py-8">
            <div className="text-5xl mb-4">✨</div>
            <p className="text-white/60">Premium rewards coming soon!</p>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {showConfirmModal && selectedReward && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card p-6 max-w-sm w-full text-center">
            <div className="text-6xl mb-4">{selectedReward.icon || '🎁'}</div>
            <h3 className="text-xl font-bold text-white mb-2">{selectedReward.name}</h3>
            {selectedReward.description && (
              <p className="text-white/60 mb-4">{selectedReward.description}</p>
            )}

            <div className="flex justify-center gap-3 mb-6">
              {selectedReward.cost_stars > 0 && (
                <span className="badge-star text-lg px-4 py-2">{selectedReward.cost_stars} stars</span>
              )}
              {selectedReward.cost_gems > 0 && (
                <span className="badge-gem text-lg px-4 py-2">{selectedReward.cost_gems} gems</span>
              )}
            </div>

            <p className="text-white/70 mb-6">
              {selectedReward.auto_approve
                ? 'This reward will be instantly approved!'
                : 'Are you sure you want to redeem this reward? Your parent will need to approve it.'}
            </p>

            {selectedReward.auto_approve && (
              <div className="mb-4 px-4 py-2 bg-green-500/20 text-green-400 rounded-xl text-sm">
                Instant reward - no waiting!
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowConfirmModal(false)
                  setSelectedReward(null)
                }}
                disabled={redeeming}
                className="flex-1 px-4 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRedeem}
                disabled={redeeming}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {redeeming ? 'Processing...' : 'Confirm!'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
