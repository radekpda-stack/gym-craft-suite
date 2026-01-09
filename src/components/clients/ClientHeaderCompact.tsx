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
 * - Days since training badge
 * - Training streak badge
 */
import { useState } from 'react';
import { CreditLedgerExportDialog } from '@/components/credit/CreditLedgerExportDialog';
import { ClientPerformanceExportDialog } from '@/components/clients/ClientPerformanceExportDialog';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  ChevronDown,
  ChevronUp,
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
  FileText,
  Settings,
  BarChart3,
  User,
  Hand,
  Briefcase,
  Moon,
  Activity,
  Dumbbell,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { format, differenceInYears, differenceInMonths, formatDistanceToNow } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Client } from '@/hooks/useClients';
import { ClientFormValues } from '@/lib/validations/client';
import { toast } from '@/hooks/use-toast';
import { ClientDaysSinceBadge } from './ClientDaysSinceBadge';
import { ClientStreakBadge } from './ClientStreakBadge';
import { CreditStatementDialog } from '@/components/credit/CreditStatementDialog';
import { PdfSettingsDialog } from '@/components/credit/PdfSettingsDialog';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ClientHeaderCompactProps {
  client: Client;
  onUpdateClient?: (data: Partial<ClientFormValues>) => Promise<void>;
  onUpdateTrainingStartDate?: (date: string | null) => Promise<void>;
  redFlagCount?: number;
  lastPortalLogin?: string | null;
}

export function ClientHeaderCompact({ 
  client, 
  onUpdateClient,
  onUpdateTrainingStartDate,
  redFlagCount = 0,
  lastPortalLogin,
}: ClientHeaderCompactProps) {
  // Check if client is in a budget group
  const { data: budgetGroup } = useQuery({
    queryKey: ['client-budget-group', client.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('client_budget_members')
        .select('group_id, client_budget_groups(id, name)')
        .eq('client_id', client.id)
        .maybeSingle();
      return data;
    },
  });
  const [isEditingStartDate, setIsEditingStartDate] = useState(false);
  const [startDateInput, setStartDateInput] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  
  // Editable profile fields
  const [editPhone, setEditPhone] = useState(client.phone || '');
  const [editEmail, setEditEmail] = useState(client.email || '');
  const [editGender, setEditGender] = useState<'male' | 'female' | null>(client.gender);
  const [editHandedness, setEditHandedness] = useState<'left' | 'right' | 'ambidextrous' | null>(client.handedness as 'left' | 'right' | 'ambidextrous' | null);
  const [editOccupation, setEditOccupation] = useState(client.occupation || '');
  const [editSleepHours, setEditSleepHours] = useState<number | null>(client.sleep_hours);
  const [editStressLevel, setEditStressLevel] = useState<number | null>(client.stress_level);

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

  const handleStartEditProfile = () => {
    setEditPhone(client.phone || '');
    setEditEmail(client.email || '');
    setEditGender(client.gender);
    setEditHandedness(client.handedness as 'left' | 'right' | 'ambidextrous' | null);
    setEditOccupation(client.occupation || '');
    setEditSleepHours(client.sleep_hours);
    setEditStressLevel(client.stress_level);
    setIsEditingProfile(true);
  };

  const handleSaveProfile = async () => {
    if (onUpdateClient) {
      await onUpdateClient({
        phone: editPhone || null,
        email: editEmail,
        gender: editGender,
        handedness: editHandedness,
        occupation: editOccupation || null,
        sleep_hours: editSleepHours,
        stress_level: editStressLevel,
      });
      toast({ title: 'Profil aktualizován' });
    }
    setIsEditingProfile(false);
  };

  const getGenderLabel = (gender: 'male' | 'female' | null) => {
    if (gender === 'male') return 'Muž';
    if (gender === 'female') return 'Žena';
    return 'Neuvedeno';
  };

  const getHandednessLabel = (hand: string | null) => {
    if (hand === 'right') return 'Pravák';
    if (hand === 'left') return 'Levák';
    if (hand === 'ambidextrous') return 'Obouruký';
    return 'Neuvedeno';
  };

  return (
    <div className="glass rounded-2xl p-3 sm:p-4 sticky top-0 z-30 backdrop-blur-lg">
      {/* Row 1: Back + Avatar + Name + Year/Age */}
      <div className="flex items-center gap-2 sm:gap-3">
        <Link 
          to="/clients" 
          className="p-1.5 -ml-1.5 rounded-full hover:bg-secondary/50 transition-colors shrink-0 md:hidden"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        
        <Avatar className="h-10 w-10 sm:h-12 sm:w-12 shrink-0">
          <AvatarFallback className="bg-primary/10 text-primary text-base sm:text-lg font-semibold">
            {client.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <h1 className="text-lg sm:text-xl font-bold text-foreground truncate">{client.name}</h1>
          {birthYear && (
            <div className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{birthYear}</span>
              {age && <span className="text-[10px] sm:text-xs">({age} let)</span>}
            </div>
          )}
        </div>

        {/* Desktop: PDF + Badges + Indicators */}
        <div className="hidden sm:flex items-center gap-1 shrink-0">
          <ClientDaysSinceBadge clientId={client.id} />
          <ClientStreakBadge clientId={client.id} />
          
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

        {/* PDF Export dropdown menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 shrink-0 h-8 px-2 sm:px-3">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">PDF</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <CreditStatementDialog
              clientId={client.id}
              clientName={client.name}
              clientEmail={client.email || undefined}
              clientPhone={client.phone || undefined}
              isSharedBudget={!!budgetGroup}
              budgetGroupId={budgetGroup?.group_id}
              trigger={
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <FileText className="w-4 h-4 mr-2" />
                  PDF výpis (tréninkový)
                </DropdownMenuItem>
              }
            />
            <CreditLedgerExportDialog
              clientId={client.id}
              clientName={client.name}
              clientEmail={client.email || undefined}
              isSharedBudget={!!budgetGroup}
              budgetGroupId={budgetGroup?.group_id}
              trigger={
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <FileText className="w-4 h-4 mr-2" />
                  Výpis kreditu
                </DropdownMenuItem>
              }
            />
            <ClientPerformanceExportDialog
              clientId={client.id}
              clientName={client.name}
              trigger={
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Export výkonu
                </DropdownMenuItem>
              }
            />
            <DropdownMenuSeparator />
            <PdfSettingsDialog
              trigger={
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <Settings className="w-4 h-4 mr-2" />
                  Nastavení PDF
                </DropdownMenuItem>
              }
            />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Row 2: Mobile badges + indicators */}
      <div className="flex items-center gap-1 mt-2 sm:hidden flex-wrap">
        <ClientDaysSinceBadge clientId={client.id} />
        <ClientStreakBadge clientId={client.id} />
        
        {redFlagCount > 0 && (
          <div className="p-1.5 rounded-full bg-destructive/10">
            <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
          </div>
        )}

        {lastPortalLogin && (
          <div className="p-1.5 rounded-full bg-success/10">
            <Globe className="w-3.5 h-3.5 text-success" />
          </div>
        )}

        <div className="flex-1" />

        {client.phone && (
          <>
            <a 
              href={`tel:${client.phone}`}
              className="p-1.5 rounded-full hover:bg-secondary/50 transition-colors"
            >
              <Phone className="w-4 h-4 text-muted-foreground" />
            </a>
            <a 
              href={`https://wa.me/${client.phone.replace(/\s/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-full hover:bg-secondary/50 transition-colors"
            >
              <MessageCircle className="w-4 h-4 text-muted-foreground" />
            </a>
          </>
        )}
        {client.email && (
          <a 
            href={`mailto:${client.email}`}
            className="p-1.5 rounded-full hover:bg-secondary/50 transition-colors"
          >
            <Mail className="w-4 h-4 text-muted-foreground" />
          </a>
        )}
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

      {/* "Chodí od" row - clickable to expand */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-3 mt-3 pt-3 border-t border-border/50 text-sm hover:bg-secondary/30 -mx-3 sm:-mx-4 px-3 sm:px-4 py-2 transition-colors rounded-lg"
      >
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span className="text-muted-foreground">Chodí od:</span>
          
          {isEditingStartDate ? (
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
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
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartEditDate();
                  }}
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

        <div className="flex-1" />
        
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {/* Expanded profile details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pt-3 pb-1 space-y-3">
              {isEditingProfile ? (
                // Edit mode
                <div className="space-y-3 bg-secondary/30 rounded-xl p-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground">Telefon</label>
                      <Input
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        placeholder="+420..."
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground">Email</label>
                      <Input
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        placeholder="email@example.com"
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground">Pohlaví</label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={editGender === 'male' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setEditGender('male')}
                          className="flex-1"
                        >
                          Muž
                        </Button>
                        <Button
                          type="button"
                          variant={editGender === 'female' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setEditGender('female')}
                          className="flex-1"
                        >
                          Žena
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground">Dominantní ruka</label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={editHandedness === 'right' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setEditHandedness('right')}
                          className="flex-1"
                        >
                          Pravák
                        </Button>
                        <Button
                          type="button"
                          variant={editHandedness === 'left' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setEditHandedness('left')}
                          className="flex-1"
                        >
                          Levák
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground">Zaměstnání</label>
                      <Input
                        value={editOccupation}
                        onChange={(e) => setEditOccupation(e.target.value)}
                        placeholder="Programátor, učitel..."
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground">Hodiny spánku</label>
                      <Input
                        type="number"
                        min={0}
                        max={24}
                        value={editSleepHours ?? ''}
                        onChange={(e) => setEditSleepHours(e.target.value ? Number(e.target.value) : null)}
                        placeholder="7"
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs text-muted-foreground">Úroveň stresu (1-5)</label>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((level) => (
                          <Button
                            key={level}
                            type="button"
                            variant={editStressLevel === level ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setEditStressLevel(level)}
                            className="flex-1"
                          >
                            {level}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="ghost" size="sm" onClick={() => setIsEditingProfile(false)}>
                      Zrušit
                    </Button>
                    <Button size="sm" onClick={handleSaveProfile}>
                      Uložit
                    </Button>
                  </div>
                </div>
              ) : (
                // Display mode
                <div className="bg-secondary/30 rounded-xl p-3">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                    {/* Contact */}
                    {client.phone && (
                      <a href={`tel:${client.phone}`} className="flex items-center gap-2 text-foreground hover:text-primary transition-colors">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span>{client.phone}</span>
                      </a>
                    )}
                    {client.email && (
                      <a href={`mailto:${client.email}`} className="flex items-center gap-2 text-foreground hover:text-primary transition-colors truncate">
                        <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="truncate">{client.email}</span>
                      </a>
                    )}
                    
                    {/* Personal info */}
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="w-4 h-4" />
                      <span>{getGenderLabel(client.gender)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Hand className="w-4 h-4" />
                      <span>{getHandednessLabel(client.handedness)}</span>
                    </div>
                    
                    {/* Lifestyle */}
                    {client.occupation && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Briefcase className="w-4 h-4" />
                        <span>{client.occupation}</span>
                      </div>
                    )}
                    {client.sleep_hours !== null && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Moon className="w-4 h-4" />
                        <span>{client.sleep_hours}h spánku</span>
                      </div>
                    )}
                    {client.stress_level !== null && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Activity className="w-4 h-4" />
                        <span>Stres: {client.stress_level}/5</span>
                      </div>
                    )}
                    
                    {/* Sports */}
                    {client.current_activities && client.current_activities.length > 0 && (
                      <div className="flex items-center gap-2 text-muted-foreground col-span-2 sm:col-span-3">
                        <Dumbbell className="w-4 h-4 shrink-0" />
                        <span className="truncate">{client.current_activities.join(', ')}</span>
                      </div>
                    )}
                  </div>
                  
                  {onUpdateClient && (
                    <div className="flex justify-end pt-3 mt-3 border-t border-border/50">
                      <Button variant="outline" size="sm" onClick={handleStartEditProfile} className="gap-1.5">
                        <Edit2 className="w-3.5 h-3.5" />
                        Upravit
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
