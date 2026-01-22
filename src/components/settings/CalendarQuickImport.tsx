import { useState } from 'react';
import { useSmartImport, SmartImportResult, useQuickAssignClient } from '@/hooks/useSmartImport';
import { useImportStats, useImportableEvents } from '@/hooks/useCalendarImport';
import { useClients } from '@/hooks/useClients';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Zap, Settings2, Users, Calendar, CheckCircle2, AlertCircle, Loader2, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface CalendarQuickImportProps {
  feedId: string;
  feedName: string;
  onClose?: () => void;
}

export function CalendarQuickImport({ feedId, feedName, onClose }: CalendarQuickImportProps) {
  const [autoAcceptMinScore, setAutoAcceptMinScore] = useState(70);
  const [learnAliases, setLearnAliases] = useState(true);
  const [autoCreateSessions, setAutoCreateSessions] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [result, setResult] = useState<SmartImportResult | null>(null);
  
  const smartImport = useSmartImport();
  const quickAssign = useQuickAssignClient();
  const { data: stats, isLoading: statsLoading } = useImportStats(feedId);
  const { data: events, isLoading: eventsLoading } = useImportableEvents(feedId);
  const { data: clients } = useClients();
  
  const handleSmartImport = async () => {
    try {
      const importResult = await smartImport.mutateAsync({
        feedId,
        autoAcceptMinScore,
        learnAliases,
        autoCreateSessions,
      });
      
      setResult(importResult);
      
      if (importResult.imported > 0) {
        toast.success(`Importováno ${importResult.imported} tréninků`, {
          description: importResult.needs_manual_count > 0 
            ? `${importResult.needs_manual_count} událostí vyžaduje ruční přiřazení`
            : undefined,
        });
      } else if (importResult.needs_manual_count > 0) {
        toast.info(`${importResult.needs_manual_count} událostí vyžaduje ruční přiřazení`);
      } else {
        toast.info('Žádné nové události k importu');
      }
    } catch (error) {
      toast.error('Import selhal', {
        description: error instanceof Error ? error.message : 'Neznámá chyba',
      });
    }
  };

  const handleQuickAssign = async (eventId: string, clientId: string) => {
    try {
      await quickAssign.mutateAsync({ eventId, clientId, learnAlias: learnAliases });
      toast.success('Klient přiřazen');
      
      // Remove from needs_manual list
      if (result) {
        setResult({
          ...result,
          needs_manual: result.needs_manual.filter(e => e.id !== eventId),
          needs_manual_count: result.needs_manual_count - 1,
        });
      }
    } catch (error) {
      toast.error('Přiřazení selhalo');
    }
  };

  const isLoading = statsLoading || eventsLoading;
  const isImporting = smartImport.isPending;

  // Calculate preview numbers
  const unmatchedEvents = events?.filter(e => !e.matched_client_id) || [];
  const matchedEvents = events?.filter(e => e.matched_client_id) || [];
  
  // Estimate how many would be auto-accepted based on suggestions
  const eventsWithHighConfidence = unmatchedEvents.filter(e => {
    const topSuggestion = e.match_suggestions?.[0];
    return topSuggestion && topSuggestion.score >= autoAcceptMinScore;
  });

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-background to-primary/5">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Smart Import</CardTitle>
              <CardDescription>{feedName}</CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSettings(!showSettings)}
            className="h-8 w-8"
          >
            {showSettings ? <ChevronUp className="h-4 w-4" /> : <Settings2 className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Settings Panel */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="space-y-4 p-4 rounded-lg bg-muted/50 border">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Práh pro auto-přiřazení</Label>
                    <Badge variant="secondary">{autoAcceptMinScore}%</Badge>
                  </div>
                  <Slider
                    value={[autoAcceptMinScore]}
                    onValueChange={([value]) => setAutoAcceptMinScore(value)}
                    min={50}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Události se shodou ≥{autoAcceptMinScore}% budou automaticky přiřazeny
                  </p>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm">Učit se přezdívky</Label>
                    <p className="text-xs text-muted-foreground">
                      Nové vzory jmen budou uloženy pro budoucí rozpoznání
                    </p>
                  </div>
                  <Switch checked={learnAliases} onCheckedChange={setLearnAliases} />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm">Automaticky vytvořit tréninky</Label>
                    <p className="text-xs text-muted-foreground">
                      Přiřazené události rovnou importovat jako tréninky
                    </p>
                  </div>
                  <Switch checked={autoCreateSessions} onCheckedChange={setAutoCreateSessions} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Preview Stats */}
        {!result && (
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold text-primary">
                {isLoading ? '...' : events?.length || 0}
              </div>
              <div className="text-xs text-muted-foreground">Celkem</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-green-500/10">
              <div className="text-2xl font-bold text-green-600">
                {isLoading ? '...' : matchedEvents.length + eventsWithHighConfidence.length}
              </div>
              <div className="text-xs text-muted-foreground">Bude importováno</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-amber-500/10">
              <div className="text-2xl font-bold text-amber-600">
                {isLoading ? '...' : unmatchedEvents.length - eventsWithHighConfidence.length}
              </div>
              <div className="text-xs text-muted-foreground">Ruční kontrola</div>
            </div>
          </div>
        )}

        {/* Result Stats */}
        {result && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-sm">{result.imported} importováno</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                <Users className="w-4 h-4 text-blue-500" />
                <span className="text-sm">{result.accepted} přiřazeno</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                <Sparkles className="w-4 h-4 text-purple-500" />
                <span className="text-sm">{result.learned_aliases} naučeno</span>
              </div>
              {result.duplicates_skipped > 0 && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  <span className="text-sm">{result.duplicates_skipped} duplikátů</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Needs Manual Section */}
        {result && result.needs_manual.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium">
                Vyžaduje ruční přiřazení ({result.needs_manual.length})
              </span>
            </div>
            
            <ScrollArea className="h-[200px] rounded-lg border">
              <div className="p-2 space-y-2">
                {result.needs_manual.map((event) => (
                  <div 
                    key={event.id} 
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/50 gap-2"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{event.summary || 'Bez názvu'}</p>
                      {event.suggestions.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Návrh: {event.suggestions[0].clientName} ({event.suggestions[0].score}%)
                        </p>
                      )}
                    </div>
                    
                    <Select
                      onValueChange={(clientId) => handleQuickAssign(event.id, clientId)}
                      disabled={quickAssign.isPending}
                    >
                      <SelectTrigger className="w-[140px] h-8">
                        <SelectValue placeholder="Vybrat..." />
                      </SelectTrigger>
                      <SelectContent>
                        {/* Show suggestions first */}
                        {event.suggestions.length > 0 && (
                          <>
                            <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                              Návrhy
                            </div>
                            {event.suggestions.map((suggestion) => (
                              <SelectItem 
                                key={suggestion.clientId} 
                                value={suggestion.clientId}
                                className="flex items-center justify-between"
                              >
                                <span>{suggestion.clientName}</span>
                                <Badge variant="secondary" className="ml-2 text-xs">
                                  {suggestion.score}%
                                </Badge>
                              </SelectItem>
                            ))}
                            <Separator className="my-1" />
                          </>
                        )}
                        {/* All clients */}
                        <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                          Všichni klienti
                        </div>
                        {clients?.filter(c => !c.is_archived).map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handleSmartImport}
            disabled={isImporting || isLoading}
            className="flex-1 h-12"
            size="lg"
          >
            {isImporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Importuji...
              </>
            ) : result ? (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Spustit znovu
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Spustit Smart Import
              </>
            )}
          </Button>
          
          {onClose && (
            <Button variant="outline" onClick={onClose} className="h-12">
              Zavřít
            </Button>
          )}
        </div>

        {/* Help text */}
        <p className="text-xs text-center text-muted-foreground">
          Smart Import synchronizuje kalendář, přiřadí klienty a vytvoří tréninky jedním kliknutím
        </p>
      </CardContent>
    </Card>
  );
}
