// Reusable skeleton components for loading states

export function SkeletonPulse({ className = '' }) {
  return (
    <div className={`animate-pulse bg-white/10 rounded ${className}`} />
  )
}

export function CardSkeleton() {
  return (
    <div className="bg-white/5 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-3">
        <SkeletonPulse className="w-10 h-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <SkeletonPulse className="h-4 w-3/4" />
          <SkeletonPulse className="h-3 w-1/2" />
        </div>
      </div>
      <SkeletonPulse className="h-2 w-full rounded-full" />
    </div>
  )
}

export function TaskCardSkeleton() {
  return (
    <div className="bg-white/5 rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          <SkeletonPulse className="w-12 h-12 rounded-xl" />
          <div className="flex-1 space-y-2">
            <SkeletonPulse className="h-4 w-3/4" />
            <SkeletonPulse className="h-3 w-1/2" />
          </div>
        </div>
        <SkeletonPulse className="w-16 h-8 rounded-lg" />
      </div>
    </div>
  )
}

export function StatCardSkeleton() {
  return (
    <div className="bg-white/5 rounded-xl p-4 text-center">
      <SkeletonPulse className="h-8 w-16 mx-auto mb-2" />
      <SkeletonPulse className="h-3 w-20 mx-auto" />
    </div>
  )
}

export function AchievementCardSkeleton() {
  return (
    <div className="bg-white/5 rounded-xl p-4">
      <div className="flex items-center gap-3">
        <SkeletonPulse className="w-14 h-14 rounded-xl" />
        <div className="flex-1 space-y-2">
          <SkeletonPulse className="h-4 w-2/3" />
          <SkeletonPulse className="h-3 w-full" />
          <SkeletonPulse className="h-2 w-full rounded-full" />
        </div>
      </div>
    </div>
  )
}

export function QuestCardSkeleton() {
  return (
    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
      <div className="flex items-start gap-3">
        <SkeletonPulse className="w-12 h-12 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <SkeletonPulse className="h-5 w-3/4" />
          <SkeletonPulse className="h-3 w-full" />
          <SkeletonPulse className="h-2 w-full rounded-full mt-3" />
        </div>
        <SkeletonPulse className="w-16 h-6 rounded-lg" />
      </div>
    </div>
  )
}

export function ProfileHeaderSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4">
      <SkeletonPulse className="w-20 h-20 rounded-full" />
      <div className="space-y-2">
        <SkeletonPulse className="h-6 w-32" />
        <SkeletonPulse className="h-4 w-24" />
        <SkeletonPulse className="h-3 w-40" />
      </div>
    </div>
  )
}

export function ChartSkeleton() {
  return (
    <div className="bg-white/5 rounded-xl p-4">
      <SkeletonPulse className="h-4 w-32 mb-4" />
      <div className="flex items-end gap-2 h-40">
        {[...Array(7)].map((_, i) => (
          <SkeletonPulse
            key={i}
            className="flex-1 rounded-t"
            style={{ height: `${Math.random() * 60 + 20}%` }}
          />
        ))}
      </div>
    </div>
  )
}

export function ListSkeleton({ count = 5, ItemSkeleton = CardSkeleton }) {
  return (
    <div className="space-y-3">
      {[...Array(count)].map((_, i) => (
        <ItemSkeleton key={i} />
      ))}
    </div>
  )
}

export function PageSkeleton() {
  return (
    <div className="space-y-6 p-4">
      <div className="space-y-2">
        <SkeletonPulse className="h-8 w-48" />
        <SkeletonPulse className="h-4 w-64" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
      <ListSkeleton count={3} />
    </div>
  )
}

export default {
  SkeletonPulse,
  CardSkeleton,
  TaskCardSkeleton,
  StatCardSkeleton,
  AchievementCardSkeleton,
  QuestCardSkeleton,
  ProfileHeaderSkeleton,
  ChartSkeleton,
  ListSkeleton,
  PageSkeleton
}
