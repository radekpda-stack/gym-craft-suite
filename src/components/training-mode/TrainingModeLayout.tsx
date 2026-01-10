import { ReactNode } from 'react';
import { X, Dumbbell, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useTrainingMode } from '@/hooks/useTrainingMode';
import { cn } from '@/lib/utils';

interface TrainingModeLayoutProps {
  children: ReactNode;
}

export function TrainingModeLayout({ children }: TrainingModeLayoutProps) {
  const navigate = useNavigate();
  const { exitTrainingMode } = useTrainingMode();
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  const handleClose = () => {
    exitTrainingMode();
    navigate('/');
  };

  return (
    <div className="h-[100dvh] bg-background flex flex-col overflow-hidden">
      {/* Header - compact mobile optimized */}
      <header className="shrink-0 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 safe-area-top">
        <div className="flex items-center justify-between h-12 px-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Dumbbell className="w-5 h-5 text-primary" />
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold">Trénink</h1>
              <div className={cn(
                "flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium",
                isOnline ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
              )}>
                {isOnline ? (
                  <Wifi className="w-2.5 h-2.5" />
                ) : (
                  <WifiOff className="w-2.5 h-2.5" />
                )}
                {isOnline ? 'Online' : 'Offline'}
              </div>
            </div>
          </div>
          
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="h-10 w-10 rounded-xl hover:bg-destructive/10 hover:text-destructive active:scale-95 transition-transform"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Main content - flex-1 with min-h-0 for proper overflow in children */}
      <main className="flex-1 min-h-0 flex flex-col">
        {children}
      </main>
    </div>
  );
}
