/**
 * ClientTrainingHistory Component
 * 
 * Displays training session history with:
 * - Filters: Vše | Dokončeno | Zrušeno (strženo) | Zrušeno (bez) | Přesunuto
 * - Each row shows: date/time, pricing_type, status, credit impact, credit source
 * - Quick actions: change status, reschedule
 */
import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Calendar, 
  ChevronRight,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';

interface TrainingSession {
  id: string;
  date: string;
  status: string;
  duration?: number;
  final_price?: number | null;
  payment_status?: string | null;
  participant_count?: number | null;
}

type FilterType = 'all' | 'completed' | 'cancelled_charged' | 'cancelled_free' | 'scheduled';

interface ClientTrainingHistoryProps {
  clientId: string;
  sessions: TrainingSession[];
  isSharedBudget?: boolean;
  budgetGroupName?: string | null;
  isLoading?: boolean;
  defaultLimit?: number;
}

const FILTER_OPTIONS: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'Vše' },
  { value: 'completed', label: 'Dokončeno' },
  { value: 'cancelled_charged', label: 'Zrušeno (strženo)' },
  { value: 'cancelled_free', label: 'Zrušeno (bez)' },
  { value: 'scheduled', label: 'Naplánováno' },
];

export function ClientTrainingHistory({
  clientId,
  sessions,
  isSharedBudget = false,
  budgetGroupName,
  isLoading = false,
  defaultLimit = 15,
}: ClientTrainingHistoryProps) {
  const [filter, setFilter] = useState<FilterType>('all');
  const [showAll, setShowAll] = useState(false);

  // Filter sessions
  const filteredSessions = useMemo(() => {
    let result = [...sessions];

    switch (filter) {
      case 'completed':
        result = result.filter(s => s.status === 'completed');
        break;
      case 'cancelled_charged':
        result = result.filter(s => s.status === 'canceled' && s.final_price && s.final_price > 0);
        break;
      case 'cancelled_free':
        result = result.filter(s => s.status === 'canceled' && (!s.final_price || s.final_price === 0));
        break;
      case 'scheduled':
        result = result.filter(s => s.status === 'scheduled');
        break;
    }

    // Sort by date descending
    result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return showAll ? result : result.slice(0, defaultLimit);
  }, [sessions, filter, showAll, defaultLimit]);

  const totalCount = useMemo(() => {
    switch (filter) {
      case 'completed':
        return sessions.filter(s => s.status === 'completed').length;
      case 'cancelled_charged':
        return sessions.filter(s => s.status === 'canceled' && s.final_price && s.final_price > 0).length;
      case 'cancelled_free':
        return sessions.filter(s => s.status === 'canceled' && (!s.final_price || s.final_price === 0)).length;
      case 'scheduled':
        return sessions.filter(s => s.status === 'scheduled').length;
      default:
        return sessions.length;
    }
  }, [sessions, filter]);

  const getPricingType = (participantCount: number | null | undefined): string => {
    const count = participantCount || 1;
    if (count === 1) return 'Solo';
    if (count === 2) return 'Duo';
    if (count === 3) return 'Trio';
    return `${count}x`;
  };

  const getStatusBadge = (session: TrainingSession) => {
    switch (session.status) {
      case 'completed':
        return (
          <Badge className="bg-success/10 text-success border-success/20 text-xs">
            <CheckCircle className="w-3 h-3 mr-1" />
            Dokončeno
          </Badge>
        );
      case 'canceled':
        return (
          <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-xs">
            <XCircle className="w-3 h-3 mr-1" />
            Zrušeno
          </Badge>
        );
      case 'scheduled':
        return (
          <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
            <Clock className="w-3 h-3 mr-1" />
            Naplánováno
          </Badge>
        );
      default:
        return null;
    }
  };

  const getCreditImpact = (session: TrainingSession) => {
    if (session.status === 'scheduled') return null;
    
    const price = session.final_price || 0;
    if (price > 0) {
      return (
        <span className="text-destructive font-medium">
          −{formatCurrency(price)}
        </span>
      );
    }
    return <span className="text-muted-foreground">0 Kč</span>;
  };

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-foreground">
          <Calendar className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Tréninková historie</h3>
          <span className="text-sm text-muted-foreground">({totalCount})</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {FILTER_OPTIONS.map(option => (
          <Button
            key={option.value}
            variant={filter === option.value ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setFilter(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>

      {/* Sessions list */}
      {filteredSessions.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          Žádné tréninky v této kategorii
        </p>
      ) : (
        <div className="space-y-1">
          {filteredSessions.map(session => (
            <Link
              key={session.id}
              to={`/trainings/${session.id}`}
              className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary/50 transition-colors group"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {/* Date/Time */}
                <div className="min-w-[100px]">
                  <p className="text-sm font-medium text-foreground">
                    {format(new Date(session.date), "d.M.yyyy", { locale: cs })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(session.date), "HH:mm", { locale: cs })}
                  </p>
                </div>

                {/* Pricing type */}
                <Badge variant="outline" className="text-xs shrink-0">
                  {getPricingType(session.participant_count)}
                </Badge>

                {/* Status */}
                {getStatusBadge(session)}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {/* Credit impact */}
                <div className="text-right min-w-[70px]">
                  {getCreditImpact(session)}
                </div>

                {/* Credit source (if shared) */}
                {isSharedBudget && session.status !== 'scheduled' && session.final_price && session.final_price > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    <Users className="w-3 h-3 mr-1" />
                    Skupina
                  </Badge>
                )}

                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Show more */}
      {totalCount > defaultLimit && !showAll && (
        <Button
          variant="ghost"
          className="w-full mt-2 text-sm"
          onClick={() => setShowAll(true)}
        >
          Zobrazit vše ({totalCount})
        </Button>
      )}
    </div>
  );
}
