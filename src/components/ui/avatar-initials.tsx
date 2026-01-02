import { cn } from '@/lib/utils';

interface AvatarInitialsProps {
  name: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base'
};

// Generate consistent color based on name
function getColorFromName(name: string): string {
  const colors = [
    'bg-blue-500/15 text-blue-700 dark:text-blue-400',
    'bg-green-500/15 text-green-700 dark:text-green-400',
    'bg-purple-500/15 text-purple-700 dark:text-purple-400',
    'bg-orange-500/15 text-orange-700 dark:text-orange-400',
    'bg-pink-500/15 text-pink-700 dark:text-pink-400',
    'bg-teal-500/15 text-teal-700 dark:text-teal-400',
    'bg-indigo-500/15 text-indigo-700 dark:text-indigo-400',
    'bg-rose-500/15 text-rose-700 dark:text-rose-400',
  ];
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function AvatarInitials({ name, className, size = 'md' }: AvatarInitialsProps) {
  const initials = getInitials(name);
  const colorClass = getColorFromName(name);
  
  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-medium shrink-0',
        sizeClasses[size],
        colorClass,
        className
      )}
    >
      {initials}
    </div>
  );
}
