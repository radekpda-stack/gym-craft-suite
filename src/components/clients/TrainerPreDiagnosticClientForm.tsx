import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { X, Plus, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useCreateClient } from "@/hooks/useClients";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const SUGGESTED_GOALS = [
  "Hubnutí",
  "Nabírání svalů",
  "Síla",
  "Kondice",
  "Flexibilita",
  "Rehabilitace",
  "Obecná fitness",
];

const PAIN_AREAS = [
  { value: "neck", label: "Krk" },
  { value: "shoulder", label: "Rameno" },
  { value: "thoracic", label: "Hrudní páteř" },
  { value: "lumbar", label: "Bederní páteř" },
  { value: "hip", label: "Kyčel" },
  { value: "knee", label: "Koleno" },
  { value: "ankle", label: "Kotník" },
];

const WORK_TYPES = [
  { value: "sedentary", label: "Sedavá práce" },
  { value: "mixed", label: "Kombinovaná" },
  { value: "active", label: "Aktivní/fyzická" },
];

const trainerPreDiagnosticSchema = z.object({
  // Basic info
  name: z.string().min(2, "Jméno musí mít alespoň 2 znaky"),
  email: z.string().email("Neplatná emailová adresa").optional().or(z.literal("")),
  phone: z.string().optional(),
  birthDate: z.string().optional(),
  gender: z.enum(["male", "female"]).optional(),
  
  // Lifestyle
  workType: z.string().optional(),
  sittingHours: z.number().min(0).max(16).optional(),
  
  // Sleep & Health
  sleepHours: z.number().min(0).max(12).optional(),
  sleepQuality: z.number().min(1).max(5).optional(),
  painAreas: z.array(z.string()).optional(),
  healthRestrictions: z.string().optional(),
  
  // Goals
  trainingGoals: z.array(z.string()).default([]),
  mainMotivation: z.string().optional(),
  
  // Trainer notes
  trainerPriorities: z.string().optional(),
  trainerLimitations: z.string().optional(),
  trainerNotes: z.string().optional(),
});

type TrainerPreDiagnosticFormValues = z.infer<typeof trainerPreDiagnosticSchema>;

interface TrainerPreDiagnosticClientFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function TrainerPreDiagnosticClientForm({ 
  onSuccess, 
  onCancel 
}: TrainerPreDiagnosticClientFormProps) {
  const [newGoal, setNewGoal] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    lifestyle: false,
    health: false,
    goals: true,
    trainer: false,
  });
  
  const createClient = useCreateClient();
  
  const form = useForm<TrainerPreDiagnosticFormValues>({
    resolver: zodResolver(trainerPreDiagnosticSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      birthDate: '',
      trainingGoals: [],
      painAreas: [],
      sittingHours: 6,
      sleepHours: 7,
      sleepQuality: 3,
    },
  });

  const trainingGoals = form.watch("trainingGoals");
  const painAreas = form.watch("painAreas") || [];

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const addGoal = (goal: string) => {
    const trimmedGoal = goal.trim();
    if (trimmedGoal && !trainingGoals.includes(trimmedGoal)) {
      form.setValue("trainingGoals", [...trainingGoals, trimmedGoal]);
    }
    setNewGoal("");
  };

  const removeGoal = (goalToRemove: string) => {
    form.setValue(
      "trainingGoals",
      trainingGoals.filter((goal) => goal !== goalToRemove)
    );
  };

  const togglePainArea = (area: string) => {
    if (painAreas.includes(area)) {
      form.setValue("painAreas", painAreas.filter(a => a !== area));
    } else {
      form.setValue("painAreas", [...painAreas, area]);
    }
  };

  const handleSubmit = async (data: TrainerPreDiagnosticFormValues) => {
    setIsLoading(true);
    try {
      // 1. Create client
      const client = await createClient.mutateAsync({
        name: data.name,
        email: data.email || '',
        phone: data.phone || '',
        trainingGoals: data.trainingGoals,
        notes: data.trainerNotes || '',
        healthRestrictions: data.healthRestrictions || '',
        creditBalance: 0,
        birthDate: data.birthDate || '',
        gender: data.gender,
        feedbackEnabled: true,
        sitting_hours_daily: data.sittingHours,
        sleep_hours: data.sleepHours,
      });
      
      if (!client) {
        throw new Error("Nepodařilo se vytvořit klienta");
      }

      // 2. Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nepřihlášený uživatel");

      // 3. Create pre-diagnostic form with status completed
      const { data: preDiag, error: preDiagError } = await supabase
        .from('pre_diagnostic_forms')
        .insert({
          client_id: client.id,
          trainer_id: user.id,
          user_id: user.id,
          source: 'existing_client',
          status: 'completed',
          completed_at: new Date().toISOString(),
          trainer_summary: data.trainerPriorities || null,
          trainer_recommendations: data.trainerLimitations || null,
          trainer_restrictions: data.healthRestrictions || null,
          summary_approved: true,
        })
        .select()
        .single();

      if (preDiagError) {
        console.error("Pre-diagnostic creation error:", preDiagError);
        // Client was created, just log the error
        toast.warning("Klient vytvořen, ale pre-diagnostika se nepodařila uložit");
      } else if (preDiag) {
        // 4. Save answers
        const answers = [];
        
        if (data.workType) {
          answers.push({ form_id: preDiag.id, field_key: 'work_type', value: data.workType });
        }
        if (data.sittingHours !== undefined) {
          answers.push({ form_id: preDiag.id, field_key: 'sitting_hours', value: String(data.sittingHours) });
        }
        if (data.sleepHours !== undefined) {
          answers.push({ form_id: preDiag.id, field_key: 'sleep_hours', value: String(data.sleepHours) });
        }
        if (data.sleepQuality !== undefined) {
          answers.push({ form_id: preDiag.id, field_key: 'sleep_quality', value: String(data.sleepQuality) });
        }
        if (data.painAreas && data.painAreas.length > 0) {
          answers.push({ form_id: preDiag.id, field_key: 'pain_areas', value: JSON.stringify(data.painAreas) });
        }
        if (data.mainMotivation) {
          answers.push({ form_id: preDiag.id, field_key: 'main_motivation', value: data.mainMotivation });
        }
        if (data.trainingGoals.length > 0) {
          answers.push({ form_id: preDiag.id, field_key: 'training_goals', value: JSON.stringify(data.trainingGoals) });
        }

        if (answers.length > 0) {
          await supabase.from('pre_diagnostic_answers').insert(answers);
        }
      }

      toast.success("Klient s pre-diagnostikou úspěšně vytvořen");
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Chyba při vytváření klienta");
    } finally {
      setIsLoading(false);
    }
  };

  const SectionHeader = ({ 
    section, 
    title, 
    icon 
  }: { 
    section: string; 
    title: string; 
    icon: string;
  }) => (
    <CollapsibleTrigger 
      onClick={() => toggleSection(section)}
      className="flex items-center justify-between w-full p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
    >
      <div className="flex items-center gap-2">
        <span>{icon}</span>
        <span className="font-medium text-sm">{title}</span>
      </div>
      {openSections[section] ? (
        <ChevronUp className="w-4 h-4 text-muted-foreground" />
      ) : (
        <ChevronDown className="w-4 h-4 text-muted-foreground" />
      )}
    </CollapsibleTrigger>
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        {/* Basic Info - Always visible */}
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Jméno *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Jan Novák"
                    className="bg-secondary border-border"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="jan@example.com"
                      className="bg-secondary border-border"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefon</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="+420 123 456 789"
                      className="bg-secondary border-border"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="birthDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Datum narození</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="15.03.1990"
                      className="bg-secondary border-border"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pohlaví</FormLabel>
                  <FormControl>
                    <RadioGroup
                      value={field.value || ''}
                      onValueChange={field.onChange}
                      className="flex gap-4 h-10 items-center"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="male" id="gender-male-trainer" />
                        <Label htmlFor="gender-male-trainer" className="cursor-pointer text-sm">Muž</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="female" id="gender-female-trainer" />
                        <Label htmlFor="gender-female-trainer" className="cursor-pointer text-sm">Žena</Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Lifestyle Section */}
        <Collapsible open={openSections.lifestyle}>
          <SectionHeader section="lifestyle" title="Životní styl" icon="🏢" />
          <CollapsibleContent className="pt-3 space-y-4">
            <FormField
              control={form.control}
              name="workType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Typ práce</FormLabel>
                  <FormControl>
                    <div className="flex flex-wrap gap-2">
                      {WORK_TYPES.map((type) => (
                        <Badge
                          key={type.value}
                          variant={field.value === type.value ? "default" : "outline"}
                          className={cn(
                            "cursor-pointer transition-colors",
                            field.value === type.value 
                              ? "bg-primary text-primary-foreground" 
                              : "hover:bg-primary/20"
                          )}
                          onClick={() => field.onChange(type.value)}
                        >
                          {type.label}
                        </Badge>
                      ))}
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sittingHours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hodiny sezení denně: {field.value}h</FormLabel>
                  <FormControl>
                    <Slider
                      value={[field.value || 6]}
                      onValueChange={(vals) => field.onChange(vals[0])}
                      min={0}
                      max={16}
                      step={1}
                      className="py-2"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </CollapsibleContent>
        </Collapsible>

        {/* Health Section */}
        <Collapsible open={openSections.health}>
          <SectionHeader section="health" title="Spánek a zdraví" icon="💤" />
          <CollapsibleContent className="pt-3 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="sleepHours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Spánek: {field.value}h</FormLabel>
                    <FormControl>
                      <Slider
                        value={[field.value || 7]}
                        onValueChange={(vals) => field.onChange(vals[0])}
                        min={4}
                        max={12}
                        step={0.5}
                        className="py-2"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sleepQuality"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kvalita spánku: {field.value}/5</FormLabel>
                    <FormControl>
                      <Slider
                        value={[field.value || 3]}
                        onValueChange={(vals) => field.onChange(vals[0])}
                        min={1}
                        max={5}
                        step={1}
                        className="py-2"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label>Oblasti bolesti</Label>
              <div className="flex flex-wrap gap-2">
                {PAIN_AREAS.map((area) => (
                  <Badge
                    key={area.value}
                    variant={painAreas.includes(area.value) ? "default" : "outline"}
                    className={cn(
                      "cursor-pointer transition-colors",
                      painAreas.includes(area.value)
                        ? "bg-destructive/80 text-destructive-foreground hover:bg-destructive"
                        : "hover:bg-destructive/20"
                    )}
                    onClick={() => togglePainArea(area.value)}
                  >
                    {area.label}
                    {painAreas.includes(area.value) && (
                      <X className="w-3 h-3 ml-1" />
                    )}
                  </Badge>
                ))}
              </div>
            </div>

            <FormField
              control={form.control}
              name="healthRestrictions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Zdravotní omezení</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Zranění, operace, chronické potíže..."
                      className="bg-secondary border-border min-h-[60px]"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </CollapsibleContent>
        </Collapsible>

        {/* Goals Section */}
        <Collapsible open={openSections.goals}>
          <SectionHeader section="goals" title="Cíle" icon="🎯" />
          <CollapsibleContent className="pt-3 space-y-4">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_GOALS.filter((g) => !trainingGoals.includes(g)).map(
                  (goal) => (
                    <Badge
                      key={goal}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary/20 transition-colors"
                      onClick={() => addGoal(goal)}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      {goal}
                    </Badge>
                  )
                )}
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Vlastní cíl..."
                  value={newGoal}
                  onChange={(e) => setNewGoal(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addGoal(newGoal);
                    }
                  }}
                  className="bg-secondary border-border"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addGoal(newGoal)}
                  disabled={!newGoal.trim()}
                >
                  Přidat
                </Button>
              </div>

              {trainingGoals.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {trainingGoals.map((goal) => (
                    <Badge
                      key={goal}
                      className="bg-primary/20 text-primary hover:bg-primary/30"
                    >
                      {goal}
                      <X
                        className="w-3 h-3 ml-1 cursor-pointer"
                        onClick={() => removeGoal(goal)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <FormField
              control={form.control}
              name="mainMotivation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hlavní motivace</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Co klienta motivuje k tréninku..."
                      className="bg-secondary border-border min-h-[60px]"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </CollapsibleContent>
        </Collapsible>

        {/* Trainer Notes Section */}
        <Collapsible open={openSections.trainer}>
          <SectionHeader section="trainer" title="Trenérské poznámky" icon="📋" />
          <CollapsibleContent className="pt-3 space-y-4">
            <FormField
              control={form.control}
              name="trainerPriorities"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority tréninku</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Na co se zaměřit..."
                      className="bg-secondary border-border min-h-[60px]"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="trainerLimitations"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Limity a upozornění</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Čemu se vyhnout, na co dát pozor..."
                      className="bg-secondary border-border min-h-[60px]"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="trainerNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Další poznámky</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Cokoliv dalšího..."
                      className="bg-secondary border-border min-h-[60px]"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </CollapsibleContent>
        </Collapsible>

        {/* Submit */}
        <div className="flex gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onCancel}
          >
            Zrušit
          </Button>
          <Button 
            type="submit" 
            className="flex-1"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Vytvářím...
              </>
            ) : (
              "Vytvořit klienta"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
