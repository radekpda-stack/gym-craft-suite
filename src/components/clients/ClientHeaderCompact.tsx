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
import { ClientQuickAddButton } from '@/components/clients/ClientQuickAddButton';
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
  Ruler,
  Scale,
  Armchair,
  Cake,
  Heart,
  Brain,
  Target,
  Footprints,
  XCircle,
  Stethoscope,
  Scissors,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  onFeedbackToggle?: (enabled: boolean) => void;
}

export function ClientHeaderCompact({ 
  client, 
  onUpdateClient,
  onUpdateTrainingStartDate,
  redFlagCount = 0,
  lastPortalLogin,
  onFeedbackToggle,
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
  const [isEditingName, setIsEditingName] = useState(false);
  const [editFirstName, setEditFirstName] = useState(client.first_name || '');
  const [editLastName, setEditLastName] = useState(client.last_name || '');
  
  // Editable profile fields
  const [editPhone, setEditPhone] = useState(client.phone || '');
  const [editEmail, setEditEmail] = useState(client.email || '');
  const [editGender, setEditGender] = useState<'male' | 'female' | null>(client.gender);
  const [editHandedness, setEditHandedness] = useState<'left' | 'right' | 'ambidextrous' | null>(client.handedness as 'left' | 'right' | 'ambidextrous' | null);
  const [editOccupation, setEditOccupation] = useState(client.occupation || '');
  const [editSleepHours, setEditSleepHours] = useState<number | null>(client.sleep_hours);
  const [editStressLevel, setEditStressLevel] = useState<number | null>(client.stress_level);
  const [editBirthDate, setEditBirthDate] = useState(client.birth_date || '');
  const [editHeight, setEditHeight] = useState<number | null>(client.height ?? null);
  const [editWeight, setEditWeight] = useState<number | null>(client.weight ?? null);
  const [editSittingHours, setEditSittingHours] = useState<number | null>(client.sitting_hours_daily);
  const [editSleepQuality, setEditSleepQuality] = useState(client.sleep_quality || '');
  const [editMovementFrequency, setEditMovementFrequency] = useState(client.movement_frequency || '');
  const [editDailyActivityType, setEditDailyActivityType] = useState(client.daily_activity_type || '');
  const [editSportsHistory, setEditSportsHistory] = useState(client.sports_history || '');
  const [editInjuryHistory, setEditInjuryHistory] = useState(client.injury_history || '');
  const [editSurgeryHistory, setEditSurgeryHistory] = useState(client.surgery_history || '');
  const [editCurrentActivities, setEditCurrentActivities] = useState((client.current_activities || []).join(', '));
  const [editPainAreas, setEditPainAreas] = useState((client.pain_areas || []).join(', '));
  const [editTrainingDislikes, setEditTrainingDislikes] = useState((client.training_dislikes || []).join(', '));

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
    setEditBirthDate(client.birth_date || '');
    setEditHeight(client.height ?? null);
    setEditWeight(client.weight ?? null);
    setEditSittingHours(client.sitting_hours_daily);
    setEditSleepQuality(client.sleep_quality || '');
    setEditMovementFrequency(client.movement_frequency || '');
    setEditDailyActivityType(client.daily_activity_type || '');
    setEditSportsHistory(client.sports_history || '');
    setEditInjuryHistory(client.injury_history || '');
    setEditSurgeryHistory(client.surgery_history || '');
    setEditCurrentActivities((client.current_activities || []).join(', '));
    setEditPainAreas((client.pain_areas || []).join(', '));
    setEditTrainingDislikes((client.training_dislikes || []).join(', '));
    setIsEditingProfile(true);
  };

  // Helper to parse comma-separated string to array
  const parseCommaSeparated = (value: string): string[] | null => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    return trimmed.split(',').map(s => s.trim()).filter(s => s.length > 0);
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
        birthDate: editBirthDate || undefined,
        height: editHeight,
        weight: editWeight,
        sitting_hours_daily: editSittingHours,
        sleep_quality: editSleepQuality || null,
        movement_frequency: editMovementFrequency || null,
        daily_activity_type: editDailyActivityType || null,
        sports_history: editSportsHistory || null,
        injury_history: editInjuryHistory || null,
        surgery_history: editSurgeryHistory || null,
        current_activities: parseCommaSeparated(editCurrentActivities),
        pain_areas: parseCommaSeparated(editPainAreas),
        training_dislikes: parseCommaSeparated(editTrainingDislikes),
      });
      toast({ title: 'Profil aktualizován' });
    }
    setIsEditingProfile(false);
  };

  const handleStartEditName = () => {
    setEditFirstName(client.first_name || '');
    setEditLastName(client.last_name || '');
    setIsEditingName(true);
  };

  const handleSaveName = async () => {
    const trimmedFirstName = editFirstName.trim();
    const trimmedLastName = editLastName.trim();
    const newFullName = [trimmedFirstName, trimmedLastName].filter(Boolean).join(' ');
    
    if (onUpdateClient && (trimmedFirstName !== (client.first_name || '') || trimmedLastName !== (client.last_name || ''))) {
      await onUpdateClient({ 
        first_name: trimmedFirstName || null,
        last_name: trimmedLastName || null,
        name: newFullName || client.name
      });
      toast({ title: 'Jméno aktualizováno' });
    }
    setIsEditingName(false);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveName();
    } else if (e.key === 'Escape') {
      setIsEditingName(false);
      setEditFirstName(client.first_name || '');
      setEditLastName(client.last_name || '');
    }
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
    <div className="bg-card/80 backdrop-blur-lg border border-border/50 rounded-2xl p-3 sm:p-4 sticky top-0 z-30 shadow-sm transition-all duration-200">
      {/* Row 1: Back + Avatar + Name + Year/Age */}
      <div className="flex items-center gap-2 sm:gap-3">
        <Link 
          to="/clients" 
          className="p-1.5 -ml-1.5 rounded-full hover:bg-secondary/50 transition-colors shrink-0 md:hidden"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        
        <Avatar className="h-10 w-10 sm:h-12 sm:w-12 shrink-0 ring-2 ring-primary/20 hover:ring-primary/40 transition-all duration-200">
          <AvatarFallback className="bg-primary/10 text-primary text-base sm:text-lg font-semibold">
            {[(client.first_name || '')[0], (client.last_name || '')[0]].filter(Boolean).join('').slice(0, 2) || client.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            {isEditingName ? (
              <div className="flex items-center gap-1 flex-wrap">
                <Input
                  type="text"
                  value={editFirstName}
                  onChange={(e) => setEditFirstName(e.target.value)}
                  onKeyDown={handleNameKeyDown}
                  placeholder="Křestní jméno"
                  className="h-8 text-sm font-medium w-24 sm:w-28"
                  autoFocus
                />
                <Input
                  type="text"
                  value={editLastName}
                  onChange={(e) => setEditLastName(e.target.value)}
                  onKeyDown={handleNameKeyDown}
                  placeholder="Příjmení"
                  className="h-8 text-sm font-medium w-24 sm:w-28"
                />
                <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={handleSaveName}>
                  <Check className="w-4 h-4 text-success" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => { setIsEditingName(false); setEditFirstName(client.first_name || ''); setEditLastName(client.last_name || ''); }}>
                  <X className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ) : (
              <>
                <h1 className="text-lg sm:text-xl font-bold text-foreground truncate">{client.name}</h1>
                {onUpdateClient && (
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-7 w-7 shrink-0"
                    onClick={handleStartEditName}
                    title="Upravit jméno"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {birthYear && (
              <div className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{birthYear}</span>
                {age && <span className="text-[10px] sm:text-xs">({age} let)</span>}
              </div>
            )}
            {/* Feedback toggle - easily accessible */}
            {onFeedbackToggle && (
              <div className="flex items-center gap-1.5">
                <Switch
                  id="feedback-toggle-header"
                  checked={client.feedback_enabled !== false}
                  onCheckedChange={onFeedbackToggle}
                  className="scale-75"
                />
                <Label 
                  htmlFor="feedback-toggle-header" 
                  className="text-[10px] sm:text-xs text-muted-foreground cursor-pointer"
                >
                  Feedback
                </Label>
              </div>
            )}
          </div>
        </div>

        {/* Desktop: PDF + Badges + Indicators */}
        <div className="hidden sm:flex items-center gap-1 shrink-0">
          <ClientDaysSinceBadge clientId={client.id} />
          <ClientStreakBadge clientId={client.id} />
          
          {redFlagCount > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="p-2 rounded-full bg-destructive/10 shadow-sm shadow-destructive/20 animate-pulse">
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
                <div className="p-2 rounded-full bg-success/10 shadow-sm shadow-success/20 hover:bg-success/20 transition-colors">
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
                className="p-2 rounded-full bg-secondary/50 hover:bg-secondary transition-colors shadow-sm"
                title="Zavolat"
              >
                <Phone className="w-4 h-4 text-muted-foreground" />
              </a>
              <a 
                href={`https://wa.me/${client.phone.replace(/\s/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-secondary/50 hover:bg-secondary transition-colors shadow-sm"
                title="WhatsApp"
              >
                <MessageCircle className="w-4 h-4 text-muted-foreground" />
              </a>
            </>
          )}
          {client.email && (
            <a 
              href={`mailto:${client.email}`}
              className="p-2 rounded-full bg-secondary/50 hover:bg-secondary transition-colors shadow-sm"
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

          {/* Quick Add Button */}
          {onUpdateClient && (
            <ClientQuickAddButton
              clientId={client.id}
              clientNotes={client.notes || ''}
              clientHealthRestrictions={client.health_restrictions || ''}
              clientGoals={client.training_goals || []}
              onUpdateClient={onUpdateClient}
            />
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
        
        {/* Quick Add Button - Mobile */}
        {onUpdateClient && (
          <ClientQuickAddButton
            clientId={client.id}
            clientNotes={client.notes || ''}
            clientHealthRestrictions={client.health_restrictions || ''}
            clientGoals={client.training_goals || []}
            onUpdateClient={onUpdateClient}
          />
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
            className="overflow-hidden relative z-40"
          >
            <div className="pt-3 pb-1">
              {isEditingProfile ? (
                // Edit mode - comprehensive form with sticky buttons
                <div className="bg-secondary/30 rounded-xl border border-border/50 shadow-lg overflow-hidden">
                  {/* Scrollable form content */}
                  <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
                    {/* Section: Základní informace */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Základní informace</h4>
                      <div className="space-y-3">
                        {/* Contact info - full width on mobile */}
                        <div className="grid grid-cols-1 gap-3">
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
                        </div>
                        
                        {/* Birth date and gender - side by side */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-xs text-muted-foreground">Datum narození</label>
                            <Input
                              type="date"
                              value={editBirthDate}
                              onChange={(e) => setEditBirthDate(e.target.value)}
                              className="h-9 w-full"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs text-muted-foreground">Pohlaví</label>
                            <div className="flex gap-1">
                              <Button
                                type="button"
                                variant={editGender === 'male' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setEditGender('male')}
                                className="flex-1 px-2 text-xs"
                              >
                                Muž
                              </Button>
                              <Button
                                type="button"
                                variant={editGender === 'female' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setEditGender('female')}
                                className="flex-1 px-2 text-xs"
                              >
                                Žena
                              </Button>
                            </div>
                          </div>
                        </div>
                        
                        {/* Handedness - full width */}
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
                      </div>
                    </div>

                    {/* Section: Tělesné parametry */}
                    <div className="space-y-3 pt-3 border-t border-border/30">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tělesné parametry</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-xs text-muted-foreground">Výška (cm)</label>
                          <Input
                            type="number"
                            min={100}
                            max={250}
                            value={editHeight ?? ''}
                            onChange={(e) => setEditHeight(e.target.value ? Number(e.target.value) : null)}
                            placeholder="175"
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs text-muted-foreground">Váha (kg)</label>
                          <Input
                            type="number"
                            min={30}
                            max={300}
                            step={0.1}
                            value={editWeight ?? ''}
                            onChange={(e) => setEditWeight(e.target.value ? Number(e.target.value) : null)}
                            placeholder="70"
                            className="h-9"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section: Životní styl */}
                    <div className="space-y-3 pt-3 border-t border-border/30">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Životní styl</h4>
                      <div className="space-y-3">
                        {/* Occupation - full width */}
                        <div className="space-y-1.5">
                          <label className="text-xs text-muted-foreground">Zaměstnání</label>
                          <Input
                            value={editOccupation}
                            onChange={(e) => setEditOccupation(e.target.value)}
                            placeholder="Programátor, učitel..."
                            className="h-9"
                          />
                        </div>
                        
                        {/* Activity type - full width */}
                        <div className="space-y-1.5">
                          <label className="text-xs text-muted-foreground">Typ denní aktivity</label>
                          <div className="flex gap-1 flex-wrap">
                            {[
                              { value: 'sedentary', label: 'Sedavé' },
                              { value: 'mixed', label: 'Kombinované' },
                              { value: 'active', label: 'Aktivní' },
                            ].map((type) => (
                              <Button
                                key={type.value}
                                type="button"
                                variant={editDailyActivityType === type.value ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setEditDailyActivityType(type.value)}
                                className="flex-1 min-w-[80px] px-2 text-xs"
                              >
                                {type.label}
                              </Button>
                            ))}
                          </div>
                        </div>
                        
                        {/* Sitting hours and sleep - side by side */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-xs text-muted-foreground">Hodiny vsedě</label>
                            <Input
                              type="number"
                              min={0}
                              max={24}
                              value={editSittingHours ?? ''}
                              onChange={(e) => setEditSittingHours(e.target.value ? Number(e.target.value) : null)}
                              placeholder="8"
                              className="h-9"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs text-muted-foreground">Průměrný spánek</label>
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
                        </div>
                        
                        {/* Stress level - full width */}
                        <div className="space-y-1.5">
                          <label className="text-xs text-muted-foreground">Úroveň stresu (1-5)</label>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((level) => (
                              <Button
                                key={level}
                                type="button"
                                variant={editStressLevel === level ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setEditStressLevel(level)}
                                className="flex-1 px-2"
                              >
                                {level}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Section: Sport a pohyb */}
                    <div className="space-y-3 pt-3 border-t border-border/30">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sport a pohyb</h4>
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <label className="text-xs text-muted-foreground">Frekvence pohybu</label>
                          <Input
                            value={editMovementFrequency}
                            onChange={(e) => setEditMovementFrequency(e.target.value)}
                            placeholder="2-3× týdně..."
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs text-muted-foreground">Aktuální aktivity</label>
                          <Input
                            value={editCurrentActivities}
                            onChange={(e) => setEditCurrentActivities(e.target.value)}
                            placeholder="Jóga, běh, posilovna..."
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs text-muted-foreground">Sportovní historie</label>
                          <Textarea
                            value={editSportsHistory}
                            onChange={(e) => setEditSportsHistory(e.target.value)}
                            placeholder="Předchozí sporty, úrazy, zkušenosti..."
                            rows={2}
                            className="resize-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section: Zdraví */}
                    <div className="space-y-3 pt-3 border-t border-border/30">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Zdravotní omezení</h4>
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <label className="text-xs text-muted-foreground">Bolestivá místa</label>
                          <Input
                            value={editPainAreas}
                            onChange={(e) => setEditPainAreas(e.target.value)}
                            placeholder="Záda, kolena, ramena..."
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs text-muted-foreground">Historie zranění</label>
                          <Input
                            value={editInjuryHistory}
                            onChange={(e) => setEditInjuryHistory(e.target.value)}
                            placeholder="Zlomenina kotníku 2020..."
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs text-muted-foreground">Historie operací</label>
                          <Input
                            value={editSurgeryHistory}
                            onChange={(e) => setEditSurgeryHistory(e.target.value)}
                            placeholder="Operace kolena 2019..."
                            className="h-9"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section: Tréninkové preference */}
                    <div className="space-y-3 pt-3 border-t border-border/30">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tréninkové preference</h4>
                      <div className="space-y-1.5">
                        <label className="text-xs text-muted-foreground">Co nemá rád v tréninku</label>
                        <Input
                          value={editTrainingDislikes}
                          onChange={(e) => setEditTrainingDislikes(e.target.value)}
                          placeholder="Kardio, burpees, planky..."
                          className="h-9"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Sticky footer with buttons */}
                  <div className="flex justify-end gap-2 p-3 border-t border-border/50 bg-secondary/50 sticky bottom-0">
                    <Button variant="ghost" size="sm" onClick={() => setIsEditingProfile(false)}>
                      Zrušit
                    </Button>
                    <Button size="sm" onClick={handleSaveProfile}>
                      Uložit změny
                    </Button>
                  </div>
                </div>
              ) : (
                // Display mode - only show filled values, organized by sections
                <div className="bg-secondary/30 rounded-xl p-4 border border-border/50 shadow-lg space-y-4">
                  
                  {/* Section: Základní informace */}
                  {(client.phone || client.email || client.gender || age || client.handedness) && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Základní informace</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
                        {client.phone && (
                          <a href={`tel:${client.phone}`} className="flex items-center gap-2 text-foreground hover:text-primary transition-colors">
                            <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                            <span className="truncate">{client.phone}</span>
                          </a>
                        )}
                        {client.email && (
                          <a href={`mailto:${client.email}`} className="flex items-center gap-2 text-foreground hover:text-primary transition-colors min-w-0">
                            <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                            <span className="truncate">{client.email}</span>
                          </a>
                        )}
                        {(client.gender || age) && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <User className="w-4 h-4 shrink-0" />
                            <span>
                              {client.gender === 'male' ? 'Muž' : client.gender === 'female' ? 'Žena' : ''}
                              {client.gender && age ? ', ' : ''}
                              {age ? `${age} let` : ''}
                            </span>
                          </div>
                        )}
                        {client.handedness && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Hand className="w-4 h-4 shrink-0" />
                            <span>{client.handedness === 'right' ? 'Pravák' : client.handedness === 'left' ? 'Levák' : 'Obouruký'}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Section: Tělesné parametry */}
                  {(client.height || client.weight) && (
                    <div className="space-y-2 pt-3 border-t border-border/30">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tělesné parametry</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                        {client.height && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Ruler className="w-4 h-4 shrink-0" />
                            <span>{client.height} cm</span>
                          </div>
                        )}
                        {client.weight && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Scale className="w-4 h-4 shrink-0" />
                            <span>{client.weight} kg</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Section: Životní styl */}
                  {(client.occupation || client.daily_activity_type || client.sitting_hours_daily !== null || client.sleep_hours !== null || client.sleep_quality || client.stress_level !== null) && (
                    <div className="space-y-2 pt-3 border-t border-border/30">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Životní styl</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
                        {client.occupation && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Briefcase className="w-4 h-4 shrink-0" />
                            <span className="truncate">{client.occupation}</span>
                          </div>
                        )}
                        {client.daily_activity_type && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Footprints className="w-4 h-4 shrink-0" />
                            <span>{client.daily_activity_type}</span>
                          </div>
                        )}
                        {client.sitting_hours_daily !== null && client.sitting_hours_daily !== undefined && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Armchair className="w-4 h-4 shrink-0" />
                            <span>{client.sitting_hours_daily}h sezení denně</span>
                          </div>
                        )}
                        {client.sleep_hours !== null && client.sleep_hours !== undefined && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Moon className="w-4 h-4 shrink-0" />
                            <span>{client.sleep_hours}h spánku</span>
                          </div>
                        )}
                        {client.sleep_quality && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Moon className="w-4 h-4 shrink-0" />
                            <span>Kvalita: {client.sleep_quality}</span>
                          </div>
                        )}
                        {client.stress_level !== null && client.stress_level !== undefined && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Brain className="w-4 h-4 shrink-0" />
                            <span>Stres: {client.stress_level}/5</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Section: Sport a pohyb */}
                  {(client.movement_frequency || client.sports_history || (client.current_activities && client.current_activities.length > 0)) && (
                    <div className="space-y-2 pt-3 border-t border-border/30">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sport a pohyb</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                        {client.movement_frequency && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Dumbbell className="w-4 h-4 shrink-0" />
                            <span>{client.movement_frequency}</span>
                          </div>
                        )}
                        {client.current_activities && client.current_activities.length > 0 && (
                          <div className="flex items-center gap-2 text-muted-foreground sm:col-span-2">
                            <Activity className="w-4 h-4 shrink-0" />
                            <span className="truncate">{client.current_activities.join(', ')}</span>
                          </div>
                        )}
                        {client.sports_history && (
                          <div className="flex items-start gap-2 text-muted-foreground sm:col-span-2">
                            <Target className="w-4 h-4 shrink-0 mt-0.5" />
                            <span className="break-words">{client.sports_history}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Section: Zdraví */}
                  {(client.pain_areas && client.pain_areas.length > 0) || client.injury_history || client.surgery_history ? (
                    <div className="space-y-2 pt-3 border-t border-border/30">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Zdraví</h4>
                      <div className="grid grid-cols-1 gap-2 text-sm">
                        {client.pain_areas && client.pain_areas.length > 0 && (
                          <div className="flex items-start gap-2 text-warning">
                            <Heart className="w-4 h-4 shrink-0 mt-0.5" />
                            <span className="break-words">Bolesti: {client.pain_areas.join(', ')}</span>
                          </div>
                        )}
                        {client.injury_history && (
                          <div className="flex items-start gap-2 text-muted-foreground">
                            <Stethoscope className="w-4 h-4 shrink-0 mt-0.5" />
                            <span className="break-words">Zranění: {client.injury_history}</span>
                          </div>
                        )}
                        {client.surgery_history && (
                          <div className="flex items-start gap-2 text-muted-foreground">
                            <Scissors className="w-4 h-4 shrink-0 mt-0.5" />
                            <span className="break-words">Operace: {client.surgery_history}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}

                  {/* Section: Tréninkové preference */}
                  {client.training_dislikes && client.training_dislikes.length > 0 && (
                    <div className="space-y-2 pt-3 border-t border-border/30">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tréninkové preference</h4>
                      <div className="flex items-start gap-2 text-sm text-muted-foreground">
                        <XCircle className="w-4 h-4 shrink-0 mt-0.5 text-destructive/70" />
                        <span className="break-words">Nemá rád: {client.training_dislikes.join(', ')}</span>
                      </div>
                    </div>
                  )}

                  {onUpdateClient && (
                    <div className="flex justify-end pt-3 border-t border-border/30">
                      <Button variant="outline" size="sm" onClick={handleStartEditProfile} className="gap-1.5">
                        <Edit2 className="w-3.5 h-3.5" />
                        Upravit profil
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
