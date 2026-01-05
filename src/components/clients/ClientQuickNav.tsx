/**
 * ClientQuickNav Component
 * 
 * Sticky navigation bar with section icons.
 * Clicking scrolls to the section.
 */
import { useMemo } from 'react';
import { 
  StickyNote, 
  Ruler, 
  Stethoscope, 
  MessageSquare, 
  Trophy, 
  Image, 
  Clock,
  Dumbbell,
  CreditCard,
  Award,
  Target,
  BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface NavItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}

interface ClientQuickNavProps {
  notesCount?: number;
  measurementsCount?: number;
  diagnosticsCount?: number;
  feedbackCount?: number;
  mediaCount?: number;
  redFlagCount?: number;
}

export function ClientQuickNav({
  notesCount = 0,
  measurementsCount = 0,
  diagnosticsCount = 0,
  feedbackCount = 0,
  mediaCount = 0,
  redFlagCount = 0,
}: ClientQuickNavProps) {
  const navItems: NavItem[] = useMemo(() => [
    { id: 'trainings', icon: <Dumbbell className="w-4 h-4" />, label: 'Tréninky' },
    { id: 'credit', icon: <CreditCard className="w-4 h-4" />, label: 'Kredit' },
    { id: 'prs', icon: <Award className="w-4 h-4" />, label: 'Rekordy' },
    { id: 'goals', icon: <Target className="w-4 h-4" />, label: 'Cíle' },
    { id: 'diary', icon: <BookOpen className="w-4 h-4" />, label: 'Deník' },
    { id: 'notes', icon: <StickyNote className="w-4 h-4" />, label: 'Poznámky', badge: notesCount },
    { id: 'measurements', icon: <Ruler className="w-4 h-4" />, label: 'Měření', badge: measurementsCount },
    { id: 'diagnostics', icon: <Stethoscope className="w-4 h-4" />, label: 'Diagnostika', badge: diagnosticsCount },
    { id: 'feedback', icon: <MessageSquare className="w-4 h-4" />, label: 'Zpětná vazba', badge: feedbackCount },
    { id: 'media', icon: <Image className="w-4 h-4" />, label: 'Média', badge: mediaCount },
    { id: 'timeline', icon: <Clock className="w-4 h-4" />, label: 'Časová osa' },
  ], [notesCount, measurementsCount, diagnosticsCount, feedbackCount, mediaCount]);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(`section-${sectionId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="glass rounded-xl p-2 sticky top-[88px] z-20 overflow-x-auto scrollbar-hide">
      <div className="flex items-center gap-1 min-w-max">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => scrollToSection(item.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium",
              "transition-colors hover:bg-secondary/50 text-muted-foreground hover:text-foreground",
              "whitespace-nowrap relative"
            )}
          >
            {item.icon}
            <span className="hidden sm:inline">{item.label}</span>
            {item.badge && item.badge > 0 && (
              <Badge 
                variant="secondary" 
                className={cn(
                  "h-4 min-w-4 px-1 text-[10px]",
                  redFlagCount > 0 && item.id === 'feedback' && "bg-destructive/20 text-destructive"
                )}
              >
                {item.badge}
              </Badge>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
