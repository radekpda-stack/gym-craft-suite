/**
 * FeedbackTrainingTable - Shows feedback data with training tags
 * Part of section B) in the implementation plan
 */

import { useState } from 'react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle, 
  ChevronDown, 
  ChevronUp,
  Clock,
  Activity,
  Link2,
  Unlink
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useFeedbackWithTags, FeedbackWithTags } from '@/hooks/useFeedbackWithTags';
import { FeedbackDetailDialog } from '@/components/feedback/FeedbackDetailDialog';
import { formatMetric } from '@/lib/feedbackCalculations';

interface FeedbackTrainingTableProps {
  clientId: string;
  limit?: number;
  onRowClick?: (feedback: FeedbackWithTags) => void;
}

// Status icon component
function StatusIcon({ status, reasons }: { status: FeedbackWithTags['status']; reasons: string[] }) {
  const Icon = status === 'red_flag' ? AlertTriangle : status === 'warning' ? AlertCircle : CheckCircle;
  const colorClass = status === 'red_flag' 
    ? 'text-destructive' 
    : status === 'warning' 
    ? 'text-amber-500' 
    : 'text-emerald-500';
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Icon className={cn('h-4 w-4', colorClass)} />
        </TooltipTrigger>
        <TooltipContent>
          {reasons.length > 0 ? (
            <ul className="text-xs space-y-1">
              {reasons.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          ) : (
            <span>Vše v pořádku</span>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Link method badge
function LinkMethodBadge({ method, confidence }: { method: FeedbackWithTags['link_method']; confidence: FeedbackWithTags['link_confidence'] }) {
  if (!method || method === 'none') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Unlink className="h-3 w-3 text-muted-foreground" />
          </TooltipTrigger>
          <TooltipContent>Bez vazby na trénink</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  const isAuto = method === 'auto';
  const confidenceLabel = confidence === 'high' ? 'vysoká' : confidence === 'medium' ? 'střední' : 'nízká';
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Link2 className={cn('h-3 w-3', isAuto ? 'text-primary' : 'text-muted-foreground')} />
        </TooltipTrigger>
        <TooltipContent>
          {isAuto ? 'Automatická vazba' : 'Manuální vazba'} ({confidenceLabel} jistota)
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Metric cell with color coding
function MetricCell({ value, inverted = false, threshold = 5 }: { value: number | null; inverted?: boolean; threshold?: number }) {
  if (value == null) return <span className="text-muted-foreground">—</span>;
  
  let colorClass = 'text-foreground';
  if (inverted) {
    // For pain/difficulty: high is bad
    if (value >= 7) colorClass = 'text-destructive font-medium';
    else if (value >= 5) colorClass = 'text-amber-500';
  } else {
    // For body_feel/energy: low is bad
    if (value <= 3) colorClass = 'text-destructive font-medium';
    else if (value <= 5) colorClass = 'text-amber-500';
  }
  
  return <span className={colorClass}>{value}</span>;
}

export function FeedbackTrainingTable({ clientId, limit = 20, onRowClick }: FeedbackTrainingTableProps) {
  const { data: feedbacks = [], isLoading } = useFeedbackWithTags(clientId, { limit });
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackWithTags | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  
  const toggleRow = (id: string) => {
    const newSet = new Set(expandedRows);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedRows(newSet);
  };
  
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }
  
  if (feedbacks.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>Zatím žádná zpětná vazba</p>
      </div>
    );
  }
  
  return (
    <>
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[40px]"></TableHead>
              <TableHead>Datum</TableHead>
              <TableHead>Tagy</TableHead>
              <TableHead className="text-center w-[60px]">Tělo</TableHead>
              <TableHead className="text-center w-[60px]">Bolest</TableHead>
              <TableHead className="text-center w-[60px]">Energie</TableHead>
              <TableHead className="text-center w-[60px]">Sedl</TableHead>
              <TableHead className="text-center w-[60px]">Obtíž</TableHead>
              <TableHead className="text-center w-[60px]">Zábava</TableHead>
              <TableHead className="w-[60px]">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {feedbacks.map((feedback) => {
              const isExpanded = expandedRows.has(feedback.id);
              
              return (
                <>
                  <TableRow 
                    key={feedback.id}
                    className={cn(
                      'cursor-pointer hover:bg-muted/50 transition-colors',
                      feedback.status === 'red_flag' && 'bg-destructive/5',
                      feedback.status === 'warning' && 'bg-amber-500/5'
                    )}
                    onClick={() => onRowClick ? onRowClick(feedback) : setSelectedFeedback(feedback)}
                  >
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleRow(feedback.id);
                        }}
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <LinkMethodBadge method={feedback.link_method} confidence={feedback.link_confidence} />
                        <div>
                          <div className="font-medium">
                            {format(new Date(feedback.training_date), 'd. MMM', { locale: cs })}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {feedback.training?.template_name || 'Trénink'}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {feedback.tags.slice(0, 3).map(tag => (
                          <Badge 
                            key={tag.id} 
                            variant="secondary"
                            className="text-xs px-1.5 py-0"
                            style={{ 
                              backgroundColor: `${tag.color}20`,
                              borderColor: tag.color,
                              color: tag.color
                            }}
                          >
                            {tag.name}
                          </Badge>
                        ))}
                        {feedback.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs px-1.5 py-0">
                            +{feedback.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <MetricCell value={feedback.body_feel} />
                    </TableCell>
                    <TableCell className="text-center">
                      <MetricCell value={feedback.pain} inverted />
                    </TableCell>
                    <TableCell className="text-center">
                      <MetricCell value={feedback.energy_rating} />
                    </TableCell>
                    <TableCell className="text-center">
                      <MetricCell value={feedback.session_fit} />
                    </TableCell>
                    <TableCell className="text-center">
                      <MetricCell value={feedback.difficulty} inverted />
                    </TableCell>
                    <TableCell className="text-center">
                      <MetricCell value={feedback.fun} />
                    </TableCell>
                    <TableCell>
                      <StatusIcon status={feedback.status} reasons={feedback.statusReasons} />
                    </TableCell>
                  </TableRow>
                  
                  {/* Expanded row with more details */}
                  {isExpanded && (
                    <TableRow key={`${feedback.id}-expanded`} className="bg-muted/30">
                      <TableCell colSpan={10} className="py-3">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Trvání: </span>
                            <span>{feedback.training?.duration || '—'} min</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Svalovka: </span>
                            <span>{formatMetric(feedback.soreness)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">RPE: </span>
                            <span>{formatMetric(feedback.rpe_rating)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Odpověď: </span>
                            <span>{format(new Date(feedback.created_at), 'd. MMM HH:mm', { locale: cs })}</span>
                          </div>
                          {feedback.pain_area && (
                            <div className="col-span-2">
                              <span className="text-muted-foreground">Bolest: </span>
                              <span>{feedback.pain_area}</span>
                            </div>
                          )}
                          {feedback.tags.length > 0 && (
                            <div className="col-span-2 md:col-span-4">
                              <span className="text-muted-foreground">Všechny tagy: </span>
                              <div className="inline-flex flex-wrap gap-1 mt-1">
                                {feedback.tags.map(tag => (
                                  <Badge 
                                    key={tag.id}
                                    variant="outline"
                                    className="text-xs"
                                    style={{ borderColor: tag.color, color: tag.color }}
                                  >
                                    {tag.name}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              );
            })}
          </TableBody>
        </Table>
      </div>
      
      {/* Detail dialog */}
      {selectedFeedback && (
        <FeedbackDetailDialog
          feedback={selectedFeedback as any}
          open={!!selectedFeedback}
          onOpenChange={(open) => !open && setSelectedFeedback(null)}
        />
      )}
    </>
  );
}
