import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Animation type: pulse, shimmer (default), or wave */
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
      className={cn(
        "rounded-xl bg-muted/40",
        animationClass,
        className
      )} 
      {...props} 
    />
  );
}

export { Skeleton };
