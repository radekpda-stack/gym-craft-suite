import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { 
  ArrowLeft, Sparkles, AlertTriangle, CheckCircle, 
  Activity, Heart, Brain, Apple, Target, User,
  ChevronDown, ChevronUp, Pencil, Save, X, Camera
} from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { DiagnosticWithAssessment } from '@/hooks/useDiagnosticAssessments';
import { useUpdateDiagnostic } from '@/hooks/useDiagnostics';
import { DiagnosticMedia } from '@/components/media/DiagnosticMedia';
import { useDiagnostics } from '@/hooks/useDiagnostics';

interface DiagnosticDetailViewProps {
  diagnostic: DiagnosticWithAssessment;
  onBack: () => void;
  compareWith?: DiagnosticWithAssessment;
}

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function CollapsibleSection({ title, icon, children, defaultOpen = false }: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Card className="glass overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium">{title}</span>
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {isOpen && <div className="px-4 pb-4">{children}</div>}
    </Card>
  );
}

function CompareValue({ 
  label, 
  current, 
  compare 
}: { 
  label: string; 
  current?: string | number | null; 
  compare?: string | number | null;
}) {
  const hasChange = compare !== undefined && current !== compare;
  
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{current ?? '-'}</span>
        {hasChange && (
          <span className="text-xs text-warning">
            (bylo: {compare ?? '-'})
          </span>
        )}
      </div>
    </div>
  );
}

function MobilityBadge({ value }: { value?: string }) {
  const config: Record<string, { label: string; className: string }> = {
    ok: { label: 'OK', className: 'bg-success/20 text-success' },
    limited: { label: 'Omezená', className: 'bg-warning/20 text-warning' },
    painful: { label: 'Bolestivá', className: 'bg-destructive/20 text-destructive' },
  };
  const c = config[value || 'ok'] || config.ok;
  return <Badge className={cn('text-xs', c.className)}>{c.label}</Badge>;
}

function PainBadge({ value }: { value?: string }) {
  const config: Record<string, { label: string; className: string }> = {
    none: { label: 'Bez bolesti', className: 'bg-success/20 text-success' },
    mild: { label: 'Mírná', className: 'bg-warning/20 text-warning' },
    significant: { label: 'Významná', className: 'bg-destructive/20 text-destructive' },
  };
  const c = config[value || 'none'] || config.none;
  return <Badge className={cn('text-xs', c.className)}>{c.label}</Badge>;
}

export function DiagnosticDetailView({ diagnostic, onBack, compareWith }: DiagnosticDetailViewProps) {
  const assessment = diagnostic.assessment;
  const compareAssessment = compareWith?.assessment;
  
  const [isEditing, setIsEditing] = useState(false);
  const [findings, setFindings] = useState(diagnostic.findings);
  const [notes, setNotes] = useState(diagnostic.notes || '');
  
  const updateDiagnostic = useUpdateDiagnostic();
  const { data: allDiagnostics = [] } = useDiagnostics(diagnostic.client_id);

  const handleSave = async () => {
    await updateDiagnostic.mutateAsync({
      id: diagnostic.id,
      findings,
      notes,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFindings(diagnostic.findings);
    setNotes(diagnostic.notes || '');
    setIsEditing(false);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-lg font-semibold">
              Diagnostika {format(new Date(diagnostic.date), 'd. MMMM yyyy', { locale: cs })}
            </h2>
            <p className="text-sm text-muted-foreground">
              {diagnostic.area_name} • {diagnostic.area_type === 'joint' ? 'Kloub' : 'Sval'}
            </p>
          </div>
        </div>
        {!isEditing ? (
          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
            <Pencil className="w-4 h-4 mr-2" />
            Upravit
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              <X className="w-4 h-4 mr-2" />
              Zrušit
            </Button>
            <Button size="sm" onClick={handleSave} disabled={updateDiagnostic.isPending}>
              <Save className="w-4 h-4 mr-2" />
              {updateDiagnostic.isPending ? 'Ukládám...' : 'Uložit'}
            </Button>
          </div>
        )}
      </div>

      {/* Compare banner */}
      {compareWith && (
        <Card className="glass p-3 bg-warning/10 border-warning/30">
          <div className="flex items-center gap-2 text-warning">
            <Activity className="w-4 h-4" />
            <span className="text-sm font-medium">
              Porovnávám s diagnostikou z {format(new Date(compareWith.date), 'd.M.yyyy', { locale: cs })}
            </span>
          </div>
        </Card>
      )}

      {/* Basic findings */}
      <Card className="glass p-4">
        <h3 className="font-medium mb-2">Nálezy</h3>
        {isEditing ? (
          <Textarea
            value={findings}
            onChange={(e) => setFindings(e.target.value)}
            rows={4}
            placeholder="Zadejte nálezy..."
          />
        ) : (
          <p className="text-sm text-muted-foreground">{diagnostic.findings || 'Žádné nálezy'}</p>
        )}
        
        <h4 className="font-medium mt-4 mb-2 text-sm">Poznámky</h4>
        {isEditing ? (
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Zadejte poznámky..."
          />
        ) : (
          <p className="text-sm text-muted-foreground">{diagnostic.notes || 'Žádné poznámky'}</p>
        )}
      </Card>

      {/* Media Section - Photos & Voice Notes */}
      <Card className="glass p-4">
        <div className="flex items-center gap-2 mb-4">
          <Camera className="w-4 h-4 text-primary" />
          <h3 className="font-medium">Média</h3>
        </div>
        <DiagnosticMedia 
          clientId={diagnostic.client_id} 
          diagnosticId={diagnostic.id}
          diagnostics={allDiagnostics}
        />
      </Card>

      {/* AI Summary - if available */}
      {assessment?.ai_analysis && (
        <Card className="glass p-4 border-primary/30">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-primary" />
            <h3 className="font-medium">AI Shrnutí</h3>
          </div>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{assessment.ai_analysis}</p>

          {/* Risk factors */}
          {assessment.ai_risk_factors && assessment.ai_risk_factors.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-destructive mb-2 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Rizikové faktory
              </h4>
              <div className="flex flex-wrap gap-1">
                {assessment.ai_risk_factors.map((r, i) => (
                  <Badge key={i} variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
                    {r}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Strengths */}
          {assessment.ai_strengths && assessment.ai_strengths.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-success mb-2 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                Silné stránky
              </h4>
              <div className="flex flex-wrap gap-1">
                {assessment.ai_strengths.map((s, i) => (
                  <Badge key={i} variant="outline" className="bg-success/10 text-success border-success/30">
                    {s}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Priorities */}
          {assessment.ai_priorities && assessment.ai_priorities.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-primary mb-2 flex items-center gap-1">
                <Target className="w-3.5 h-3.5" />
                Priority tréninku
              </h4>
              <div className="flex flex-wrap gap-1">
                {assessment.ai_priorities.map((p, i) => (
                  <Badge key={i} variant="outline" className="bg-primary/10 text-primary border-primary/30">
                    {p}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {assessment.ai_recommendations && (
            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2">Doporučení</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{assessment.ai_recommendations}</p>
            </div>
          )}
        </Card>
      )}

      {/* Lifestyle Section */}
      {assessment && (
        <CollapsibleSection 
          title="Životní styl" 
          icon={<Activity className="w-4 h-4 text-primary" />}
          defaultOpen
        >
          <div className="space-y-1">
            <CompareValue 
              label="Dominantní ruka" 
              current={assessment.handedness === 'right' ? 'Pravák' : assessment.handedness === 'left' ? 'Levák' : 'Ambidextrie'}
              compare={compareAssessment?.handedness === 'right' ? 'Pravák' : compareAssessment?.handedness === 'left' ? 'Levák' : compareAssessment?.handedness ? 'Ambidextrie' : undefined}
            />
            <CompareValue label="Povolání" current={assessment.occupation} compare={compareAssessment?.occupation} />
            <CompareValue label="Hodiny sezení denně" current={assessment.sitting_hours_daily} compare={compareAssessment?.sitting_hours_daily} />
            <CompareValue label="Hodiny spánku" current={assessment.sleep_hours} compare={compareAssessment?.sleep_hours} />
            <CompareValue label="Kvalita spánku (1-5)" current={assessment.sleep_quality} compare={compareAssessment?.sleep_quality} />
            <CompareValue label="Úroveň stresu (1-5)" current={assessment.stress_level} compare={compareAssessment?.stress_level} />
          </div>
        </CollapsibleSection>
      )}

      {/* Mobility Section */}
      {assessment && (
        <CollapsibleSection 
          title="Mobilita" 
          icon={<Activity className="w-4 h-4 text-warning" />}
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Kotníky</span>
              <MobilityBadge value={assessment.mobility_ankles} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Kyčle</span>
              <MobilityBadge value={assessment.mobility_hips} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Hrudní páteř</span>
              <MobilityBadge value={assessment.mobility_thoracic} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Ramena</span>
              <MobilityBadge value={assessment.mobility_shoulders} />
            </div>
            <div className="flex items-center justify-between col-span-2">
              <span className="text-sm">Stabilita středu</span>
              <MobilityBadge value={assessment.core_stability} />
            </div>
          </div>
        </CollapsibleSection>
      )}

      {/* Pain Screening Section */}
      {assessment && (
        <CollapsibleSection 
          title="Screening bolesti" 
          icon={<AlertTriangle className="w-4 h-4 text-destructive" />}
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Kotník</span>
              <PainBadge value={assessment.pain_ankle} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Koleno</span>
              <PainBadge value={assessment.pain_knee} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Kyčel</span>
              <PainBadge value={assessment.pain_hip} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">SI kloub</span>
              <PainBadge value={assessment.pain_si} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Bederní páteř</span>
              <PainBadge value={assessment.pain_lumbar} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Hrudní páteř</span>
              <PainBadge value={assessment.pain_thoracic} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Rameno</span>
              <PainBadge value={assessment.pain_shoulder} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Krční páteř</span>
              <PainBadge value={assessment.pain_neck} />
            </div>
          </div>
        </CollapsibleSection>
      )}

      {/* Goals Section */}
      {assessment && (assessment.short_term_goals || assessment.long_term_goals) && (
        <CollapsibleSection 
          title="Cíle" 
          icon={<Target className="w-4 h-4 text-success" />}
        >
          {assessment.short_term_goals && (
            <div className="mb-3">
              <h4 className="text-sm font-medium mb-1">Krátkodobé cíle</h4>
              <p className="text-sm text-muted-foreground">{assessment.short_term_goals}</p>
            </div>
          )}
          {assessment.long_term_goals && (
            <div>
              <h4 className="text-sm font-medium mb-1">Dlouhodobé cíle</h4>
              <p className="text-sm text-muted-foreground">{assessment.long_term_goals}</p>
            </div>
          )}
        </CollapsibleSection>
      )}

      {/* Psychology Section */}
      {assessment && (
        <CollapsibleSection 
          title="Psychika" 
          icon={<Brain className="w-4 h-4 text-purple-500" />}
        >
          <div className="space-y-1">
            <CompareValue label="Motivace (1-5)" current={assessment.motivation_level} compare={compareAssessment?.motivation_level} />
            <CompareValue label="Disciplína (1-5)" current={assessment.discipline_level} compare={compareAssessment?.discipline_level} />
            <CompareValue label="Preferovaný styl" current={assessment.preferred_training_style} compare={compareAssessment?.preferred_training_style} />
            <CompareValue label="Zvládání stresu" current={assessment.stress_management} compare={compareAssessment?.stress_management} />
          </div>
        </CollapsibleSection>
      )}

      {/* Nutrition Section */}
      {assessment && (
        <CollapsibleSection 
          title="Strava" 
          icon={<Apple className="w-4 h-4 text-green-500" />}
        >
          <div className="space-y-1">
            <CompareValue label="Pravidelnost stravování" current={assessment.eating_regularity} compare={compareAssessment?.eating_regularity} />
          </div>
          {assessment.supplements && assessment.supplements.length > 0 && (
            <div className="mt-3">
              <h4 className="text-sm font-medium mb-1">Suplementy</h4>
              <div className="flex flex-wrap gap-1">
                {assessment.supplements.map((s, i) => (
                  <Badge key={i} variant="secondary">{s}</Badge>
                ))}
              </div>
            </div>
          )}
          {assessment.dietary_restrictions && assessment.dietary_restrictions.length > 0 && (
            <div className="mt-3">
              <h4 className="text-sm font-medium mb-1">Dietní omezení</h4>
              <div className="flex flex-wrap gap-1">
                {assessment.dietary_restrictions.map((d, i) => (
                  <Badge key={i} variant="outline">{d}</Badge>
                ))}
              </div>
            </div>
          )}
        </CollapsibleSection>
      )}
    </div>
  );
}
