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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header - mobile optimized */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 safe-area-top">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Dumbbell className="w-6 h-6 text-primary" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-base font-semibold">Tréninkový režim</h1>
              <div className="flex items-center gap-1.5">
                {isOnline ? (
                  <Wifi className="w-3 h-3 text-success" />
                ) : (
                  <WifiOff className="w-3 h-3 text-warning" />
                )}
                <span className={cn(
                  "text-[10px] font-medium",
                  isOnline ? "text-success" : "text-warning"
                )}>
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
          </div>
          
          {/* Larger close button for mobile */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="h-12 w-12 rounded-xl hover:bg-destructive/10 hover:text-destructive active:scale-95 transition-transform"
          >
            <X className="w-6 h-6" />
          </Button>
        </div>
      </header>

      {/* Main content with safe area */}
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
