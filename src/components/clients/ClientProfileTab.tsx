/**
 * ClientProfileTab Component
 * 
 * Consolidated view of all client profile data in one tab.
 * Shows:
 * - Basic info (age, gender, occupation)
 * - Pre-diagnostic summary with sync button
 * - Lifestyle (sleep, stress, activities) - SINGLE SOURCE
 * - Health restrictions
 * - Training goals
 * - Trainer notes
 */
import { useState } from 'react';
import { format, differenceInYears } from 'date-fns';
import { cs } from 'date-fns/locale';
import {
  User,
  Calendar,
  Briefcase,
  Moon,
  Activity,
  Heart,
  Target,
  AlertTriangle,
  Dumbbell,
  ClipboardList,
  Edit2,
  Check,
  X,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Loader2,
  Hand,
  Apple,
  Pill,
  Ruler,
  Scale,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Client } from '@/hooks/useClients';
import { ClientFormValues } from '@/lib/validations/client';
import { useClientPreDiagnostic, usePreDiagnosticAnswers } from '@/hooks/usePreDiagnosticForms';
import { useSyncPreDiagnosticToClient, usePreviewPreDiagnosticSync } from '@/hooks/useSyncPreDiagnosticToClient';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Translation helper for training goals
const translateGoal = (goal: string): string => {
  const translations: Record<string, string> = {
    // English keys
    'strength': 'Síla',
    'endurance': 'Vytrvalost',
    'muscle_gain': 'Nárůst svalů',
    'sport_performance': 'Sportovní výkon',
    'weight_loss': 'Hubnutí',
    'flexibility': 'Flexibilita',
    'mobility': 'Mobilita',
    'health': 'Zdraví',
    'rehabilitation': 'Rehabilitace',
    'posture': 'Držení těla',
    'pain_relief': 'Úleva od bolesti',
    'general_fitness': 'Celková kondice',
    // Czech keys (already translated)
    'zhubnout': 'Zhubnout',
    'nabrat svaly': 'Nabrat svaly',
    'zlepšit kondici': 'Zlepšit kondici',
    'zbavit se bolesti': 'Zbavit se bolesti',
    'lepší pohyblivost': 'Lepší pohyblivost',
    'prevence zranění': 'Prevence zranění',
    'sportovní výkon': 'Sportovní výkon',
    'celkové zdraví': 'Celkové zdraví',
  };
  return translations[goal.toLowerCase()] || goal;
};

// Translation helper for body parts
const translateBodyPart = (part: string): string => {
  const translations: Record<string, string> = {
    'neck': 'Krk',
    'shoulder': 'Rameno',
    'upper_back': 'Horní záda',
    'lower_back': 'Bederní páteř',
    'hip': 'Kyčel',
    'knee': 'Koleno',
    'ankle': 'Kotník',
    'wrist': 'Zápěstí',
    'elbow': 'Loket',
    'other': 'Jiné',
  };
  return translations[part.toLowerCase()] || part;
};

// Translation helper for occupation
const translateOccupation = (occ: string | null | undefined): string => {
  if (!occ) return '—';
  const translations: Record<string, string> = {
    'sedentary': 'Sedavé zaměstnání',
    'sedave': 'Sedavé zaměstnání',
    'combined': 'Kombinované zaměstnání',
    'kombinované zaměstnání': 'Kombinované zaměstnání',
    'mixed': 'Kombinované zaměstnání',
    'active': 'Aktivní zaměstnání',
    'physical': 'Fyzicky náročné',
  };
  return translations[occ.toLowerCase()] || occ;
};

// Translation helper for movement frequency
const translateMovementFrequency = (freq: string | null | undefined): string => {
  if (!freq) return '—';
  const translations: Record<string, string> = {
    'none': 'Žádná',
    '1-2': '1-2× týdně',
    '3-4': '3-4× týdně',
    '5+': '5+× týdně',
  };
  return translations[freq] || freq;
};

// Translation helper for daily activity
const translateDailyActivity = (activity: string | null | undefined): string => {
  if (!activity) return '—';
  const translations: Record<string, string> = {
    'sedentary': 'Sedavá',
    'light': 'Lehká',
    'moderate': 'Střední',
    'active': 'Aktivní',
    'very_active': 'Velmi aktivní',
    'combined': 'Kombinovaná',
  };
  return translations[activity.toLowerCase()] || activity;
};

interface ClientProfileTabProps {
  client: Client;
  onUpdateClient?: (data: Partial<ClientFormValues>) => Promise<void>;
}

// Unified field component for consistent styling
interface ProfileFieldProps {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  className?: string;
}

function ProfileField({ label, value, icon, className }: ProfileFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-medium">
        {icon}
        <span>{label}</span>
      </div>
      <p className="font-medium text-foreground text-sm">{value || '—'}</p>
    </div>
  );
}

export function ClientProfileTab({ client, onUpdateClient }: ClientProfileTabProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [preDiagOpen, setPreDiagOpen] = useState(false);
  const [showSyncPreview, setShowSyncPreview] = useState(false);
  
  // Pre-diagnostic data
  const { data: preDiagnostic } = useClientPreDiagnostic(client.id);
  const { data: answers = [] } = usePreDiagnosticAnswers(preDiagnostic?.id);
  const syncMutation = useSyncPreDiagnosticToClient();
  const previewMutation = usePreviewPreDiagnosticSync();

  // Edit state
  const [editData, setEditData] = useState({
    occupation: client.occupation || '',
    sleep_hours: client.sleep_hours?.toString() || '',
    stress_level: client.stress_level?.toString() || '',
    health_restrictions: client.health_restrictions || '',
    notes: client.notes || '',
    birth_date: client.birth_date || '',
    sports_history: client.sports_history || '',
    gender: client.gender as 'male' | 'female' | null,
    handedness: client.handedness as 'left' | 'right' | 'ambidextrous' | null,
    height: client.height?.toString() || '',
    weight: client.weight?.toString() || '',
    sleep_quality: client.sleep_quality?.toString() || '',
    sitting_hours_daily: client.sitting_hours_daily?.toString() || '',
    movement_frequency: client.movement_frequency || '',
    daily_activity_type: client.daily_activity_type || '',
  });

  // Calculate age
  const age = client.birth_date
    ? differenceInYears(new Date(), new Date(client.birth_date))
    : null;

  const handleStartEdit = () => {
    setEditData({
      occupation: client.occupation || '',
      sleep_hours: client.sleep_hours?.toString() || '',
      stress_level: client.stress_level?.toString() || '',
      health_restrictions: client.health_restrictions || '',
      notes: client.notes || '',
      birth_date: client.birth_date || '',
      sports_history: client.sports_history || '',
      gender: client.gender as 'male' | 'female' | null,
      handedness: client.handedness as 'left' | 'right' | 'ambidextrous' | null,
      height: client.height?.toString() || '',
      weight: client.weight?.toString() || '',
      sleep_quality: client.sleep_quality?.toString() || '',
      sitting_hours_daily: client.sitting_hours_daily?.toString() || '',
      movement_frequency: client.movement_frequency || '',
      daily_activity_type: client.daily_activity_type || '',
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!onUpdateClient) return;
    
    try {
      await onUpdateClient({
        occupation: editData.occupation || undefined,
        sleep_hours: editData.sleep_hours ? Number(editData.sleep_hours) : undefined,
        stress_level: editData.stress_level ? Number(editData.stress_level) : undefined,
        healthRestrictions: editData.health_restrictions,
        notes: editData.notes,
        birthDate: editData.birth_date || undefined,
        sports_history: editData.sports_history || undefined,
        gender: editData.gender,
        handedness: editData.handedness,
        height: editData.height ? Number(editData.height) : undefined,
        weight: editData.weight ? Number(editData.weight) : undefined,
        sleep_quality: editData.sleep_quality || undefined,
        sitting_hours_daily: editData.sitting_hours_daily ? Number(editData.sitting_hours_daily) : undefined,
        movement_frequency: editData.movement_frequency || undefined,
        daily_activity_type: editData.daily_activity_type || undefined,
      });
      setIsEditing(false);
      toast.success('Profil aktualizován');
    } catch (error) {
      toast.error('Nepodařilo se uložit změny');
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleSyncPreDiagnostic = async () => {
    if (!preDiagnostic || answers.length === 0) return;
    
    await syncMutation.mutateAsync({
      clientId: client.id,
      answers,
    });
    setShowSyncPreview(false);
  };

  const handlePreviewSync = async () => {
    if (!preDiagnostic || answers.length === 0) return;
    
    await previewMutation.mutateAsync({
      clientId: client.id,
      answers,
    });
    setShowSyncPreview(true);
  };

  const hasPreDiagnostic = preDiagnostic?.status === 'completed';
  const syncPreview = previewMutation.data || [];

  return (
    <div className="space-y-4">
      {/* Basic Info Card */}
      <div className="bg-card border border-border rounded-2xl p-4 sm:p-5">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold flex items-center gap-2 text-base">
            <User className="w-5 h-5 text-primary" />
            Základní informace
          </h3>
          {onUpdateClient && !isEditing && (
            <Button variant="outline" size="sm" onClick={handleStartEdit} className="gap-1.5">
              <Edit2 className="w-3.5 h-3.5" />
              Upravit
            </Button>
          )}
          {isEditing && (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={handleCancel}>
                <X className="w-4 h-4" />
              </Button>
              <Button size="sm" onClick={handleSave}>
                <Check className="w-4 h-4 mr-1" />
                Uložit
              </Button>
            </div>
          )}
        </div>

        {/* Consistent grid layout */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-5">
          {/* Birth date */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-medium">
              <Calendar className="w-3.5 h-3.5" />
              <span>Datum narození</span>
            </div>
            {isEditing ? (
              <Input
                type="date"
                value={editData.birth_date}
                onChange={(e) => setEditData(d => ({ ...d, birth_date: e.target.value }))}
                className="h-9 text-sm"
              />
            ) : (
              <div>
                <p className="font-medium text-foreground text-sm">
                  {age ? `${age} let` : '—'}
                </p>
                {client.birth_date && (
                  <span className="text-muted-foreground text-xs">
                    (nar. {format(new Date(client.birth_date), 'd.M.yyyy')})
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Gender */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-medium">
              <User className="w-3.5 h-3.5" />
              <span>Pohlaví</span>
            </div>
            {isEditing ? (
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant={editData.gender === 'male' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setEditData(d => ({ ...d, gender: 'male' }))}
                  className="flex-1 h-9 text-xs"
                >
                  Muž
                </Button>
                <Button
                  type="button"
                  variant={editData.gender === 'female' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setEditData(d => ({ ...d, gender: 'female' }))}
                  className="flex-1 h-9 text-xs"
                >
                  Žena
                </Button>
              </div>
            ) : (
              <p className="font-medium text-foreground text-sm">
                {client.gender === 'male' ? 'Muž' : client.gender === 'female' ? 'Žena' : '—'}
              </p>
            )}
          </div>

          {/* Handedness */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-medium">
              <Hand className="w-3.5 h-3.5" />
              <span>Dominantní ruka</span>
            </div>
            {isEditing ? (
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant={editData.handedness === 'right' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setEditData(d => ({ ...d, handedness: 'right' }))}
                  className="flex-1 h-9 text-xs"
                >
                  P
                </Button>
                <Button
                  type="button"
                  variant={editData.handedness === 'left' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setEditData(d => ({ ...d, handedness: 'left' }))}
                  className="flex-1 h-9 text-xs"
                >
                  L
                </Button>
              </div>
            ) : (
              <p className="font-medium text-foreground text-sm">
                {client.handedness === 'right' ? 'Pravák' :
                 client.handedness === 'left' ? 'Levák' :
                 client.handedness === 'ambidextrous' ? 'Obouruký' : '—'}
              </p>
            )}
          </div>

          {/* Occupation */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-medium">
              <Briefcase className="w-3.5 h-3.5" />
              <span>Typ práce</span>
            </div>
            {isEditing ? (
              <Input
                value={editData.occupation}
                onChange={(e) => setEditData(d => ({ ...d, occupation: e.target.value }))}
                placeholder="Programátor..."
                className="h-9 text-sm"
              />
            ) : (
              <p className="font-medium text-foreground text-sm">
                {translateOccupation(client.occupation)}
              </p>
            )}
          </div>

          {/* Height */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-medium">
              <Ruler className="w-3.5 h-3.5" />
              <span>Výška</span>
            </div>
            {isEditing ? (
              <Input
                type="number"
                value={editData.height}
                onChange={(e) => setEditData(d => ({ ...d, height: e.target.value }))}
                placeholder="175"
                className="h-9 text-sm"
              />
            ) : (
              <p className="font-medium text-foreground text-sm">
                {client.height ? `${client.height} cm` : '—'}
              </p>
            )}
          </div>

          {/* Weight */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-medium">
              <Scale className="w-3.5 h-3.5" />
              <span>Váha</span>
            </div>
            {isEditing ? (
              <Input
                type="number"
                step="0.1"
                value={editData.weight}
                onChange={(e) => setEditData(d => ({ ...d, weight: e.target.value }))}
                placeholder="70"
                className="h-9 text-sm"
              />
            ) : (
              <p className="font-medium text-foreground text-sm">
                {client.weight ? `${client.weight} kg` : '—'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Lifestyle Card */}
      <div className="bg-card border border-border rounded-2xl p-4 sm:p-5">
        <h3 className="font-semibold flex items-center gap-2 mb-5 text-base">
          <Activity className="w-5 h-5 text-primary" />
          Životní styl
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-5">
          {/* Sleep hours */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-medium">
              <Moon className="w-3.5 h-3.5" />
              <span>Průměrný spánek</span>
            </div>
            {isEditing ? (
              <Input
                type="number"
                value={editData.sleep_hours}
                onChange={(e) => setEditData(d => ({ ...d, sleep_hours: e.target.value }))}
                placeholder="7"
                className="h-9 text-sm"
              />
            ) : (
              <p className="font-medium text-foreground text-sm">
                {client.sleep_hours ? `${client.sleep_hours} h` : '—'}
              </p>
            )}
          </div>

          {/* Sleep Quality */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-medium">
              <Moon className="w-3.5 h-3.5" />
              <span>Kvalita spánku</span>
            </div>
            {isEditing ? (
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((level) => (
                  <Button
                    key={level}
                    type="button"
                    variant={editData.sleep_quality === String(level) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setEditData(d => ({ ...d, sleep_quality: String(level) }))}
                    className="flex-1 h-9 px-1 text-xs"
                  >
                    {level}
                  </Button>
                ))}
              </div>
            ) : (
              <p className="font-medium text-foreground text-sm">
                {client.sleep_quality ? `${client.sleep_quality}/5` : '—'}
              </p>
            )}
          </div>

          {/* Stress */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-medium">
              <Heart className="w-3.5 h-3.5" />
              <span>Úroveň stresu</span>
            </div>
            {isEditing ? (
              <Input
                type="number"
                min={1}
                max={10}
                value={editData.stress_level}
                onChange={(e) => setEditData(d => ({ ...d, stress_level: e.target.value }))}
                placeholder="1-10"
                className="h-9 text-sm"
              />
            ) : (
              <p className="font-medium text-foreground text-sm">
                {client.stress_level ? `${client.stress_level}/10` : '—'}
              </p>
            )}
          </div>

          {/* Sitting hours */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-medium">
              <Activity className="w-3.5 h-3.5" />
              <span>Hodiny vsedě</span>
            </div>
            {isEditing ? (
              <Input
                type="number"
                value={editData.sitting_hours_daily}
                onChange={(e) => setEditData(d => ({ ...d, sitting_hours_daily: e.target.value }))}
                placeholder="8"
                className="h-9 text-sm"
              />
            ) : (
              <p className="font-medium text-foreground text-sm">
                {client.sitting_hours_daily != null ? `${client.sitting_hours_daily} h/den` : '—'}
              </p>
            )}
          </div>

          {/* Movement Frequency */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-medium">
              <Dumbbell className="w-3.5 h-3.5" />
              <span>Frekvence pohybu</span>
            </div>
            {isEditing ? (
              <Input
                value={editData.movement_frequency}
                onChange={(e) => setEditData(d => ({ ...d, movement_frequency: e.target.value }))}
                placeholder="2-3× týdně"
                className="h-9 text-sm"
              />
            ) : (
              <p className="font-medium text-foreground text-sm">
                {translateMovementFrequency(client.movement_frequency)}
              </p>
            )}
          </div>

          {/* Daily Activity Type */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-medium">
              <Activity className="w-3.5 h-3.5" />
              <span>Typ denní aktivity</span>
            </div>
            {isEditing ? (
              <div className="flex gap-1 flex-wrap">
                {[
                  { value: 'sedentary', label: 'Sedavá' },
                  { value: 'moderate', label: 'Střední' },
                  { value: 'active', label: 'Aktivní' },
                ].map((type) => (
                  <Button
                    key={type.value}
                    type="button"
                    variant={editData.daily_activity_type === type.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setEditData(d => ({ ...d, daily_activity_type: type.value }))}
                    className="flex-1 h-9 min-w-[50px] text-xs"
                  >
                    {type.label}
                  </Button>
                ))}
              </div>
            ) : (
              <p className="font-medium text-foreground text-sm">
                {translateDailyActivity(client.daily_activity_type)}
              </p>
            )}
          </div>
        </div>

        {/* Current Activities */}
        {client.current_activities && client.current_activities.length > 0 && (
          <div className="mt-5 pt-5 border-t border-border">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-medium mb-2">
              <Dumbbell className="w-3.5 h-3.5" />
              <span>Aktuální aktivity</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {client.current_activities.map((activity) => (
                <Badge key={activity} variant="secondary" className="text-xs">
                  {activity}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Supplements */}
        {client.supplements && client.supplements.length > 0 && (
          <div className="mt-5 pt-5 border-t border-border">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-medium mb-2">
              <Pill className="w-3.5 h-3.5" />
              <span>Doplňky stravy</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {client.supplements.map((supp) => (
                <Badge key={supp} variant="outline" className="text-xs bg-primary/10 text-primary">
                  {supp}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Dietary restrictions */}
        {client.dietary_restrictions && client.dietary_restrictions.length > 0 && (
          <div className="mt-5 pt-5 border-t border-border">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-medium mb-2">
              <Apple className="w-3.5 h-3.5" />
              <span>Stravovací omezení</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {client.dietary_restrictions.map((restr) => (
                <Badge key={restr} variant="outline" className="text-xs bg-warning/10 text-warning">
                  {restr}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Sports History */}
        <div className="mt-5 pt-5 border-t border-border">
          <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-medium mb-2">
            <Dumbbell className="w-3.5 h-3.5" />
            <span>Sportovní historie</span>
          </div>
          {isEditing ? (
            <Textarea
              value={editData.sports_history}
              onChange={(e) => setEditData(d => ({ ...d, sports_history: e.target.value }))}
              placeholder="Předchozí sporty, úrazy, zkušenosti..."
              className="min-h-[60px] text-sm"
            />
          ) : (
            <p className="font-medium text-foreground text-sm whitespace-pre-wrap">
              {client.sports_history || <span className="text-muted-foreground italic">—</span>}
            </p>
          )}
        </div>
      </div>

      {/* Pre-diagnostic Summary with Sync */}
      {hasPreDiagnostic && (
        <Collapsible open={preDiagOpen} onOpenChange={setPreDiagOpen}>
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <CollapsibleTrigger asChild>
              <button className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-primary" />
                  <span className="font-semibold">Pre-diagnostika</span>
                  <Badge variant="default" className="bg-success/20 text-success text-xs">
                    Vyplněno
                  </Badge>
                  {preDiagnostic.completed_at && (
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(preDiagnostic.completed_at), 'd.M.yyyy', { locale: cs })}
                    </span>
                  )}
                </div>
                {preDiagOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <div className="px-4 pb-4 border-t border-border">
                {/* Actions */}
                <div className="py-3 flex flex-wrap gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handlePreviewSync}
                    disabled={previewMutation.isPending}
                    className="gap-1.5"
                  >
                    {previewMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    Převzít data do karty
                  </Button>
                  <p className="text-xs text-muted-foreground self-center">
                    Plné detaily najdete v záložce <strong>Pre-diagnostika</strong>
                  </p>
                </div>

                {/* Sync preview */}
                {showSyncPreview && syncPreview.length > 0 && (
                  <div className="bg-muted/50 rounded-lg p-3 mb-3 space-y-2">
                    <p className="text-sm font-medium">Bude aktualizováno:</p>
                    {syncPreview.map((item) => (
                      <div key={item.field} className="text-xs flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{item.label}</Badge>
                        <span className="text-muted-foreground">→</span>
                        <span className="font-medium truncate">
                          {typeof item.newValue === 'object' 
                            ? JSON.stringify(item.newValue).slice(0, 50) 
                            : String(item.newValue).slice(0, 50)}
                        </span>
                      </div>
                    ))}
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" onClick={handleSyncPreDiagnostic} disabled={syncMutation.isPending}>
                        {syncMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Potvrdit'}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setShowSyncPreview(false)}>
                        Zrušit
                      </Button>
                    </div>
                  </div>
                )}
                {showSyncPreview && syncPreview.length === 0 && !previewMutation.isPending && (
                  <div className="bg-muted/50 rounded-lg p-3 mb-3">
                    <p className="text-sm text-muted-foreground">Všechna data jsou již synchronizována.</p>
                  </div>
                )}

                {/* Key answers preview */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {answers.slice(0, 6).map((answer) => (
                    <div key={answer.id} className="text-sm">
                      <p className="text-xs text-muted-foreground">{answer.field_key}</p>
                      <p className="font-medium truncate">
                        {Array.isArray(answer.value) 
                          ? answer.value.join(', ') 
                          : String(answer.value)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      )}

      {/* Health Section */}
      <div className={cn(
        'bg-card border border-border rounded-2xl p-4 sm:p-5',
        (client.health_restrictions || (client.pain_areas && client.pain_areas.length > 0)) && 'border-l-4 border-l-warning'
      )}>
        <h3 className="font-semibold flex items-center gap-2 mb-4 text-base text-warning">
          <AlertTriangle className="w-5 h-5" />
          Zdraví
        </h3>
        
        {/* Pain Areas */}
        {client.pain_areas && client.pain_areas.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-muted-foreground font-medium mb-2">Bolestivá místa</p>
            <div className="flex flex-wrap gap-1.5">
              {client.pain_areas.map((area) => (
                <Badge key={area} variant="outline" className="text-xs bg-warning/10 text-warning border-warning/30">
                  {translateBodyPart(area)}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Injury History */}
        {client.injury_history && (
          <div className="mb-4">
            <p className="text-xs text-muted-foreground font-medium mb-1">Historie zranění</p>
            <p className="text-sm text-foreground">{client.injury_history}</p>
          </div>
        )}

        {/* Surgery History */}
        {client.surgery_history && (
          <div className="mb-4">
            <p className="text-xs text-muted-foreground font-medium mb-1">Historie operací</p>
            <p className="text-sm text-foreground">{client.surgery_history}</p>
          </div>
        )}

        {/* Health Restrictions */}
        <div>
          <p className="text-xs text-muted-foreground font-medium mb-1">Zdravotní omezení</p>
          {isEditing ? (
            <Textarea
              value={editData.health_restrictions}
              onChange={(e) => setEditData(d => ({ ...d, health_restrictions: e.target.value }))}
              placeholder="Bolesti zad, zranění kolene..."
              className="min-h-[80px]"
            />
          ) : (
            <p className="text-foreground whitespace-pre-wrap text-sm">
              {client.health_restrictions || <span className="text-muted-foreground italic">Žádná omezení</span>}
            </p>
          )}
        </div>

        {/* Training Dislikes */}
        {client.training_dislikes && client.training_dislikes.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground font-medium mb-2">Nechci cvičit</p>
            <div className="flex flex-wrap gap-1.5">
              {client.training_dislikes.map((dislike) => (
                <Badge key={dislike} variant="outline" className="text-xs">
                  {dislike}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Training Goals */}
      <div className="bg-card border border-border rounded-2xl p-4 sm:p-5">
        <h3 className="font-semibold flex items-center gap-2 mb-4 text-base">
          <Target className="w-5 h-5 text-primary" />
          Tréninkové cíle
        </h3>
        <div className="flex flex-wrap gap-2">
          {(client.training_goals || []).length > 0 ? (
            client.training_goals.map((goal) => (
              <Badge key={goal} className="bg-primary/10 text-primary">
                {translateGoal(goal)}
              </Badge>
            ))
          ) : (
            <span className="text-muted-foreground text-sm italic">Žádné cíle</span>
          )}
        </div>
      </div>

      {/* Notes */}
      <div className="bg-card border border-border rounded-2xl p-4 sm:p-5">
        <h3 className="font-semibold mb-4 text-base">Poznámky trenéra</h3>
        {isEditing ? (
          <Textarea
            value={editData.notes}
            onChange={(e) => setEditData(d => ({ ...d, notes: e.target.value }))}
            placeholder="Poznámky ke klientovi..."
            className="min-h-[100px]"
          />
        ) : (
          <p className="text-muted-foreground whitespace-pre-wrap text-sm">
            {client.notes || <span className="italic">Žádné poznámky</span>}
          </p>
        )}
      </div>
    </div>
  );
}
