import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronDown, 
  ChevronRight,
  Calendar,
  MessageSquare,
  StickyNote,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTrainingSessions } from '@/hooks/useTrainingSessions';
import { useClientFeedback } from '@/hooks/useTrainingFeedback';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface ClientHistoryCollapsedProps {
  clientId: string;
  notes?: string | null;
}

export function ClientHistoryCollapsed({ clientId, notes }: ClientHistoryCollapsedProps) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  
  const { data: sessions = [] } = useTrainingSessions(clientId);
  const { data: feedbackData = [] } = useClientFeedback(clientId);
  
  // Get last 3 trainings
  const recentTrainings = sessions
    .filter((s: any) => s.status === 'completed' || s.status === 'cancelled')
    .slice(0, 3);
  
  // Get last 3 feedbacks
  const recentFeedback = feedbackData.slice(0, 3);
  
  // Parse recent notes
  const recentNotes = notes
    ?.split('\n\n')
    .filter(n => n.startsWith('['))
    .slice(0, 3) || [];

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button className="w-full glass rounded-2xl p-4 flex items-center justify-between hover:bg-secondary/30 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-secondary/50">
              <Calendar className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="text-left">
              <p className="font-medium text-foreground">Historie & kontext</p>
              <p className="text-sm text-muted-foreground">
                {recentTrainings.length} tréninků • {recentFeedback.length} feedbacků
              </p>
            </div>
          </div>
          {isOpen ? (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          )}
        </button>
      </CollapsibleTrigger>
      
      <CollapsibleContent>
        <div className="mt-2 space-y-4 p-4 glass rounded-2xl">
          {/* Recent Trainings */}
          {recentTrainings.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Poslední tréninky
              </p>
              <div className="space-y-1">
                {recentTrainings.map((training: any) => (
                  <button
                    key={training.id}
                    onClick={() => navigate(`/trainings/${training.id}`)}
                    className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-secondary/50 transition-colors text-left"
                  >
                    {training.status === 'completed' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-muted-foreground shrink-0" />
                    )}
                    <span className="flex-1 text-sm text-foreground truncate">
                      {format(new Date(training.date), 'd.M. HH:mm', { locale: cs })}
                    </span>
                    {training.rpe && (
                      <span className={cn(
                        'text-xs px-2 py-0.5 rounded',
                        training.rpe >= 8 ? 'bg-warning/20 text-warning' : 'bg-secondary text-muted-foreground'
                      )}>
                        RPE {training.rpe}
                      </span>
                    )}
                    <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Recent Feedback */}
          {recentFeedback.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Poslední feedback
              </p>
              <div className="space-y-1">
                {recentFeedback.map((fb: any) => (
                  <div
                    key={fb.id}
                    className="flex items-center gap-3 p-2 rounded-xl bg-secondary/30"
                  >
                    <MessageSquare className={cn(
                      'w-4 h-4 shrink-0',
                      fb.is_red_flag ? 'text-destructive' :
                      fb.pain >= 5 ? 'text-warning' : 'text-muted-foreground'
                    )} />
                    <span className="flex-1 text-sm text-foreground">
                      {format(new Date(fb.training_date), 'd.M.', { locale: cs })}
                    </span>
                    {fb.pain > 0 && (
                      <span className={cn(
                        'text-xs',
                        fb.pain >= 5 ? 'text-warning' : 'text-muted-foreground'
                      )}>
                        Bolest {fb.pain}/10
                      </span>
                    )}
                    {fb.is_red_flag && (
                      <span className="text-xs text-destructive font-medium">
                        Red flag
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Recent Notes */}
          {recentNotes.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Poznámky trenéra
              </p>
              <div className="space-y-1">
                {recentNotes.map((note, i) => {
                  const [datePart, ...contentParts] = note.split('\n');
                  const content = contentParts.join(' ').trim();
                  const dateMatch = datePart.match(/\[(.*?)\]/);
                  const date = dateMatch?.[1] || '';
                  
                  return (
                    <div
                      key={i}
                      className="p-2 rounded-xl bg-secondary/30"
                    >
                      <p className="text-xs text-muted-foreground mb-1">{date}</p>
                      <p className="text-sm text-foreground line-clamp-2">{content}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Empty state */}
          {recentTrainings.length === 0 && recentFeedback.length === 0 && recentNotes.length === 0 && (
            <div className="text-center py-4 text-muted-foreground text-sm">
              Zatím žádná historie
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
