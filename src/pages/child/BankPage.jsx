import { useState, useEffect } from 'react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

const INTEREST_TIERS = [
  { tier: 'Bronze', minStars: 0, maxStars: 99, rate: 5, color: 'text-orange-400', bg: 'bg-orange-500/20' },
  { tier: 'Silver', minStars: 100, maxStars: 499, rate: 7, color: 'text-gray-300', bg: 'bg-gray-500/20' },
  { tier: 'Gold', minStars: 500, maxStars: Infinity, rate: 10, color: 'text-yellow-400', bg: 'bg-yellow-500/20' }
]

export default function BankPage() {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [currencyBalance, setCurrencyBalance] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [savingsGoals, setSavingsGoals] = useState([])
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [showGoalModal, setShowGoalModal] = useState(false)
  const [transferType, setTransferType] = useState('deposit')
  const [transferAmount, setTransferAmount] = useState('')
  const [transferring, setTransferring] = useState(false)

  const [goalForm, setGoalForm] = useState({
    name: '',
    target_amount: 100,
    icon: '🎯'
  })

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

      // Load recent transactions
      const { data: txns } = await supabase
        .from('transactions')
        .select('*')
        .eq('child_id', childId)
        .order('created_at', { ascending: false })
        .limit(20)
      setTransactions(txns || [])

      // Load savings goals
      const { data: goals } = await supabase
        .from('savings_goals')
        .select('*')
        .eq('child_id', childId)
        .eq('is_completed', false)
        .order('created_at', { ascending: false })
      setSavingsGoals(goals || [])

    } catch (error) {
      console.error('Error loading bank data:', error)
      toast.error('Failed to load bank data')
    } finally {
      setLoading(false)
    }
  }

  function getCurrentTier() {
    if (!currencyBalance) return INTEREST_TIERS[0]
    const savings = currencyBalance.savings_stars || 0
    return INTEREST_TIERS.find(t => savings >= t.minStars && savings <= t.maxStars) || INTEREST_TIERS[0]
  }

  function getNextTier() {
    const current = getCurrentTier()
    const currentIndex = INTEREST_TIERS.indexOf(current)
    return currentIndex < INTEREST_TIERS.length - 1 ? INTEREST_TIERS[currentIndex + 1] : null
  }

  async function handleTransfer() {
    const amount = parseInt(transferAmount)
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    const walletStars = currencyBalance?.wallet_stars || 0
    const savingsStars = currencyBalance?.savings_stars || 0

    if (transferType === 'deposit' && amount > walletStars) {
      toast.error('Not enough stars in wallet')
      return
    }

    if (transferType === 'withdraw' && amount > savingsStars) {
      toast.error('Not enough stars in savings')
      return
    }

    try {
      setTransferring(true)

      const updates = {
        updated_at: new Date().toISOString()
      }

      if (transferType === 'deposit') {
        updates.wallet_stars = walletStars - amount
        updates.savings_stars = savingsStars + amount
      } else {
        updates.wallet_stars = walletStars + amount
        updates.savings_stars = savingsStars - amount
      }

      const { error: balanceError } = await supabase
        .from('currency_balances')
        .update(updates)
        .eq('child_id', user.childProfile.id)

      if (balanceError) throw balanceError

      // Log transaction
      await supabase.from('transactions').insert({
        child_id: user.childProfile.id,
        transaction_type: transferType === 'deposit' ? 'savings_deposit' : 'savings_withdraw',
        currency_type: 'stars',
        amount: amount,
        description: transferType === 'deposit' ? 'Deposited to savings' : 'Withdrawn from savings'
      })

      toast.success(transferType === 'deposit' ? 'Deposited to savings!' : 'Withdrawn from savings!')
      setShowTransferModal(false)
      setTransferAmount('')
      loadData()
    } catch (error) {
      console.error('Error transferring:', error)
      toast.error('Failed to transfer')
    } finally {
      setTransferring(false)
    }
  }

  async function handleCreateGoal() {
    if (!goalForm.name.trim()) {
      toast.error('Please enter a goal name')
      return
    }

    try {
      const { error } = await supabase
        .from('savings_goals')
        .insert({
          child_id: user.childProfile.id,
          name: goalForm.name.trim(),
          target_amount: goalForm.target_amount,
          current_amount: 0,
          icon: goalForm.icon,
          is_completed: false
        })

      if (error) throw error

      toast.success('Savings goal created!')
      setShowGoalModal(false)
      setGoalForm({ name: '', target_amount: 100, icon: '🎯' })
      loadData()
    } catch (error) {
      console.error('Error creating goal:', error)
      toast.error('Failed to create goal')
    }
  }

  async function handleDeleteGoal(goal) {
    if (!confirm(`Delete "${goal.name}"?`)) return

    try {
      const { error } = await supabase
        .from('savings_goals')
        .delete()
        .eq('id', goal.id)

      if (error) throw error
      toast.success('Goal deleted')
      loadData()
    } catch (error) {
      console.error('Error deleting goal:', error)
      toast.error('Failed to delete goal')
    }
  }

  const currentTier = getCurrentTier()
  const nextTier = getNextTier()
  const walletStars = currencyBalance?.wallet_stars || 0
  const savingsStars = currencyBalance?.savings_stars || 0
  const totalStars = walletStars + savingsStars
  const monthlyInterest = Math.floor(savingsStars * (currentTier.rate / 100))

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Star Bank</h1>
            <p className="text-white/70">Save stars and watch them grow!</p>
          </div>
          <div className={`px-4 py-2 rounded-xl ${currentTier.bg} border border-white/10`}>
            <span className={`font-bold ${currentTier.color}`}>{currentTier.tier} Member</span>
          </div>
        </div>
      </div>

      {/* Account Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-card p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="text-4xl">👛</div>
            <div>
              <p className="text-white/60 text-sm">Wallet Balance</p>
              <p className="text-3xl font-bold text-white">{walletStars} ⭐</p>
            </div>
          </div>
          <p className="text-sm text-white/50">Ready to spend or save</p>
          <button
            onClick={() => {
              setTransferType('deposit')
              setShowTransferModal(true)
            }}
            disabled={walletStars === 0}
            className="w-full mt-4 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            Deposit to Savings
          </button>
        </div>

        <div className="glass-card p-6 border border-blue-500/30">
          <div className="flex items-center gap-4 mb-4">
            <div className="text-4xl">🏦</div>
            <div>
              <p className="text-white/60 text-sm">Savings Balance</p>
              <p className="text-3xl font-bold text-white">{savingsStars} ⭐</p>
            </div>
          </div>
          <p className="text-sm text-green-400">
            +{currentTier.rate}% monthly interest = +{monthlyInterest} stars/month
          </p>
          <button
            onClick={() => {
              setTransferType('withdraw')
              setShowTransferModal(true)
            }}
            disabled={savingsStars === 0}
            className="w-full mt-4 px-4 py-2 bg-white/10 text-white rounded-xl font-medium hover:bg-white/20 transition-colors disabled:opacity-50"
          >
            Withdraw to Wallet
          </button>
        </div>
      </div>

      {/* Total & Progress to Next Tier */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-white/60 text-sm">Total Stars</p>
            <p className="text-2xl font-bold text-star">{totalStars} ⭐</p>
          </div>
          {nextTier && (
            <div className="text-right">
              <p className="text-white/60 text-sm">Next Tier: {nextTier.tier}</p>
              <p className="text-sm text-white/50">
                {nextTier.minStars - savingsStars} more savings stars needed
              </p>
            </div>
          )}
        </div>
        {nextTier && (
          <div className="progress-bar h-3">
            <div
              className="progress-bar-fill"
              style={{ width: `${Math.min((savingsStars / nextTier.minStars) * 100, 100)}%` }}
            />
          </div>
        )}
      </div>

      {/* Interest Rates */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Interest Rates</h2>
        <div className="space-y-3">
          {INTEREST_TIERS.map((tier, index) => {
            const isCurrentTier = tier.tier === currentTier.tier
            return (
              <div
                key={index}
                className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                  isCurrentTier
                    ? `${tier.bg} border-white/30`
                    : 'bg-white/5 border-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  {isCurrentTier && <span className="text-xl">✓</span>}
                  <div>
                    <p className={`font-medium ${isCurrentTier ? tier.color : 'text-white'}`}>
                      {tier.tier}
                    </p>
                    <p className="text-white/50 text-sm">
                      {tier.maxStars === Infinity
                        ? `${tier.minStars}+ savings stars`
                        : `${tier.minStars}-${tier.maxStars} savings stars`}
                    </p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                  isCurrentTier ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/60'
                }`}>
                  {tier.rate}%/month
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Savings Goals */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <span>🎯</span>
            Savings Goals
          </h2>
          <button
            onClick={() => setShowGoalModal(true)}
            className="px-4 py-2 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors"
          >
            + New Goal
          </button>
        </div>

        {savingsGoals.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-5xl mb-4">🏆</div>
            <p className="text-white/60">No savings goals yet</p>
            <p className="text-sm text-white/40 mt-2">
              Create a goal to save up for something special!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {savingsGoals.map(goal => {
              const progress = goal.target_amount > 0
                ? Math.min((savingsStars / goal.target_amount) * 100, 100)
                : 0
              const canComplete = savingsStars >= goal.target_amount

              return (
                <div key={goal.id} className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{goal.icon || '🎯'}</span>
                      <p className="font-medium text-white">{goal.name}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteGoal(goal)}
                      className="p-1 text-white/40 hover:text-red-400 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="progress-bar h-3 mb-2">
                    <div
                      className={`progress-bar-fill ${canComplete ? 'bg-gradient-to-r from-green-500 to-emerald-500' : ''}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/60">
                      {Math.min(savingsStars, goal.target_amount)} / {goal.target_amount} ⭐
                    </span>
                    {canComplete ? (
                      <span className="text-green-400 font-medium">Goal reached!</span>
                    ) : (
                      <span className="text-white/50">
                        {goal.target_amount - savingsStars} more needed
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Recent Transactions */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Recent Activity</h2>

        {transactions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-white/60">No transactions yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.slice(0, 10).map(tx => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-3 bg-white/5 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">
                    {tx.transaction_type === 'earn' ? '⭐' :
                     tx.transaction_type === 'spend' ? '🛒' :
                     tx.transaction_type === 'savings_deposit' ? '🏦' :
                     tx.transaction_type === 'savings_withdraw' ? '👛' :
                     tx.transaction_type === 'refund' ? '↩️' : '💫'}
                  </span>
                  <div>
                    <p className="text-white text-sm">{tx.description}</p>
                    <p className="text-xs text-white/50">
                      {new Date(tx.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <span className={`font-bold ${
                  tx.transaction_type === 'spend' || tx.transaction_type === 'savings_deposit'
                    ? 'text-red-400'
                    : 'text-green-400'
                }`}>
                  {tx.transaction_type === 'spend' || tx.transaction_type === 'savings_deposit' ? '-' : '+'}
                  {tx.amount} ⭐
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-white mb-4">
              {transferType === 'deposit' ? 'Deposit to Savings' : 'Withdraw from Savings'}
            </h3>

            <div className="space-y-4">
              <div className="flex justify-between text-sm text-white/60 mb-2">
                <span>Available:</span>
                <span>
                  {transferType === 'deposit' ? walletStars : savingsStars} ⭐
                </span>
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-1">Amount</label>
                <input
                  type="number"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  placeholder="Enter amount"
                  min="1"
                  max={transferType === 'deposit' ? walletStars : savingsStars}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white text-lg text-center focus:outline-none focus:border-neon-blue"
                />
              </div>

              <div className="flex gap-2">
                {[10, 25, 50, 100].map(amount => (
                  <button
                    key={amount}
                    onClick={() => setTransferAmount(String(Math.min(amount, transferType === 'deposit' ? walletStars : savingsStars)))}
                    className="flex-1 px-2 py-1 bg-white/10 text-white/70 rounded-lg text-sm hover:bg-white/20 transition-colors"
                  >
                    {amount}
                  </button>
                ))}
                <button
                  onClick={() => setTransferAmount(String(transferType === 'deposit' ? walletStars : savingsStars))}
                  className="flex-1 px-2 py-1 bg-white/10 text-white/70 rounded-lg text-sm hover:bg-white/20 transition-colors"
                >
                  Max
                </button>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowTransferModal(false)
                    setTransferAmount('')
                  }}
                  disabled={transferring}
                  className="flex-1 px-4 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleTransfer}
                  disabled={transferring || !transferAmount || parseInt(transferAmount) <= 0}
                  className={`flex-1 px-4 py-3 text-white rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50 ${
                    transferType === 'deposit'
                      ? 'bg-gradient-to-r from-blue-500 to-cyan-500'
                      : 'bg-gradient-to-r from-orange-500 to-red-500'
                  }`}
                >
                  {transferring ? 'Processing...' : transferType === 'deposit' ? 'Deposit' : 'Withdraw'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Goal Modal */}
      {showGoalModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-white mb-4">Create Savings Goal</h3>

            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <label className="block text-sm text-white/70 mb-1">Icon</label>
                  <input
                    type="text"
                    value={goalForm.icon}
                    onChange={(e) => setGoalForm({ ...goalForm, icon: e.target.value })}
                    className="w-16 px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white text-center text-xl focus:outline-none focus:border-neon-blue"
                    maxLength={2}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm text-white/70 mb-1">Goal Name</label>
                  <input
                    type="text"
                    value={goalForm.name}
                    onChange={(e) => setGoalForm({ ...goalForm, name: e.target.value })}
                    placeholder="e.g., New Game"
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-neon-blue"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-1">Target Amount</label>
                <input
                  type="number"
                  value={goalForm.target_amount}
                  onChange={(e) => setGoalForm({ ...goalForm, target_amount: parseInt(e.target.value) || 0 })}
                  min="1"
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-neon-blue"
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowGoalModal(false)
                    setGoalForm({ name: '', target_amount: 100, icon: '🎯' })
                  }}
                  className="flex-1 px-4 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateGoal}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-neon-blue to-neon-purple text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
                >
                  Create Goal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
