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
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Dumbbell className="w-5 h-5 text-primary" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-sm font-semibold">Tréninkový režim</h1>
              <div className="flex items-center gap-1.5">
                {isOnline ? (
                  <Wifi className="w-3 h-3 text-success" />
                ) : (
                  <WifiOff className="w-3 h-3 text-warning" />
                )}
                <span className={cn(
                  "text-[10px]",
                  isOnline ? "text-success" : "text-warning"
                )}>
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="h-9 w-9 rounded-full hover:bg-destructive/10 hover:text-destructive"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
