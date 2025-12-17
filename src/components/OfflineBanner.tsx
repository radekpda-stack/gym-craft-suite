import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { cn } from '@/lib/utils';

export function OfflineBanner() {
  const { isOnline } = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-[100]",
        "bg-warning text-warning-foreground",
        "px-4 py-2 text-center text-sm font-medium",
        "flex items-center justify-center gap-2",
        "animate-in slide-in-from-top duration-300"
      )}
    >
      <WifiOff className="w-4 h-4" />
      <span>Jste offline – některé funkce nemusí fungovat</span>
    </div>
  );
}
