import { useEffect, useState } from 'react';
import { isStressTestMode, toggleStressTestMode } from '@/lib/ui-stress-test';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FlaskConical, X } from 'lucide-react';

/**
 * Floating indicator shown when UI stress test mode is active.
 * Only visible in development or when explicitly enabled.
 */
export function StressTestIndicator() {
  const [isActive, setIsActive] = useState(false);
  
  useEffect(() => {
    setIsActive(isStressTestMode());
  }, []);
  
  if (!isActive) return null;
  
  return (
    <div className="fixed bottom-20 right-4 z-[9999] flex items-center gap-2 animate-fade-in">
      <Badge 
        variant="destructive" 
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold shadow-lg"
      >
        <FlaskConical className="w-3.5 h-3.5" />
        UI STRESS TEST
      </Badge>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 rounded-full bg-destructive/20 hover:bg-destructive/30"
        onClick={toggleStressTestMode}
      >
        <X className="w-4 h-4 text-destructive" />
      </Button>
    </div>
  );
}
