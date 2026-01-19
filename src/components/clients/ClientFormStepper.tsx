import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Plus, Loader2, ChevronLeft, ChevronRight, Check, User, UserCircle, Activity, Heart, MessageSquare, Hand } from "lucide-react";
import { useState, useEffect } from "react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { clientFormSchema, ClientFormValues } from "@/lib/validations/client";
import { Client } from "@/hooks/useClients";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { useFormTracking } from "@/hooks/useFormTracking";
import { cn } from "@/lib/utils";

interface ClientFormStepperProps {
  onSubmit: (data: ClientFormValues) => Promise<void>;
  isLoading?: boolean;
  defaultValues?: Partial<Client>;
  submitLabel?: string;
}

const SUGGESTED_GOALS = [
  "Hubnutí",
  "Nabírání svalů",
  "Síla",
  "Kondice",
  "Flexibilita",
  "Rehabilitace",
  "Obecná fitness",
];

const STEPS = [
  { id: 1, title: "Základní údaje", icon: User, fields: ['first_name', 'last_name', 'email', 'phone'] },
  { id: 2, title: "Osobní údaje", icon: UserCircle, fields: ['birthDate', 'gender', 'handedness'] },
  { id: 3, title: "Životní styl", icon: Activity, fields: ['trainingGoals', 'sports_history'] },
  { id: 4, title: "Zdraví & poznámky", icon: Heart, fields: ['healthRestrictions', 'notes', 'feedbackEnabled'] },
];

export function ClientFormStepper({ onSubmit, isLoading, defaultValues, submitLabel = "Vytvořit klienta" }: ClientFormStepperProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [newGoal, setNewGoal] = useState("");
  
  const { getFieldProps, completeForm, trackValidationErrors } = useFormTracking({
    formType: 'client_form',
    formInstanceId: defaultValues?.id,
  });
  
  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      first_name: defaultValues?.first_name || "",
      last_name: defaultValues?.last_name || "",
      name: defaultValues?.name || "",
      email: defaultValues?.email || "",
      phone: defaultValues?.phone || "",
      trainingGoals: defaultValues?.training_goals || [],
      notes: defaultValues?.notes || "",
      healthRestrictions: defaultValues?.health_restrictions || "",
      creditBalance: defaultValues?.credit_balance || 0,
      birthDate: defaultValues?.birth_date || "",
      gender: defaultValues?.gender || undefined,
      createdAt: defaultValues?.created_at ? defaultValues.created_at.split('T')[0] : "",
      feedbackEnabled: defaultValues?.feedback_enabled !== false,
      handedness: (defaultValues?.handedness as 'left' | 'right' | 'ambidextrous') || undefined,
      sports_history: defaultValues?.sports_history || "",
    },
  });

  useEffect(() => {
    if (Object.keys(form.formState.errors).length > 0) {
      trackValidationErrors(form.formState.errors);
    }
  }, [form.formState.errors, trackValidationErrors]);

  const isDirty = form.formState.isDirty;
  useUnsavedChanges(isDirty);

  useEffect(() => {
    if (defaultValues) {
      form.reset({
        first_name: defaultValues.first_name || "",
        last_name: defaultValues.last_name || "",
        name: defaultValues.name || "",
        email: defaultValues.email || "",
        phone: defaultValues.phone || "",
        trainingGoals: defaultValues.training_goals || [],
        notes: defaultValues.notes || "",
        healthRestrictions: defaultValues.health_restrictions || "",
        creditBalance: defaultValues.credit_balance || 0,
        birthDate: defaultValues.birth_date || "",
        gender: defaultValues.gender || undefined,
        createdAt: defaultValues.created_at ? defaultValues.created_at.split('T')[0] : "",
        feedbackEnabled: defaultValues.feedback_enabled !== false,
        handedness: (defaultValues.handedness as 'left' | 'right' | 'ambidextrous') || undefined,
        sports_history: defaultValues.sports_history || "",
      });
    }
  }, [defaultValues, form]);

  const trainingGoals = form.watch("trainingGoals");

  const addGoal = (goal: string) => {
    const trimmedGoal = goal.trim();
    if (trimmedGoal && !trainingGoals.includes(trimmedGoal)) {
      form.setValue("trainingGoals", [...trainingGoals, trimmedGoal], { shouldDirty: true });
    }
    setNewGoal("");
  };

  const removeGoal = (goalToRemove: string) => {
    form.setValue(
      "trainingGoals",
      trainingGoals.filter((goal) => goal !== goalToRemove),
      { shouldDirty: true }
    );
  };

  const handleSubmit = async (data: ClientFormValues) => {
    await onSubmit(data);
    completeForm();
    form.reset(data);
  };

  const validateCurrentStep = async () => {
    const currentFields = STEPS[currentStep - 1].fields as (keyof ClientFormValues)[];
    const result = await form.trigger(currentFields);
    return result;
  };

  const handleNext = async () => {
    const isValid = await validateCurrentStep();
    if (isValid && currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = async (stepId: number) => {
    if (stepId < currentStep) {
      setCurrentStep(stepId);
    } else if (stepId > currentStep) {
      const isValid = await validateCurrentStep();
      if (isValid) {
        setCurrentStep(stepId);
      }
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Step indicator */}
        <div className="flex items-center justify-between mb-6">
          {STEPS.map((step, index) => {
            const StepIcon = step.icon;
            const isCompleted = currentStep > step.id;
            const isCurrent = currentStep === step.id;
            
            return (
              <div key={step.id} className="flex items-center">
                <button
                  type="button"
                  onClick={() => handleStepClick(step.id)}
                  className={cn(
                    "flex flex-col items-center gap-1 transition-colors",
                    isCurrent && "text-primary",
                    isCompleted && "text-primary",
                    !isCurrent && !isCompleted && "text-muted-foreground"
                  )}
                >
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors",
                      isCurrent && "border-primary bg-primary/10",
                      isCompleted && "border-primary bg-primary text-primary-foreground",
                      !isCurrent && !isCompleted && "border-muted-foreground/30"
                    )}
                  >
                    {isCompleted ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <StepIcon className="w-5 h-5" />
                    )}
                  </div>
                  <span className="text-xs font-medium hidden sm:block">{step.title}</span>
                </button>
                
                {index < STEPS.length - 1 && (
                  <div
                    className={cn(
                      "w-8 sm:w-12 h-0.5 mx-2",
                      isCompleted ? "bg-primary" : "bg-muted-foreground/30"
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Step content */}
        <div className="min-h-[280px]">
          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="first_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Křestní jméno *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Jan"
                          className="bg-secondary border-border"
                          {...field}
                          {...getFieldProps('first_name')}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="last_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Příjmení *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Novák"
                          className="bg-secondary border-border"
                          {...field}
                          {...getFieldProps('last_name')}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                          {...getFieldProps('email')}
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

              {/* Credit field only for edit */}
              {defaultValues && (
                <>
                  <FormField
                    control={form.control}
                    name="createdAt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Datum založení karty</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
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
                    name="creditBalance"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kredit (CZK)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0"
                            className="bg-secondary border-border"
                            value={field.value === 0 ? '' : field.value}
                            onChange={(e) => {
                              const val = e.target.value;
                              field.onChange(val === '' ? 0 : parseFloat(val));
                            }}
                            onBlur={(e) => {
                              if (e.target.value === '') {
                                field.onChange(0);
                              }
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
            </div>
          )}

          {/* Step 2: Personal Info */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="birthDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Datum narození</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="např. 15.03.1990"
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
                            <RadioGroupItem value="male" id="gender-male-step" />
                            <Label htmlFor="gender-male-step" className="cursor-pointer">Muž</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="female" id="gender-female-step" />
                            <Label htmlFor="gender-female-step" className="cursor-pointer">Žena</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="handedness"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Hand className="w-4 h-4" />
                      Dominantní ruka
                    </FormLabel>
                    <Select
                      value={field.value || 'none'}
                      onValueChange={(v) => field.onChange(v === 'none' ? undefined : v)}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-secondary border-border">
                          <SelectValue placeholder="Vyberte" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Nevybráno</SelectItem>
                        <SelectItem value="right">Pravák</SelectItem>
                        <SelectItem value="left">Levák</SelectItem>
                        <SelectItem value="ambidextrous">Obouruký</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          {/* Step 3: Lifestyle & Goals */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-fade-in">
              <div className="space-y-3">
                <Label>Tréninkové cíle</Label>
                
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
                    onClick={() => addGoal(newGoal)}
                    disabled={!newGoal.trim()}
                  >
                    Přidat
                  </Button>
                </div>

                {trainingGoals.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
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
                name="sports_history"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Activity className="w-4 h-4" />
                      Sportovní historie
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Např. 10 let fotbal, 3 roky plavání..."
                        className="bg-secondary border-border min-h-[80px]"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          {/* Step 4: Health & Notes */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-fade-in">
              <FormField
                control={form.control}
                name="healthRestrictions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Zdravotní omezení</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Např. bolesti zad, zranění kolene..."
                        className="bg-secondary border-border min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Poznámky</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Další poznámky ke klientovi..."
                        className="bg-secondary border-border min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="feedbackEnabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between p-4 rounded-xl bg-secondary/50 border border-border">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-muted-foreground" />
                        Posílat feedback dotazníky
                      </FormLabel>
                      <FormDescription className="text-xs">
                        Po každém tréninku bude klientovi dostupný dotazník zpětné vazby
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          )}
        </div>

        {/* Navigation buttons */}
        <div className="flex justify-between gap-2 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={handlePrev}
            disabled={currentStep === 1}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Zpět
          </Button>

          <div className="flex gap-2">
            {currentStep < STEPS.length ? (
              <Button type="button" onClick={handleNext}>
                Další
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Ukládám...
                  </>
                ) : (
                  submitLabel
                )}
              </Button>
            )}
          </div>
        </div>
      </form>
    </Form>
  );
}
