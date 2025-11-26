import { useAuthStore } from '../../stores/authStore'

export default function ParentDashboard() {
  const { user } = useAuthStore()

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="glass-card p-6">
        <h1 className="text-2xl font-bold text-white mb-1">
          Welcome, {user?.roleLabel || 'Parent'}!
        </h1>
        <p className="text-white/70">
          {user?.familyName} Family Dashboard
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Tasks Today', value: '0', icon: '📋', color: 'blue' },
          { label: 'Pending Approval', value: '0', icon: '⏳', color: 'yellow' },
          { label: 'Stars Earned', value: '0', icon: '⭐', color: 'amber' },
          { label: 'Day Streak', value: '0', icon: '🔥', color: 'orange' },
        ].map((stat, index) => (
          <div key={index} className="glass-card p-4 card-hover">
            <div className="text-2xl mb-2">{stat.icon}</div>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className="text-sm text-white/60">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Add Task', icon: '➕', path: '/dashboard/tasks' },
            { label: 'View Schedule', icon: '📅', path: '/dashboard/schedule' },
            { label: 'Award Stars', icon: '⭐', path: '/dashboard/tasks' },
            { label: 'Analytics', icon: '📊', path: '/dashboard/analytics' },
          ].map((action, index) => (
            <button
              key={index}
              className="p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-center"
            >
              <div className="text-2xl mb-2">{action.icon}</div>
              <p className="text-sm text-white/80">{action.label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Pending approvals placeholder */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Pending Approvals</h2>
        <div className="text-center py-8">
          <div className="text-4xl mb-3">✨</div>
          <p className="text-white/60">No pending approvals</p>
          <p className="text-sm text-white/40">Tasks completed by child will appear here</p>
        </div>
      </div>
    </div>
  )
}
