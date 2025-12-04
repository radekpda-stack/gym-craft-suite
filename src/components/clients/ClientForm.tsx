import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Loader2 } from "lucide-react";
import { useState } from "react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { clientFormSchema, ClientFormValues } from "@/lib/validations/client";

interface ClientFormProps {
  onSubmit: (data: ClientFormValues) => Promise<void>;
  isLoading?: boolean;
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

export function ClientForm({ onSubmit, isLoading }: ClientFormProps) {
  const [newGoal, setNewGoal] = useState("");
  
  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      trainingGoals: [],
      notes: "",
      healthRestrictions: "",
    },
  });

  const trainingGoals = form.watch("trainingGoals");

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

  const handleSubmit = async (data: ClientFormValues) => {
    await onSubmit(data);
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

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email *</FormLabel>
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
            "Vytvořit klienta"
          )}
        </Button>
      </form>
    </Form>
  );
}
