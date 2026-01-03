/**
 * ClientHeaderCompact Component
 * 
 * Sticky header showing:
 * - Client name + avatar
 * - Tags/goals (chips)
 * - Contact icons (tap to call/email/WhatsApp)
 * - Birth year + age
 * - "Chodí od" with edit capability
 * - "U tebe X měsíců"
 * - Red flag indicator
 * - Last portal login
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ChevronLeft, 
  Phone, 
  Mail, 
  MessageCircle,
  Calendar,
  Edit2,
  Check,
  X,
  Copy,
  AlertTriangle,
  Globe,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { format, differenceInYears, differenceInMonths, formatDistanceToNow } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Client } from '@/hooks/useClients';
import { toast } from '@/hooks/use-toast';

interface ClientHeaderCompactProps {
  client: Client;
  onUpdateTrainingStartDate?: (date: string | null) => Promise<void>;
  redFlagCount?: number;
  lastPortalLogin?: string | null;
}

export function ClientHeaderCompact({ 
  client, 
  onUpdateTrainingStartDate,
  redFlagCount = 0,
  lastPortalLogin,
}: ClientHeaderCompactProps) {
  const [isEditingStartDate, setIsEditingStartDate] = useState(false);
  const [startDateInput, setStartDateInput] = useState('');

  // Calculate age from birth_date
  const age = client.birth_date 
    ? differenceInYears(new Date(), new Date(client.birth_date))
    : null;

  const birthYear = client.birth_date 
    ? new Date(client.birth_date).getFullYear()
    : null;

  // Training start date - use training_start_date or fallback to created_at
  const trainingStartDate = client.training_start_date 
    ? new Date(client.training_start_date)
    : new Date(client.created_at);

  // Calculate months with trainer
  const monthsWithTrainer = differenceInMonths(new Date(), trainingStartDate);

  const handleCopyContact = async (value: string, type: string) => {
    await navigator.clipboard.writeText(value);
    toast({ title: `${type} zkopírován` });
  };

  const handleSaveStartDate = async () => {
    if (onUpdateTrainingStartDate && startDateInput) {
      await onUpdateTrainingStartDate(startDateInput);
    }
    setIsEditingStartDate(false);
  };

  const handleStartEditDate = () => {
    const date = client.training_start_date || format(new Date(client.created_at), 'yyyy-MM-dd');
    setStartDateInput(date);
    setIsEditingStartDate(true);
  };

  return (
    <div className="glass rounded-2xl p-4 sticky top-0 z-30 backdrop-blur-lg">
      {/* Top row: Avatar + Name + Back */}
      <div className="flex items-center gap-3">
        <Link 
          to="/clients" 
          className="p-2 -ml-2 rounded-full hover:bg-secondary/50 transition-colors shrink-0 md:hidden"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        
        <Avatar className="h-12 w-12 shrink-0">
          <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
            {client.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-foreground truncate">{client.name}</h1>
          
          {/* Age + Birth year */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {birthYear && (
              <>
                <span className="font-medium text-foreground">{birthYear}</span>
                {age && <span className="text-xs">({age} let)</span>}
              </>
            )}
          </div>
        </div>

        {/* Red flag + Contact icons */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Red flag indicator */}
          {redFlagCount > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="p-2 rounded-full bg-destructive/10">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{redFlagCount}× červený signál ve feedbacku</p>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Portal login indicator */}
          {lastPortalLogin && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="p-2 rounded-full hover:bg-secondary/50 transition-colors">
                  <Globe className="w-4 h-4 text-success" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>V zóně {formatDistanceToNow(new Date(lastPortalLogin), { locale: cs, addSuffix: true })}</p>
              </TooltipContent>
            </Tooltip>
          )}

          {client.phone && (
            <>
              <a 
                href={`tel:${client.phone}`}
                className="p-2 rounded-full hover:bg-secondary/50 transition-colors"
                title="Zavolat"
              >
                <Phone className="w-4 h-4 text-muted-foreground" />
              </a>
              <a 
                href={`https://wa.me/${client.phone.replace(/\s/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full hover:bg-secondary/50 transition-colors"
                title="WhatsApp"
              >
                <MessageCircle className="w-4 h-4 text-muted-foreground" />
              </a>
            </>
          )}
          {client.email && (
            <a 
              href={`mailto:${client.email}`}
              className="p-2 rounded-full hover:bg-secondary/50 transition-colors"
              title="Email"
            >
              <Mail className="w-4 h-4 text-muted-foreground" />
            </a>
          )}
          {(client.phone || client.email) && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleCopyContact(client.phone || client.email || '', client.phone ? 'Telefon' : 'Email')}
              title="Kopírovat kontakt"
            >
              <Copy className="w-3 h-3 text-muted-foreground" />
            </Button>
          )}
        </div>
      </div>

      {/* Tags row */}
      {client.training_goals && client.training_goals.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {client.training_goals.slice(0, 4).map((goal, i) => (
            <Badge key={i} variant="secondary" className="text-xs">
              {goal}
            </Badge>
          ))}
          {client.training_goals.length > 4 && (
            <Badge variant="outline" className="text-xs">
              +{client.training_goals.length - 4}
            </Badge>
          )}
        </div>
      )}

      {/* "Chodí od" row */}
      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border/50 text-sm">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span className="text-muted-foreground">Chodí od:</span>
          
          {isEditingStartDate ? (
            <div className="flex items-center gap-1">
              <Input
                type="date"
                value={startDateInput}
                onChange={(e) => setStartDateInput(e.target.value)}
                className="h-7 w-32 text-xs"
              />
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleSaveStartDate}>
                <Check className="w-3 h-3 text-success" />
              </Button>
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setIsEditingStartDate(false)}>
                <X className="w-3 h-3 text-destructive" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <span className="font-medium text-foreground">
                {format(trainingStartDate, 'MMMM yyyy', { locale: cs })}
              </span>
              {onUpdateTrainingStartDate && (
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-6 w-6"
                  onClick={handleStartEditDate}
                >
                  <Edit2 className="w-3 h-3 text-muted-foreground" />
                </Button>
              )}
            </div>
          )}
        </div>

        <span className="text-muted-foreground">•</span>
        
        <span className="text-muted-foreground">
          U tebe: <span className="font-medium text-foreground">{monthsWithTrainer} měsíců</span>
        </span>
      </div>
    </div>
  );
}
