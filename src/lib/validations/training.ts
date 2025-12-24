import { z } from "zod";

export const trainingFormSchema = z.object({
  client_id: z
    .string()
    .uuid({ message: "Musíte vybrat klienta" }),
  date: z
    .string()
    .min(1, { message: "Datum je povinné" }),
  duration: z
    .number()
    .min(15, { message: "Minimální délka tréninku je 15 minut" })
    .max(300, { message: "Maximální délka tréninku je 300 minut" }),
  participant_count: z
    .number()
    .min(1, { message: "Minimálně 1 účastník" })
    .max(10, { message: "Maximálně 10 účastníků" })
    .default(1),
  status: z
    .enum(["scheduled", "in_progress", "completed", "canceled"])
    .default("scheduled"),
  notes: z
    .string()
    .max(2000, { message: "Poznámky mohou mít maximálně 2000 znaků" })
    .optional()
    .or(z.literal("")),
  subjective_rating: z
    .number()
    .min(1)
    .max(10)
    .optional()
    .nullable(),
  // Recurrence fields
  is_recurring: z
    .boolean()
    .default(false),
  recurrence_type: z
    .enum(["weekly", "biweekly", "monthly"])
    .optional(),
  recurrence_count: z
    .number()
    .min(1)
    .max(52)
    .optional(),
});

export type TrainingFormValues = z.infer<typeof trainingFormSchema>;

export const trainingDetailSchema = trainingFormSchema.extend({
  training_type: z.string().optional().nullable(),
  training_goal: z.string().optional().nullable(),
  rpe: z.number().min(1).max(10).optional().nullable(),
  rir: z.number().min(0).max(10).optional().nullable(),
  intensity_notes: z.string().max(1000).optional().nullable(),
  trainer_went_well: z.string().max(1000).optional().nullable(),
  trainer_problems: z.string().max(1000).optional().nullable(),
  trainer_recommendations: z.string().max(1000).optional().nullable(),
  prep_notes: z.string().max(1000).optional().nullable(),
  pain_reported: z.boolean().optional(),
  pain_notes: z.string().max(500).optional().nullable(),
});

export type TrainingDetailValues = z.infer<typeof trainingDetailSchema>;
