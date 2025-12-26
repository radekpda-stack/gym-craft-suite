/**
 * CLIENT PERSONAL INFO
 * ====================
 * Zobrazuje osobní data klienta z různých zdrojů:
 * 1. Přímo z tabulky clients
 * 2. Z diagnostic_assessments (starší prediagnostika)
 * 3. Z pre_diagnostic_answers (novější systém)
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  User,
  Briefcase,
  Moon,
  Activity,
  Heart,
  Brain,
  Utensils,
  Pill,
  ChevronDown,
  Hand,
  Clock,
  Edit2,
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { Client } from '@/hooks/useClients';
import { differenceInYears } from 'date-fns';

interface ClientPersonalInfoProps {
  client: Client;
  defaultOpen?: boolean;
  onEdit?: () => void;
}

interface PersonalData {
  occupation?: string | null;
  sitting_hours_daily?: number | null;
  sleep_hours?: number | null;
  stress_level?: number | null;
  current_activities?: string[] | null;
  sports_history?: string | null;
  dietary_restrictions?: string[] | null;
  supplements?: string[] | null;
  handedness?: string | null;
  health_restrictions?: string | null;
  age?: number | null;
}

// Fetch personal data from diagnostic_assessments
function useClientDiagnosticData(clientId: string) {
  return useQuery({
    queryKey: ['client-diagnostic-data', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('diagnostics')
        .select(`
          id,
          diagnostic_assessments (
            occupation,
            sitting_hours_daily,
            sleep_hours,
            stress_level,
            current_activities,
            sports_history,
            dietary_restrictions,
            supplements,
            handedness,
            all_restrictions
          )
        `)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      
      // Get the first assessment
      const assessment = data?.diagnostic_assessments?.[0];
      return assessment || null;
    },
    enabled: !!clientId,
  });
}

// Helper to get stress level label
function getStressLabel(level: number | null | undefined): string {
  if (level === null || level === undefined) return '—';
  if (level <= 3) return 'Nízká';
  if (level <= 6) return 'Střední';
  return 'Vysoká';
}

// Helper to get handedness label
function getHandednessLabel(handedness: string | null | undefined): string {
  if (!handedness) return '—';
  const labels: Record<string, string> = {
    left: 'Levák',
    right: 'Pravák',
    ambidextrous: 'Obouruký',
  };
  return labels[handedness] || handedness;
}

export function ClientPersonalInfo({ client, defaultOpen = false, onEdit }: ClientPersonalInfoProps) {
  const { data: diagnosticData } = useClientDiagnosticData(client.id);

  // Merge data from client and diagnostic_assessments
  const personalData: PersonalData = useMemo(() => {
    const age = client.birth_date 
      ? differenceInYears(new Date(), new Date(client.birth_date))
      : null;

    return {
      age,
      occupation: client.occupation || diagnosticData?.occupation,
      sitting_hours_daily: client.sitting_hours_daily ?? diagnosticData?.sitting_hours_daily,
      sleep_hours: client.sleep_hours ?? diagnosticData?.sleep_hours,
      stress_level: client.stress_level ?? diagnosticData?.stress_level,
      current_activities: client.current_activities || diagnosticData?.current_activities,
      sports_history: client.sports_history || diagnosticData?.sports_history,
      dietary_restrictions: client.dietary_restrictions || diagnosticData?.dietary_restrictions,
      supplements: client.supplements || diagnosticData?.supplements,
      handedness: client.handedness || diagnosticData?.handedness,
      health_restrictions: client.health_restrictions || (diagnosticData?.all_restrictions?.join(', ')),
    };
  }, [client, diagnosticData]);

  // Check if we have any personal data to show
  const hasData = useMemo(() => {
    return Object.entries(personalData).some(([key, value]) => {
      if (key === 'age' && value) return true;
      if (Array.isArray(value) && value.length > 0) return true;
      if (typeof value === 'string' && value.trim()) return true;
      if (typeof value === 'number') return true;
      return false;
    });
  }, [personalData]);

  if (!hasData) {
    return null;
  }

  const InfoItem = ({ 
    icon: Icon, 
    label, 
    value, 
    className 
  }: { 
    icon: React.ElementType; 
    label: string; 
    value: React.ReactNode;
    className?: string;
  }) => (
    <div className={cn('flex items-start gap-2', className)}>
      <Icon className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground truncate">{value || '—'}</p>
      </div>
    </div>
  );

  return (
    <Collapsible defaultOpen={defaultOpen}>
      <div className="flex items-center gap-2">
        <CollapsibleTrigger asChild>
          <button className="flex-1 glass rounded-xl p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-primary" />
              <span className="font-semibold text-foreground">Osobní údaje</span>
              {personalData.occupation && (
                <Badge variant="secondary" className="text-xs">
                  {personalData.occupation}
                </Badge>
              )}
            </div>
            <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </button>
        </CollapsibleTrigger>
        {onEdit && (
          <Button
            variant="outline"
            size="icon"
            onClick={onEdit}
            className="shrink-0 h-12 w-12 rounded-xl"
          >
            <Edit2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      <CollapsibleContent>
        <div className="glass rounded-xl p-4 mt-2 space-y-4">
          {/* Basic info row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {personalData.age && (
              <InfoItem icon={User} label="Věk" value={`${personalData.age} let`} />
            )}
            {personalData.occupation && (
              <InfoItem icon={Briefcase} label="Povolání" value={personalData.occupation} />
            )}
            {personalData.handedness && (
              <InfoItem icon={Hand} label="Dominance" value={getHandednessLabel(personalData.handedness)} />
            )}
            {personalData.sitting_hours_daily !== null && personalData.sitting_hours_daily !== undefined && (
              <InfoItem icon={Clock} label="Sedavé hodiny/den" value={`${personalData.sitting_hours_daily} h`} />
            )}
          </div>

          {/* Lifestyle row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-3 border-t border-border/50">
            {personalData.sleep_hours !== null && personalData.sleep_hours !== undefined && (
              <InfoItem icon={Moon} label="Spánek" value={`${personalData.sleep_hours} h`} />
            )}
            {personalData.stress_level !== null && personalData.stress_level !== undefined && (
              <InfoItem 
                icon={Brain} 
                label="Stres" 
                value={
                  <span className={cn(
                    personalData.stress_level > 6 ? 'text-destructive' :
                    personalData.stress_level > 3 ? 'text-warning' : 'text-success'
                  )}>
                    {getStressLabel(personalData.stress_level)} ({personalData.stress_level}/10)
                  </span>
                } 
              />
            )}
          </div>

          {/* Activities */}
          {personalData.current_activities && personalData.current_activities.length > 0 && (
            <div className="pt-3 border-t border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-3.5 h-3.5 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Aktuální aktivity</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {personalData.current_activities.map((activity, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {activity}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Sports history */}
          {personalData.sports_history && (
            <div className="pt-3 border-t border-border/50">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="w-3.5 h-3.5 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Sportovní historie</p>
              </div>
              <p className="text-sm text-foreground">{personalData.sports_history}</p>
            </div>
          )}

          {/* Health */}
          {personalData.health_restrictions && (
            <div className="pt-3 border-t border-border/50">
              <div className="flex items-center gap-2 mb-1">
                <Heart className="w-3.5 h-3.5 text-destructive" />
                <p className="text-xs text-muted-foreground">Zdravotní omezení</p>
              </div>
              <p className="text-sm text-foreground">{personalData.health_restrictions}</p>
            </div>
          )}

          {/* Diet */}
          {personalData.dietary_restrictions && personalData.dietary_restrictions.length > 0 && (
            <div className="pt-3 border-t border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <Utensils className="w-3.5 h-3.5 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Stravovací omezení</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {personalData.dietary_restrictions.map((diet, i) => (
                  <Badge key={i} variant="outline" className="text-xs bg-warning/10 text-warning border-warning/30">
                    {diet}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Supplements */}
          {personalData.supplements && personalData.supplements.length > 0 && (
            <div className="pt-3 border-t border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <Pill className="w-3.5 h-3.5 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Suplementy</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {personalData.supplements.map((supp, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {supp}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
