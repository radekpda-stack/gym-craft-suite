import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CreateTrainingSheet } from '@/components/trainings/CreateTrainingSheet';

export function DashboardActions() {
  const [showTrainingSheet, setShowTrainingSheet] = useState(false);
  
  return (
    <>
      {/* Fixed bottom action bar - hidden on mobile where MobileNav is shown */}
      <div className="hidden lg:block fixed bottom-4 left-0 right-0 z-[60] px-4 pointer-events-none">
        <div className="max-w-lg mx-auto">
          <div className="liquid-glass-strong rounded-2xl p-2 pointer-events-auto">
            <div className="flex items-center justify-around gap-2">
              {/* New Training */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowTrainingSheet(true)}
                className="flex-1 h-12 rounded-xl hover:bg-primary/10 flex flex-col items-center gap-0.5"
              >
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <Plus className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="text-[10px] text-muted-foreground">Nový</span>
              </Button>
              
              {/* Statistics */}
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="flex-1 h-12 rounded-xl hover:bg-secondary/50 flex flex-col items-center gap-0.5"
              >
                <Link to="/statistics">
                  <BarChart3 className="w-5 h-5 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">Statistiky</span>
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* CreateTrainingSheet manages its own data */}
      <CreateTrainingSheet
        open={showTrainingSheet}
        onOpenChange={setShowTrainingSheet}
      />
    </>
  );
}
