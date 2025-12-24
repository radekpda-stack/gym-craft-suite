import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, AlertTriangle, MessageSquare, Calendar, CreditCard } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { STATUS_CONFIG, getCreditStatus } from '@/lib/statusUtils';
import { format, differenceInDays } from 'date-fns';
import { cs } from 'date-fns/locale';

interface ClientStickyHeaderProps {
  client: {
    id: string;
    name: string;
    payment_mode?: string | null;
  };
  creditBalance: number;
  unpaidCount: number;
  lastTrainingDate?: string | null;
  lastFeedbackDate?: string | null;
  hasRedFlag?: boolean;
}

export function ClientStickyHeader({
  client,
  creditBalance,
  unpaidCount,
  lastTrainingDate,
  lastFeedbackDate,
  hasRedFlag,
}: ClientStickyHeaderProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show sticky header after scrolling past 200px
      setIsVisible(window.scrollY > 200);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const creditStatus = getCreditStatus(creditBalance, unpaidCount > 0);
  const statusConfig = STATUS_CONFIG[creditStatus];

  const formatRelativeDate = (date: string | null | undefined) => {
    if (!date) return null;
    const days = differenceInDays(new Date(), new Date(date));
    if (days === 0) return 'dnes';
    if (days === 1) return 'včera';
    if (days < 7) return `před ${days} dny`;
    return format(new Date(date), 'd.M.', { locale: cs });
  };

  if (!isVisible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border/50 shadow-sm animate-in slide-in-from-top duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 gap-4">
          {/* Left: Back + Avatar + Name */}
          <div className="flex items-center gap-3 min-w-0">
            <Link 
              to="/clients" 
              className="p-1.5 -ml-1.5 rounded-lg hover:bg-secondary/50 transition-colors shrink-0"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                {client.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <span className="font-semibold text-foreground truncate">{client.name}</span>
          </div>

          {/* Right: Key stats */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Red flag indicator */}
            {hasRedFlag && (
              <Badge variant="destructive" className="gap-1 h-7">
                <AlertTriangle className="w-3 h-3" />
                Red flag
              </Badge>
            )}

            {/* Last training */}
            {lastTrainingDate && (
              <div className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>{formatRelativeDate(lastTrainingDate)}</span>
              </div>
            )}

            {/* Last feedback */}
            {lastFeedbackDate && (
              <div className="hidden md:flex items-center gap-1.5 text-sm text-muted-foreground">
                <MessageSquare className="w-4 h-4" />
                <span>{formatRelativeDate(lastFeedbackDate)}</span>
              </div>
            )}

            {/* Credit balance */}
            {client.payment_mode !== 'cash_only' && (
              <div className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm font-bold',
                statusConfig.bgClass,
                statusConfig.textClass
              )}>
                <CreditCard className="w-4 h-4" />
                {formatCurrency(creditBalance)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
