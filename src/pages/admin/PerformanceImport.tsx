import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, CheckCircle, Upload, ArrowLeft, FileSpreadsheet } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';

interface ParsedRow {
  rawName: string;
  rawExercise: string;
  rawDate: string;
  rawWeight: string;
  clientId: string | null;
  clientName: string | null;
  exerciseId: string | null;
  exerciseName: string | null;
  date: string | null;
  weightKg: number | null;
  status: 'valid' | 'needs_review' | 'invalid';
  issues: string[];
  candidateClients?: { id: string; name: string }[];
  candidateExercises?: { id: string; name: string }[];
}

interface Client {
  id: string;
  name: string;
}

interface Exercise {
  id: string;
  name: string;
  name_cs: string | null;
}

// Normalize string for matching (remove diacritics, lowercase)
function normalize(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

// Parse weight, handling comma as decimal separator
function parseWeight(value: string): number | null {
  const cleaned = value.replace(',', '.').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

// Parse date in various formats
function parseDate(value: string): string | null {
  const trimmed = value.trim();
  // Try YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  // Try DD.MM.YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return null;
}

// Find best matching client
function findClient(rawName: string, clients: Client[]): { match: Client | null; candidates: Client[] } {
  const normalizedInput = normalize(rawName);
  
  // Exact match (normalized)
  const exactMatch = clients.find(c => normalize(c.name) === normalizedInput);
  if (exactMatch) return { match: exactMatch, candidates: [] };
  
  // Partial matches - check if input is contained in client name or vice versa
  const partialMatches = clients.filter(c => {
    const normalizedClient = normalize(c.name);
    return normalizedClient.includes(normalizedInput) || normalizedInput.includes(normalizedClient);
  });
  
  if (partialMatches.length === 1) {
    return { match: partialMatches[0], candidates: [] };
  }
  
  // Fuzzy matching - check individual words
  const inputWords = normalizedInput.split(/\s+/);
  const scored = clients.map(c => {
    const clientWords = normalize(c.name).split(/\s+/);
    let score = 0;
    for (const inputWord of inputWords) {
      for (const clientWord of clientWords) {
        if (clientWord.includes(inputWord) || inputWord.includes(clientWord)) {
          score += Math.min(inputWord.length, clientWord.length);
        }
      }
    }
    return { client: c, score };
  }).filter(s => s.score > 2).sort((a, b) => b.score - a.score);
  
  if (scored.length === 1 && scored[0].score >= 4) {
    return { match: scored[0].client, candidates: [] };
  }
  
  return { 
    match: null, 
    candidates: scored.slice(0, 5).map(s => s.client) 
  };
}

// Find best matching exercise
function findExercise(rawExercise: string, exercises: Exercise[]): { match: Exercise | null; candidates: Exercise[] } {
  const normalizedInput = normalize(rawExercise);
  
  // Exact match
  const exactMatch = exercises.find(e => 
    normalize(e.name) === normalizedInput || 
    (e.name_cs && normalize(e.name_cs) === normalizedInput)
  );
  if (exactMatch) return { match: exactMatch, candidates: [] };
  
  // Partial/contains match
  const partialMatches = exercises.filter(e => {
    const normalizedName = normalize(e.name);
    const normalizedCs = e.name_cs ? normalize(e.name_cs) : '';
    return normalizedName.includes(normalizedInput) || 
           normalizedInput.includes(normalizedName) ||
           normalizedCs.includes(normalizedInput) ||
           normalizedInput.includes(normalizedCs);
  });
  
  if (partialMatches.length === 1) {
    return { match: partialMatches[0], candidates: [] };
  }
  
  if (partialMatches.length > 0) {
    return { match: null, candidates: partialMatches.slice(0, 5) };
  }
  
  return { match: null, candidates: exercises.slice(0, 10) };
}

export default function PerformanceImport() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [rawInput, setRawInput] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; errors: number } | null>(null);
  const [duplicateAction, setDuplicateAction] = useState<'skip' | 'import' | 'ask'>('skip');
  
  // Fetch clients
  const { data: clients = [] } = useQuery({
    queryKey: ['all-clients-import'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .eq('is_system', false)
        .order('name');
      if (error) throw error;
      return data as Client[];
    },
  });
  
  // Fetch exercises
  const { data: exercises = [] } = useQuery({
    queryKey: ['all-exercises-import'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercises')
        .select('id, name, name_cs')
        .order('name');
      if (error) throw error;
      return data as Exercise[];
    },
  });
  
  // Parse input text
  const handleParse = () => {
    const lines = rawInput.split('\n').filter(line => line.trim());
    const parsed: ParsedRow[] = [];
    
    for (const line of lines) {
      // Try different separators: | , ; tab
      let parts = line.includes('|') ? line.split('|') : 
                  line.includes('\t') ? line.split('\t') :
                  line.includes(';') ? line.split(';') :
                  line.split(',');
      
      parts = parts.map(p => p.trim());
      
      if (parts.length < 4) {
        parsed.push({
          rawName: parts[0] || '',
          rawExercise: parts[1] || '',
          rawDate: parts[2] || '',
          rawWeight: parts[3] || '',
          clientId: null,
          clientName: null,
          exerciseId: null,
          exerciseName: null,
          date: null,
          weightKg: null,
          status: 'invalid',
          issues: ['Neplatný formát řádku (očekávám: jméno | cvik | datum | váha)'],
        });
        continue;
      }
      
      const [rawName, rawExercise, rawDate, rawWeight] = parts;
      const issues: string[] = [];
      
      // Parse weight
      const weightKg = parseWeight(rawWeight);
      if (weightKg === null) {
        issues.push(`Neplatná váha: "${rawWeight}"`);
      }
      
      // Parse date
      const date = parseDate(rawDate);
      if (!date) {
        issues.push(`Neplatné datum: "${rawDate}"`);
      }
      
      // Find client
      const clientResult = findClient(rawName, clients);
      let candidateClients: Client[] | undefined;
      if (!clientResult.match) {
        if (clientResult.candidates.length > 0) {
          issues.push(`Nejasný klient: "${rawName}" - vyberte z kandidátů`);
          candidateClients = clientResult.candidates;
        } else {
          issues.push(`Klient nenalezen: "${rawName}"`);
          candidateClients = clients.slice(0, 10);
        }
      }
      
      // Find exercise
      const exerciseResult = findExercise(rawExercise, exercises);
      let candidateExercises: Exercise[] | undefined;
      if (!exerciseResult.match) {
        if (exerciseResult.candidates.length > 0) {
          issues.push(`Nejasný cvik: "${rawExercise}" - vyberte z kandidátů`);
          candidateExercises = exerciseResult.candidates;
        } else {
          issues.push(`Cvik nenalezen: "${rawExercise}"`);
          candidateExercises = exercises.slice(0, 10);
        }
      }
      
      parsed.push({
        rawName,
        rawExercise,
        rawDate,
        rawWeight,
        clientId: clientResult.match?.id || null,
        clientName: clientResult.match?.name || null,
        exerciseId: exerciseResult.match?.id || null,
        exerciseName: exerciseResult.match?.name || null,
        date,
        weightKg,
        status: issues.length === 0 ? 'valid' : (issues.some(i => i.includes('Neplatná') || i.includes('nenalezen')) ? 'invalid' : 'needs_review'),
        issues,
        candidateClients,
        candidateExercises: candidateExercises?.map(e => ({ id: e.id, name: e.name })),
      });
    }
    
    setParsedRows(parsed);
    setImportResult(null);
  };
  
  // Update row when user selects client/exercise
  const updateRow = (index: number, field: 'client' | 'exercise', id: string) => {
    setParsedRows(prev => {
      const updated = [...prev];
      const row = { ...updated[index] };
      
      if (field === 'client') {
        const client = clients.find(c => c.id === id);
        row.clientId = id;
        row.clientName = client?.name || null;
      } else {
        const exercise = exercises.find(e => e.id === id);
        row.exerciseId = id;
        row.exerciseName = exercise?.name || null;
      }
      
      // Recalculate status
      const newIssues = row.issues.filter(i => 
        (field === 'client' ? !i.includes('klient') && !i.includes('Klient') : true) &&
        (field === 'exercise' ? !i.includes('cvik') && !i.includes('Cvik') : true)
      );
      row.issues = newIssues;
      row.status = newIssues.length === 0 && row.clientId && row.exerciseId && row.date && row.weightKg !== null 
        ? 'valid' 
        : newIssues.some(i => i.includes('Neplatná')) ? 'invalid' : 'needs_review';
      
      updated[index] = row;
      return updated;
    });
  };
  
  // Stats
  const stats = useMemo(() => {
    const valid = parsedRows.filter(r => r.status === 'valid').length;
    const needsReview = parsedRows.filter(r => r.status === 'needs_review').length;
    const invalid = parsedRows.filter(r => r.status === 'invalid').length;
    return { valid, needsReview, invalid, total: parsedRows.length };
  }, [parsedRows]);
  
  // Perform import
  const handleImport = async () => {
    const validRows = parsedRows.filter(r => r.status === 'valid' && r.clientId && r.exerciseId && r.date && r.weightKg !== null);
    
    if (validRows.length === 0) {
      toast({ title: 'Žádné platné záznamy', description: 'Opravte chyby před importem.', variant: 'destructive' });
      return;
    }
    
    setIsImporting(true);
    let imported = 0;
    let skipped = 0;
    let errors = 0;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: 'Chyba', description: 'Nejste přihlášeni.', variant: 'destructive' });
      setIsImporting(false);
      return;
    }
    
    for (const row of validRows) {
      try {
        // Check for duplicates
        if (duplicateAction === 'skip') {
          const { data: existing } = await supabase
            .from('exercise_entries')
            .select('id')
            .eq('client_id', row.clientId!)
            .eq('exercise_id', row.exerciseId!)
            .eq('date', row.date!)
            .eq('weight_kg', row.weightKg!)
            .limit(1);
          
          if (existing && existing.length > 0) {
            skipped++;
            continue;
          }
        }
        
        // Check if this is a PR
        const { data: bestEntry } = await supabase
          .from('exercise_entries')
          .select('weight_kg')
          .eq('client_id', row.clientId!)
          .eq('exercise_name', row.exerciseName!)
          .not('weight_kg', 'is', null)
          .order('weight_kg', { ascending: false })
          .limit(1);
        
        const isPR = !bestEntry?.length || (bestEntry[0].weight_kg !== null && row.weightKg! > bestEntry[0].weight_kg);
        
        // Insert
        const { error } = await supabase
          .from('exercise_entries')
          .insert({
            user_id: user.id,
            client_id: row.clientId!,
            exercise_id: row.exerciseId!,
            exercise_name: row.exerciseName!,
            date: row.date!,
            weight_kg: row.weightKg!,
            sets: 1,
            reps: null,
            is_bodyweight: false,
            time_seconds: null,
            tempo: null,
            notes: 'Import výkonů',
            is_pr: isPR,
          });
        
        if (error) throw error;
        imported++;
      } catch (err) {
        console.error('Import error:', err);
        errors++;
      }
    }
    
    setIsImporting(false);
    setImportResult({ imported, skipped, errors });
    
    toast({
      title: 'Import dokončen',
      description: `Importováno: ${imported}, Přeskočeno: ${skipped}, Chyby: ${errors}`,
    });
  };
  
  return (
    <div className="container max-w-6xl py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Import výkonů</h1>
          <p className="text-muted-foreground">Hromadný import výkonových záznamů (váha v kg)</p>
        </div>
      </div>
      
      {/* Input section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Vstupní data
          </CardTitle>
          <CardDescription>
            Vložte data ve formátu: Jméno | Cvik | Datum | Váha (kg)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Mirka Kotová | mrtvý tah | 2025-06-17 | 65&#10;Pavla Bryndačová | bench press | 2024-08-11 | 24.5"
            value={rawInput}
            onChange={(e) => setRawInput(e.target.value)}
            className="min-h-[200px] font-mono text-sm"
          />
          <div className="flex items-center gap-4">
            <Button onClick={handleParse} disabled={!rawInput.trim()}>
              Analyzovat data
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Duplicity:</span>
              <Select value={duplicateAction} onValueChange={(v) => setDuplicateAction(v as any)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="skip">Přeskočit</SelectItem>
                  <SelectItem value="import">Importovat</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Preview section */}
      {parsedRows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Náhled importu</CardTitle>
            <CardDescription className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Platné: {stats.valid}
              </span>
              <span className="flex items-center gap-1">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                K revizi: {stats.needsReview}
              </span>
              <span className="flex items-center gap-1">
                <AlertCircle className="h-4 w-4 text-destructive" />
                Neplatné: {stats.invalid}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">#</TableHead>
                  <TableHead>Klient</TableHead>
                  <TableHead>Cvik</TableHead>
                  <TableHead>Datum</TableHead>
                  <TableHead>Váha (kg)</TableHead>
                  <TableHead>Stav</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parsedRows.map((row, idx) => (
                  <TableRow key={idx} className={row.status === 'invalid' ? 'bg-destructive/5' : row.status === 'needs_review' ? 'bg-yellow-500/5' : ''}>
                    <TableCell className="font-mono text-xs">{idx + 1}</TableCell>
                    <TableCell>
                      {row.clientId ? (
                        <span className="text-green-600 dark:text-green-400">{row.clientName}</span>
                      ) : row.candidateClients && row.candidateClients.length > 0 ? (
                        <Select onValueChange={(v) => updateRow(idx, 'client', v)}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder={row.rawName} />
                          </SelectTrigger>
                          <SelectContent>
                            {row.candidateClients.map(c => (
                              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                            {clients.filter(c => !row.candidateClients?.find(cc => cc.id === c.id)).slice(0, 20).map(c => (
                              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-destructive">{row.rawName}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {row.exerciseId ? (
                        <span className="text-green-600 dark:text-green-400">{row.exerciseName}</span>
                      ) : row.candidateExercises && row.candidateExercises.length > 0 ? (
                        <Select onValueChange={(v) => updateRow(idx, 'exercise', v)}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder={row.rawExercise} />
                          </SelectTrigger>
                          <SelectContent>
                            {row.candidateExercises.map(e => (
                              <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-destructive">{row.rawExercise}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {row.date ? (
                        <span>{row.date}</span>
                      ) : (
                        <span className="text-destructive">{row.rawDate}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {row.weightKg !== null ? (
                        <span>{row.weightKg} kg</span>
                      ) : (
                        <span className="text-destructive">{row.rawWeight}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {row.status === 'valid' ? (
                        <Badge variant="default" className="bg-green-600">OK</Badge>
                      ) : row.status === 'needs_review' ? (
                        <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-400">Revize</Badge>
                      ) : (
                        <Badge variant="destructive">Chyba</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-muted-foreground">
                {stats.valid} z {stats.total} záznamů připraveno k importu
              </div>
              <Button 
                onClick={handleImport} 
                disabled={stats.valid === 0 || isImporting}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                {isImporting ? 'Importuji...' : `Importovat ${stats.valid} záznamů`}
              </Button>
            </div>
            
            {importResult && (
              <div className="mt-4 p-4 rounded-lg bg-muted">
                <h4 className="font-medium mb-2">Výsledek importu:</h4>
                <ul className="text-sm space-y-1">
                  <li className="text-green-600 dark:text-green-400">✓ Importováno: {importResult.imported}</li>
                  <li className="text-muted-foreground">⊘ Přeskočeno (duplicity): {importResult.skipped}</li>
                  {importResult.errors > 0 && (
                    <li className="text-destructive">✗ Chyby: {importResult.errors}</li>
                  )}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
