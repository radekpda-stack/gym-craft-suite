import { cn } from '@/lib/utils';

interface ClientAvatarProps {
  name: string;
  avatar?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-lg',
  xl: 'w-20 h-20 text-2xl',
};

const colors = [
  'from-orange-500 to-amber-500',
  'from-emerald-500 to-teal-500',
  'from-blue-500 to-cyan-500',
  'from-purple-500 to-pink-500',
  'from-rose-500 to-red-500',
];

function getColorFromName(name: string): string {
  const charSum = name.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return colors[charSum % colors.length];
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function ClientAvatar({ name, avatar, size = 'md', className }: ClientAvatarProps) {
  if (avatar) {
    return (
      <img
        src={avatar}
        alt={name}
        className={cn(
          'rounded-full object-cover',
          sizeClasses[size],
          className
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-semibold text-white bg-gradient-to-br',
        sizeClasses[size],
        getColorFromName(name),
        className
      )}
    >
      {getInitials(name)}
    </div>
  );
}
