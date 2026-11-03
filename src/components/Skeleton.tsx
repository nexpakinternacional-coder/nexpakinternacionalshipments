export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-border rounded ${className}`} />
}

export function SkeletonFilaTabla() {
  return (
    <tr className="border-b border-border">
      <td className="px-4 py-3.5">
        <Skeleton className="h-4 w-24" />
      </td>
      <td className="px-4 py-3.5">
        <Skeleton className="h-4 w-40" />
      </td>
      <td className="px-4 py-3.5 hidden md:table-cell">
        <Skeleton className="h-4 w-28" />
      </td>
      <td className="px-4 py-3.5">
        <Skeleton className="h-6 w-32 rounded-full" />
      </td>
      <td className="px-4 py-3.5 hidden lg:table-cell">
        <Skeleton className="h-4 w-16" />
      </td>
      <td className="px-4 py-3.5 hidden lg:table-cell">
        <Skeleton className="h-4 w-24" />
      </td>
    </tr>
  )
}

export function SkeletonTarjeta() {
  return (
    <div className="bg-surface border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-6 w-28 rounded-full" />
      </div>
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-4 w-36" />
    </div>
  )
}
