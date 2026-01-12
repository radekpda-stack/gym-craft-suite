import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Animation type: pulse (default), shimmer, or wave */
  animation?: 'pulse' | 'shimmer' | 'wave';
}

function Skeleton({ className, animation = 'shimmer', ...props }: SkeletonProps) {
  const animationClass = {
    pulse: 'animate-pulse',
    shimmer: 'skeleton-shimmer',
    wave: 'skeleton-wave',
  }[animation];

  return (
    <div 
      className={cn("rounded-md bg-muted", animationClass, className)} 
      {...props} 
    />
  );
}

export { Skeleton };
