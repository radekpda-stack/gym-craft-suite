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

interface ClientProfileTabProps {
  client: Client;
  onUpdateClient?: (data: Partial<ClientFormValues>) => Promise<void>;
}

interface EditableFieldProps {
  label: string;
  value: string | number | null | undefined;
  icon: React.ReactNode;
  isEditing: boolean;
  editValue: string;
  onEditChange: (value: string) => void;
  type?: 'text' | 'number' | 'textarea';
  placeholder?: string;
  suffix?: string;
}

function EditableField({
  label,
  value,
  icon,
  isEditing,
  editValue,
  onEditChange,
  type = 'text',
  placeholder,
  suffix,
}: EditableFieldProps) {
  const displayValue = value != null ? (suffix ? `${value}${suffix}` : String(value)) : '—';

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-muted-foreground text-xs">
        {icon}
        <span>{label}</span>
      </div>
      {isEditing ? (
        type === 'textarea' ? (
          <Textarea
            value={editValue}
            onChange={(e) => onEditChange(e.target.value)}
            placeholder={placeholder}
            className="min-h-[60px] text-sm"
          />
        ) : (
          <Input
            type={type}
            value={editValue}
            onChange={(e) => onEditChange(e.target.value)}
            placeholder={placeholder}
            className="h-8 text-sm"
          />
        )
      ) : (
        <p className="font-medium text-foreground text-sm">{displayValue}</p>
      )}
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
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!onUpdateClient) return;
    
    try {
      // Use camelCase to match ClientFormValues schema
      await onUpdateClient({
        occupation: editData.occupation || undefined,
        sleep_hours: editData.sleep_hours ? Number(editData.sleep_hours) : undefined,
        stress_level: editData.stress_level ? Number(editData.stress_level) : undefined,
        healthRestrictions: editData.health_restrictions,
        notes: editData.notes,
        birthDate: editData.birth_date || undefined,
        sports_history: editData.sports_history || undefined,
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
      <div className="bg-card border border-border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
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

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* Birth date - editable */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <Calendar className="w-4 h-4" />
              <span>Datum narození</span>
            </div>
            {isEditing ? (
              <Input
                type="date"
                value={editData.birth_date}
                onChange={(e) => setEditData(d => ({ ...d, birth_date: e.target.value }))}
                className="h-8 text-sm"
              />
            ) : (
              <p className="font-medium text-foreground text-sm">
                {age ? `${age} let` : '—'}
                {client.birth_date && (
                  <span className="text-muted-foreground text-xs ml-1">
                    (nar. {format(new Date(client.birth_date), 'd.M.yyyy')})
                  </span>
                )}
              </p>
            )}
          </div>

          {/* Gender - read only */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <User className="w-4 h-4" />
              <span>Pohlaví</span>
            </div>
            <p className="font-medium text-foreground text-sm">
              {client.gender === 'male' ? 'Muž' : client.gender === 'female' ? 'Žena' : '—'}
            </p>
          </div>

          {/* Handedness - read only */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <Hand className="w-4 h-4" />
              <span>Dominantní ruka</span>
            </div>
            <p className="font-medium text-foreground text-sm">
              {client.handedness === 'right' ? 'Pravák' :
               client.handedness === 'left' ? 'Levák' :
               client.handedness === 'ambidextrous' ? 'Obouruký' : '—'}
            </p>
          </div>

          {/* Occupation - editable */}
          <EditableField
            label="Typ práce"
            value={client.occupation === 'sedentary' ? 'Sedavá' :
                   client.occupation === 'mixed' ? 'Kombinovaná' :
                   client.occupation === 'active' ? 'Aktivní' :
                   client.occupation}
            icon={<Briefcase className="w-4 h-4" />}
            isEditing={isEditing}
            editValue={editData.occupation}
            onEditChange={(v) => setEditData(d => ({ ...d, occupation: v }))}
            placeholder="sedentary / mixed / active"
          />
        </div>
      </div>

      {/* Lifestyle Card - SINGLE SOURCE OF TRUTH */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <h3 className="font-semibold flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-primary" />
          Životní styl
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {/* Sleep */}
          <EditableField
            label="Průměrný spánek"
            value={client.sleep_hours}
            icon={<Moon className="w-4 h-4" />}
            isEditing={isEditing}
            editValue={editData.sleep_hours}
            onEditChange={(v) => setEditData(d => ({ ...d, sleep_hours: v }))}
            type="number"
            placeholder="7"
            suffix="h"
          />

          {/* Stress */}
          <EditableField
            label="Úroveň stresu"
            value={client.stress_level}
            icon={<Heart className="w-4 h-4" />}
            isEditing={isEditing}
            editValue={editData.stress_level}
            onEditChange={(v) => setEditData(d => ({ ...d, stress_level: v }))}
            type="number"
            placeholder="1-10"
            suffix="/10"
          />

          {/* Sitting hours */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <Activity className="w-4 h-4" />
              <span>Hodiny vsedě</span>
            </div>
            <p className="font-medium text-foreground text-sm">
              {client.sitting_hours_daily != null ? `${client.sitting_hours_daily}h` : '—'}
            </p>
          </div>
        </div>

        {/* Current Activities */}
        {client.current_activities && client.current_activities.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
              <Dumbbell className="w-4 h-4" />
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
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
              <Pill className="w-4 h-4" />
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
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
              <Apple className="w-4 h-4" />
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

        {/* Sports History - editable */}
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
            <Dumbbell className="w-4 h-4" />
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
                {/* Sync button */}
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

      {/* Health Restrictions */}
      <div className={cn(
        'bg-card border border-border rounded-2xl p-4',
        client.health_restrictions && 'border-l-4 border-l-warning'
      )}>
        <h3 className="font-semibold flex items-center gap-2 mb-3 text-warning">
          <AlertTriangle className="w-5 h-5" />
          Zdravotní omezení
        </h3>
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

      {/* Training Goals */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <h3 className="font-semibold flex items-center gap-2 mb-3">
          <Target className="w-5 h-5 text-primary" />
          Tréninkové cíle
        </h3>
        <div className="flex flex-wrap gap-2">
          {(client.training_goals || []).length > 0 ? (
            client.training_goals.map((goal) => (
              <Badge key={goal} className="bg-primary/10 text-primary">
                {goal}
              </Badge>
            ))
          ) : (
            <span className="text-muted-foreground text-sm italic">Žádné cíle</span>
          )}
        </div>
      </div>

      {/* Notes */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <h3 className="font-semibold mb-3">Poznámky trenéra</h3>
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
