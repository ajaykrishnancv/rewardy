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

export default function RewardsPage() {
  const { user, hasPermission } = useAuthStore()
  const canManageRewards = hasPermission('manageRewards')
  const canApproveRedemptions = hasPermission('approveRedemptions')

  const [loading, setLoading] = useState(true)
  const [rewards, setRewards] = useState([])
  const [pendingRedemptions, setPendingRedemptions] = useState([])
  const [childProfile, setChildProfile] = useState(null)
  const [showRewardModal, setShowRewardModal] = useState(false)
  const [editingReward, setEditingReward] = useState(null)

  const [rewardForm, setRewardForm] = useState({
    name: '',
    description: '',
    category: 'activity',
    icon: '🎁',
    cost_stars: 10,
    cost_gems: 0,
    stock_quantity: null,
    is_active: true,
    auto_approve: false,
    daily_limit: null
  })

  useEffect(() => {
    if (user?.familyId) {
      loadData()
    }
  }, [user?.familyId])

  async function loadData() {
    try {
      setLoading(true)

      // Load child profile
      const { data: child } = await supabase
        .from('child_profiles')
        .select('*')
        .eq('family_id', user.familyId)
        .single()

      setChildProfile(child)

      // Load rewards
      const { data: rewardsData } = await supabase
        .from('rewards')
        .select('*')
        .eq('family_id', user.familyId)
        .order('created_at', { ascending: false })

      setRewards(rewardsData || [])

      // Load pending redemptions
      if (child) {
        const { data: redemptions } = await supabase
          .from('redemptions')
          .select(`
            *,
            rewards (name, icon, cost_stars, cost_gems)
          `)
          .eq('child_id', child.id)
          .eq('status', 'pending')
          .order('requested_at', { ascending: false })

        setPendingRedemptions(redemptions || [])
      }
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load rewards')
    } finally {
      setLoading(false)
    }
  }

  function openCreateReward() {
    setEditingReward(null)
    setRewardForm({
      name: '',
      description: '',
      category: 'activity',
      icon: '🎁',
      cost_stars: 10,
      cost_gems: 0,
      stock_quantity: null,
      is_active: true,
      auto_approve: false,
      daily_limit: null
    })
    setShowRewardModal(true)
  }

  function openEditReward(reward) {
    setEditingReward(reward)
    setRewardForm({
      name: reward.name,
      description: reward.description || '',
      category: reward.category || 'other',
      icon: reward.icon || '🎁',
      cost_stars: reward.cost_stars || 0,
      cost_gems: reward.cost_gems || 0,
      stock_quantity: reward.stock_quantity,
      is_active: reward.is_active,
      auto_approve: reward.auto_approve || false,
      daily_limit: reward.daily_limit
    })
    setShowRewardModal(true)
  }

  async function handleSaveReward() {
    if (!rewardForm.name.trim()) {
      toast.error('Please enter a reward name')
      return
    }

    if (rewardForm.cost_stars <= 0 && rewardForm.cost_gems <= 0) {
      toast.error('Please set a cost in stars or gems')
      return
    }

    try {
      const rewardData = {
        family_id: user.familyId,
        name: rewardForm.name.trim(),
        description: rewardForm.description.trim() || null,
        category: rewardForm.category,
        icon: rewardForm.icon,
        cost_stars: rewardForm.cost_stars || 0,
        cost_gems: rewardForm.cost_gems || 0,
        stock_quantity: rewardForm.stock_quantity || null,
        is_active: rewardForm.is_active,
        auto_approve: rewardForm.auto_approve,
        daily_limit: rewardForm.daily_limit || null
      }

      if (editingReward) {
        const { error } = await supabase
          .from('rewards')
          .update(rewardData)
          .eq('id', editingReward.id)

        if (error) throw error
        toast.success('Reward updated!')
      } else {
        const { error } = await supabase
          .from('rewards')
          .insert(rewardData)

        if (error) throw error
        toast.success('Reward created!')
      }

      setShowRewardModal(false)
      loadData()
    } catch (error) {
      console.error('Error saving reward:', error)
      toast.error('Failed to save reward')
    }
  }

  async function handleDeleteReward(reward) {
    if (!confirm(`Delete "${reward.name}"? This cannot be undone.`)) return

    try {
      const { error } = await supabase
        .from('rewards')
        .delete()
        .eq('id', reward.id)

      if (error) throw error
      toast.success('Reward deleted')
      loadData()
    } catch (error) {
      console.error('Error deleting reward:', error)
      toast.error('Failed to delete reward')
    }
  }

  async function handleToggleActive(reward) {
    try {
      const { error } = await supabase
        .from('rewards')
        .update({ is_active: !reward.is_active })
        .eq('id', reward.id)

      if (error) throw error
      toast.success(reward.is_active ? 'Reward hidden from shop' : 'Reward added to shop')
      loadData()
    } catch (error) {
      console.error('Error toggling reward:', error)
      toast.error('Failed to update reward')
    }
  }

  async function handleApproveRedemption(redemption) {
    try {
      const { error } = await supabase
        .from('redemptions')
        .update({
          status: 'approved',
          processed_at: new Date().toISOString(),
          processed_by: user.id
        })
        .eq('id', redemption.id)

      if (error) throw error
      toast.success('Reward approved!')
      loadData()
    } catch (error) {
      console.error('Error approving redemption:', error)
      toast.error('Failed to approve reward')
    }
  }

  async function handleRejectRedemption(redemption) {
    const reason = prompt('Reason for rejection:')
    if (!reason) return

    try {
      // Get current balance
      const { data: balance } = await supabase
        .from('currency_balances')
        .select('*')
        .eq('child_id', childProfile.id)
        .single()

      // Refund the currency
      const updates = {}
      if (redemption.cost_stars > 0) {
        updates.wallet_stars = balance.wallet_stars + redemption.cost_stars
      }
      if (redemption.cost_gems > 0) {
        updates.gems = balance.gems + redemption.cost_gems
      }

      if (Object.keys(updates).length > 0) {
        await supabase
          .from('currency_balances')
          .update(updates)
          .eq('child_id', childProfile.id)

        // Log refund transaction
        if (redemption.cost_stars > 0) {
          await supabase.from('transactions').insert({
            child_id: childProfile.id,
            transaction_type: 'refund',
            currency_type: 'stars',
            amount: redemption.cost_stars,
            description: `Refund: ${redemption.rewards?.name} - ${reason}`
          })
        }
      }

      const { error } = await supabase
        .from('redemptions')
        .update({
          status: 'rejected',
          processed_at: new Date().toISOString(),
          processed_by: user.id,
          rejection_reason: reason
        })
        .eq('id', redemption.id)

      if (error) throw error
      toast.success('Reward rejected and refunded')
      loadData()
    } catch (error) {
      console.error('Error rejecting redemption:', error)
      toast.error('Failed to reject reward')
    }
  }

  const getCategoryInfo = (category) => {
    return REWARD_CATEGORIES.find(c => c.value === category) || REWARD_CATEGORIES[6]
  }

  const activeRewards = rewards.filter(r => r.is_active)
  const hiddenRewards = rewards.filter(r => !r.is_active)

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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Reward Shop</h1>
            <p className="text-white/70">
              Manage rewards for {childProfile?.display_name}
            </p>
          </div>
          {canManageRewards && (
            <button
              onClick={openCreateReward}
              className="px-4 py-2 bg-gradient-to-r from-neon-blue to-neon-purple text-white rounded-xl hover:opacity-90 transition-opacity"
            >
              + Add Reward
            </button>
          )}
        </div>
      </div>

      {/* Pending Redemptions */}
      {pendingRedemptions.length > 0 && (
        <div className="glass-card p-6 border border-yellow-500/30">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span className="text-xl">⏳</span>
            Pending Approvals ({pendingRedemptions.length})
          </h2>
          <div className="space-y-3">
            {pendingRedemptions.map(redemption => (
              <div key={redemption.id} className="p-4 bg-white/5 rounded-xl border border-white/10">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{redemption.rewards?.icon || '🎁'}</span>
                    <div>
                      <p className="font-medium text-white">{redemption.rewards?.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {redemption.cost_stars > 0 && (
                          <span className="badge-star text-xs">{redemption.cost_stars}</span>
                        )}
                        {redemption.cost_gems > 0 && (
                          <span className="badge-gem text-xs">{redemption.cost_gems}</span>
                        )}
                        <span className="text-xs text-white/50">
                          {new Date(redemption.requested_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  {canApproveRedemptions && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApproveRedemption(redemption)}
                        className="p-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
                        title="Approve"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleRejectRedemption(redemption)}
                        className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                        title="Reject"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Rewards */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          Shop Items ({activeRewards.length})
        </h2>

        {activeRewards.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">🎁</div>
            <p className="text-white/70 font-medium mb-2">No rewards in shop yet</p>
            {canManageRewards && (
              <button
                onClick={openCreateReward}
                className="mt-4 px-4 py-2 bg-gradient-to-r from-neon-blue to-neon-purple text-white rounded-xl hover:opacity-90 transition-opacity"
              >
                + Create First Reward
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeRewards.map(reward => {
              const category = getCategoryInfo(reward.category)
              return (
                <div
                  key={reward.id}
                  className="p-4 bg-white/5 rounded-xl border border-white/10 hover:border-white/20 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{reward.icon || '🎁'}</span>
                      <div>
                        <p className="font-medium text-white">{reward.name}</p>
                        <p className="text-xs text-white/50">{category.label}</p>
                      </div>
                    </div>
                    {canManageRewards && (
                      <button
                        onClick={() => openEditReward(reward)}
                        className="p-1 text-white/50 hover:text-white transition-colors"
                      >
                        ✏️
                      </button>
                    )}
                  </div>

                  {reward.description && (
                    <p className="text-sm text-white/60 mt-3">{reward.description}</p>
                  )}

                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-2">
                      {reward.cost_stars > 0 && (
                        <span className="badge-star">{reward.cost_stars} stars</span>
                      )}
                      {reward.cost_gems > 0 && (
                        <span className="badge-gem">{reward.cost_gems} gems</span>
                      )}
                    </div>
                    {reward.stock_quantity !== null && (
                      <span className="text-xs text-white/50">
                        {reward.stock_quantity} left
                      </span>
                    )}
                  </div>

                  {/* Auto-approve and daily limit badges */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {reward.auto_approve && (
                      <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
                        Auto-approve
                      </span>
                    )}
                    {reward.daily_limit && (
                      <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
                        Max {reward.daily_limit}/day
                      </span>
                    )}
                  </div>

                  {canManageRewards && (
                    <div className="flex gap-2 mt-4 pt-4 border-t border-white/10">
                      <button
                        onClick={() => handleToggleActive(reward)}
                        className="flex-1 px-3 py-1 text-sm bg-white/10 text-white/70 rounded-lg hover:bg-white/20 transition-colors"
                      >
                        Hide
                      </button>
                      <button
                        onClick={() => handleDeleteReward(reward)}
                        className="px-3 py-1 text-sm bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Hidden Rewards */}
      {hiddenRewards.length > 0 && canManageRewards && (
        <div className="glass-card p-6 opacity-60">
          <h2 className="text-lg font-semibold text-white mb-4">
            Hidden Rewards ({hiddenRewards.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {hiddenRewards.map(reward => (
              <div
                key={reward.id}
                className="p-4 bg-white/5 rounded-xl border border-white/10"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl opacity-50">{reward.icon || '🎁'}</span>
                    <p className="font-medium text-white/50">{reward.name}</p>
                  </div>
                  <button
                    onClick={() => handleToggleActive(reward)}
                    className="px-3 py-1 text-sm bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
                  >
                    Show
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reward Modal */}
      {showRewardModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-white mb-4">
              {editingReward ? 'Edit Reward' : 'Create Reward'}
            </h3>

            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <label className="block text-sm text-white/70 mb-1">Icon</label>
                  <input
                    type="text"
                    value={rewardForm.icon}
                    onChange={(e) => setRewardForm({ ...rewardForm, icon: e.target.value })}
                    className="w-16 px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white text-center text-xl focus:outline-none focus:border-neon-blue"
                    maxLength={2}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm text-white/70 mb-1">Name *</label>
                  <input
                    type="text"
                    value={rewardForm.name}
                    onChange={(e) => setRewardForm({ ...rewardForm, name: e.target.value })}
                    placeholder="e.g., 30 min Screen Time"
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-neon-blue"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-1">Description</label>
                <textarea
                  value={rewardForm.description}
                  onChange={(e) => setRewardForm({ ...rewardForm, description: e.target.value })}
                  placeholder="Optional details"
                  rows={2}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-neon-blue resize-none"
                />
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-1">Category</label>
                <select
                  value={rewardForm.category}
                  onChange={(e) => setRewardForm({ ...rewardForm, category: e.target.value })}
                  className="select-dark"
                >
                  {REWARD_CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-white/70 mb-1">Cost (Stars)</label>
                  <input
                    type="number"
                    value={rewardForm.cost_stars}
                    onChange={(e) => setRewardForm({ ...rewardForm, cost_stars: parseInt(e.target.value) || 0 })}
                    min="0"
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-neon-blue"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/70 mb-1">Cost (Gems)</label>
                  <input
                    type="number"
                    value={rewardForm.cost_gems}
                    onChange={(e) => setRewardForm({ ...rewardForm, cost_gems: parseInt(e.target.value) || 0 })}
                    min="0"
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-neon-blue"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-1">
                  Stock Quantity (leave empty for unlimited)
                </label>
                <input
                  type="number"
                  value={rewardForm.stock_quantity || ''}
                  onChange={(e) => setRewardForm({ ...rewardForm, stock_quantity: e.target.value ? parseInt(e.target.value) : null })}
                  min="0"
                  placeholder="Unlimited"
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-neon-blue"
                />
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-1">
                  Daily Limit (leave empty for unlimited)
                </label>
                <input
                  type="number"
                  value={rewardForm.daily_limit || ''}
                  onChange={(e) => setRewardForm({ ...rewardForm, daily_limit: e.target.value ? parseInt(e.target.value) : null })}
                  min="1"
                  placeholder="Unlimited"
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-neon-blue"
                />
              </div>

              <div className="space-y-3 p-4 bg-white/5 rounded-xl border border-white/10">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rewardForm.is_active}
                    onChange={(e) => setRewardForm({ ...rewardForm, is_active: e.target.checked })}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm text-white/70">Show in shop</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rewardForm.auto_approve}
                    onChange={(e) => setRewardForm({ ...rewardForm, auto_approve: e.target.checked })}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm text-white/70">Auto-approve (no parent approval needed)</span>
                </label>
                {rewardForm.auto_approve && (
                  <p className="text-xs text-yellow-400/80 ml-6">
                    Redemptions will be automatically approved
                  </p>
                )}
              </div>

              <div className="flex gap-3 justify-end mt-6">
                <button
                  onClick={() => setShowRewardModal(false)}
                  className="px-4 py-2 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveReward}
                  className="px-4 py-2 bg-gradient-to-r from-neon-blue to-neon-purple text-white rounded-xl hover:opacity-90 transition-opacity"
                >
                  {editingReward ? 'Save Changes' : 'Create Reward'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
