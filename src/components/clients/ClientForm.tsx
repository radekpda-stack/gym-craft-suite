import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { X, Plus, Loader2, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { DatePicker } from "@/components/ui/date-time-picker";
import { clientFormSchema, ClientFormValues } from "@/lib/validations/client";
import { Client } from "@/hooks/useClients";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";

interface ClientFormProps {
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

export function ClientForm({ onSubmit, isLoading, defaultValues, submitLabel = "Vytvořit klienta" }: ClientFormProps) {
  const [newGoal, setNewGoal] = useState("");
  
  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
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
    },
  });

  // Track unsaved changes
  const isDirty = form.formState.isDirty;
  useUnsavedChanges(isDirty);

  useEffect(() => {
    if (defaultValues) {
      form.reset({
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
    form.reset(data); // Mark as clean after successful submit
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

        {defaultValues && (
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
        )}

          <FormField
            control={form.control}
            name="gender"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  Pohlaví
                  {defaultValues && !defaultValues.gender && (
                    <span className="inline-flex items-center gap-1 text-warning text-xs">
                      <AlertCircle className="w-3 h-3" />
                      Nevyplněno
                    </span>
                  )}
                </FormLabel>
                <FormControl>
                  <RadioGroup
                    value={field.value || ''}
                    onValueChange={field.onChange}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="male" id="gender-male" />
                      <Label htmlFor="gender-male" className="cursor-pointer">Muž</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="female" id="gender-female" />
                      <Label htmlFor="gender-female" className="cursor-pointer">Žena</Label>
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

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Ukládám...
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </form>
    </Form>
  );
}
